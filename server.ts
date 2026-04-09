import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });
  const PORT = 3000;

  // In-memory state for the chat
  const activeUsers = new Set<string>();
  const matchmakingQueue: string[] = [];

  // Rate limiting map: IP -> array of timestamps
  const rateLimits = new Map<string, number[]>();
  const RATE_LIMIT_WINDOW = 10000; // 10 seconds
  const MAX_MESSAGES = 50; // Increased to prevent false positives with typing events

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const timestamps = rateLimits.get(ip) || [];
    const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (recent.length >= MAX_MESSAGES) return false;
    recent.push(now);
    rateLimits.set(ip, recent);
    return true;
  }

  io.on('connection', (socket) => {
    let currentUserId: string | null = null;
    const clientIp = socket.handshake.address;

    socket.on('register', (userId: string) => {
      // Basic validation of userId (numeric, 8-10 chars)
      if (!/^\d{8,10}$/.test(userId)) return;
      
      currentUserId = userId;
      activeUsers.add(userId);
      socket.join('global');
      
      // Send initial state (no message history sent to comply with zero-knowledge/no-storage)
      io.emit('active_users', activeUsers.size);
    });

    socket.on('send_global', (message: { id: string; senderId: string; text: string; timestamp: number; type?: string }) => {
      if (!currentUserId || !checkRateLimit(clientIp)) return;
      if (!message.text || message.text.length > 2000) return; // Prevent payload overflow DoS
      
      // Enforce identity (prevent spoofing)
      message.senderId = currentUserId;
      
      // Relay only to others, do not store
      socket.to('global').emit('new_global_message', message);
    });

    socket.on('private_message', (data: { to: string; from: string; encryptedData: any; timestamp: number; selfDestruct?: boolean }) => {
      if (!currentUserId || !checkRateLimit(clientIp)) return;
      if (JSON.stringify(data.encryptedData).length > 50000) return; // Limit encrypted payload size
      
      // Enforce identity
      data.from = currentUserId;
      
      // Relay only
      io.to(`user_${data.to}`).emit('private_message_received', data);
    });

    socket.on('key_exchange_request', (data: { to: string; from: string; publicKey: any }) => {
      if (!currentUserId || !checkRateLimit(clientIp)) return;
      data.from = currentUserId;
      io.to(`user_${data.to}`).emit('key_exchange_request_received', data);
    });

    socket.on('key_exchange_response', (data: { to: string; from: string; publicKey: any }) => {
      if (!currentUserId || !checkRateLimit(clientIp)) return;
      data.from = currentUserId;
      io.to(`user_${data.to}`).emit('key_exchange_response_received', data);
    });

    socket.on('join_private_room', (userId: string) => {
      if (currentUserId === userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('find_match', (userId: string) => {
      if (!currentUserId || currentUserId !== userId || !checkRateLimit(clientIp)) return;
      
      if (matchmakingQueue.length > 0) {
        const partnerId = matchmakingQueue.shift();
        if (partnerId && partnerId !== currentUserId) {
          const roomId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          socket.join(roomId);
          io.to(`user_${partnerId}`).emit('match_found', { partnerId: currentUserId, roomId });
          socket.emit('match_found', { partnerId, roomId });
        } else {
          matchmakingQueue.push(currentUserId);
        }
      } else {
        matchmakingQueue.push(currentUserId);
      }
    });

    socket.on('leave_match_queue', (userId: string) => {
      if (currentUserId !== userId) return;
      const index = matchmakingQueue.indexOf(currentUserId);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
      }
    });

    socket.on('send_match_message', (data: { roomId: string; message: any }) => {
      if (!currentUserId || !checkRateLimit(clientIp)) return;
      if (!data.message.text || data.message.text.length > 2000) return;
      
      data.message.senderId = currentUserId;
      socket.to(data.roomId).emit('match_message_received', data.message);
    });

    socket.on('leave_match_room', (data: { roomId: string; userId: string }) => {
      if (currentUserId !== data.userId) return;
      socket.leave(data.roomId);
      socket.to(data.roomId).emit('match_partner_left');
    });

    socket.on('typing', (data: { targetId?: string; isGlobal?: boolean; roomId?: string; isTyping: boolean; userId: string }) => {
      if (!currentUserId || currentUserId !== data.userId || !checkRateLimit(clientIp)) return;
      
      if (data.isGlobal) {
        socket.to('global').emit('user_typing', { userId: currentUserId, isTyping: data.isTyping, isGlobal: true });
      } else if (data.targetId) {
        io.to(`user_${data.targetId}`).emit('user_typing', { userId: currentUserId, isTyping: data.isTyping, isGlobal: false });
      } else if (data.roomId) {
        socket.to(data.roomId).emit('user_typing', { userId: currentUserId, isTyping: data.isTyping, roomId: data.roomId });
      }
    });

    socket.on('disconnect', () => {
      if (currentUserId) {
        activeUsers.delete(currentUserId);
        io.emit('active_users', activeUsers.size);
        
        const index = matchmakingQueue.indexOf(currentUserId);
        if (index !== -1) {
          matchmakingQueue.splice(index, 1);
        }
      }
    });
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeUsers: activeUsers.size });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
