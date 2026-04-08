import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { generateUserId } from './lib/utils';
import { generateKeyPair, exportPublicKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, encryptWithEphemeralKey, decryptWithEphemeralKey } from './lib/crypto';

export type ViewState = 'global' | 'private' | 'match' | 'profile';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type?: 'text' | 'truth_or_dare' | 'game_invite';
  selfDestruct?: boolean;
}

interface PrivateChatSession {
  partnerId: string;
  partnerPublicKey?: CryptoKey;
  myKeyPair?: CryptoKeyPair;
  messages: Message[];
  status: 'disconnected' | 'connecting' | 'connected';
}

interface MatchState {
  status: 'idle' | 'searching' | 'matched';
  partnerId: string | null;
  roomId: string | null;
  messages: Message[];
}

interface AppState {
  userId: string;
  socket: Socket | null;
  view: ViewState;
  globalMessages: Message[];
  activeUsersCount: number;
  isConnected: boolean;
  
  privateChats: Record<string, PrivateChatSession>;
  activePrivateChat: string | null;
  isAuthenticated: boolean;

  matchState: MatchState;

  // Typing state
  globalTypingUsers: Set<string>;
  privateTypingUsers: Record<string, boolean>;
  matchTyping: boolean;

  init: () => void;
  login: (username: string) => void;
  logout: () => void;
  setView: (view: ViewState) => void;
  sendGlobalMessage: (text: string) => void;
  
  startPrivateChat: (partnerId: string) => Promise<void>;
  setActivePrivateChat: (partnerId: string | null) => void;
  sendPrivateMessage: (partnerId: string, text: string, selfDestruct?: boolean) => Promise<void>;

  findMatch: () => void;
  leaveMatch: () => void;
  sendMatchMessage: (text: string) => void;

  sendTypingEvent: (isTyping: boolean, targetId?: string, isGlobal?: boolean, roomId?: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  userId: '',
  socket: null,
  view: 'global',
  globalMessages: [],
  activeUsersCount: 0,
  isConnected: false,
  
  privateChats: {},
  activePrivateChat: null,
  isAuthenticated: false,

  matchState: {
    status: 'idle',
    partnerId: null,
    roomId: null,
    messages: [],
  },

  globalTypingUsers: new Set(),
  privateTypingUsers: {},
  matchTyping: false,

  init: () => {
    // Initialization deferred to login
  },

  logout: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ isAuthenticated: false, userId: '', socket: null, globalMessages: [], privateChats: {} });
  },

  login: (username: string) => {
    localStorage.setItem('openanon_user_id', username);
    const socket = io();

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('register', username);
      socket.emit('join_private_room', username);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('global_history', () => {
      // Zero-knowledge server: no history is sent.
      set({ globalMessages: [] });
    });

    socket.on('new_global_message', (message: Message) => {
      set((state) => {
        const newGlobalTyping = new Set(state.globalTypingUsers);
        newGlobalTyping.delete(message.senderId);
        return {
          globalMessages: [...state.globalMessages, message].slice(-100),
          globalTypingUsers: newGlobalTyping,
        };
      });
    });

    socket.on('active_users', (count: number) => {
      set({ activeUsersCount: count });
    });

    socket.on('user_typing', (data: { userId: string; isTyping: boolean; isGlobal?: boolean; roomId?: string }) => {
      set((state) => {
        if (data.isGlobal) {
          const newGlobalTyping = new Set(state.globalTypingUsers);
          if (data.isTyping) {
            newGlobalTyping.add(data.userId);
          } else {
            newGlobalTyping.delete(data.userId);
          }
          return { globalTypingUsers: newGlobalTyping };
        } else if (data.roomId) {
          return { matchTyping: data.isTyping };
        } else {
          return {
            privateTypingUsers: {
              ...state.privateTypingUsers,
              [data.userId]: data.isTyping,
            },
          };
        }
      });
    });

    // Handle incoming key exchange request
    socket.on('key_exchange_request_received', async (data: { from: string; publicKey: any }) => {
      const myKeyPair = await generateKeyPair();
      const myPublicKeyJwk = await exportPublicKey(myKeyPair.publicKey);
      const partnerPublicKey = await importPublicKey(data.publicKey);

      set((state) => ({
        privateChats: {
          ...state.privateChats,
          [data.from]: {
            partnerId: data.from,
            partnerPublicKey,
            myKeyPair,
            messages: state.privateChats[data.from]?.messages || [],
            status: 'connected',
          },
        },
      }));

      socket.emit('key_exchange_response', {
        to: data.from,
        from: username,
        publicKey: myPublicKeyJwk,
      });
    });

    // Handle incoming key exchange response
    socket.on('key_exchange_response_received', async (data: { from: string; publicKey: any }) => {
      const state = get();
      const chat = state.privateChats[data.from];
      if (chat && chat.myKeyPair) {
        const partnerPublicKey = await importPublicKey(data.publicKey);
        
        set((state) => ({
          privateChats: {
            ...state.privateChats,
            [data.from]: {
              ...chat,
              partnerPublicKey,
              status: 'connected',
            },
          },
        }));
      }
    });

    // Handle incoming private message
    socket.on('private_message_received', async (data: { from: string; encryptedData: any; timestamp: number; selfDestruct?: boolean }) => {
      const state = get();
      const chat = state.privateChats[data.from];
      if (chat && chat.myKeyPair) {
        const decryptedText = await decryptWithEphemeralKey(data.encryptedData, chat.myKeyPair.privateKey);
        const newMessage: Message = {
          id: Math.random().toString(36).substring(2, 9),
          senderId: data.from,
          text: decryptedText,
          timestamp: data.timestamp,
          selfDestruct: data.selfDestruct,
        };

        set((state) => ({
          privateChats: {
            ...state.privateChats,
            [data.from]: {
              ...chat,
              messages: [...chat.messages, newMessage],
            },
          },
        }));
      }
    });

    // Matchmaking events
    socket.on('match_found', (data: { partnerId: string; roomId: string }) => {
      set({
        matchState: {
          status: 'matched',
          partnerId: data.partnerId,
          roomId: data.roomId,
          messages: [],
        },
      });
    });

    socket.on('match_message_received', (message: Message) => {
      set((state) => ({
        matchState: {
          ...state.matchState,
          messages: [...state.matchState.messages, message],
        },
      }));
    });

    socket.on('match_partner_left', () => {
      set((state) => ({
        matchState: {
          ...state.matchState,
          status: 'idle',
          partnerId: null,
          roomId: null,
          messages: [...state.matchState.messages, {
            id: 'system',
            senderId: 'system',
            text: 'Partner has left the chat.',
            timestamp: Date.now(),
          }],
        },
      }));
    });

    set({ userId: username, socket, isAuthenticated: true });
  },

  setView: (view) => set({ view }),

  sendGlobalMessage: (text) => {
    const { socket, userId } = get();
    if (!socket || !text.trim()) return;

    const message: Message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: userId,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    socket.emit('send_global', message);
  },

  startPrivateChat: async (partnerId: string) => {
    const { socket, userId, privateChats } = get();
    if (!socket || partnerId === userId) return;

    if (!privateChats[partnerId]) {
      const myKeyPair = await generateKeyPair();
      const myPublicKeyJwk = await exportPublicKey(myKeyPair.publicKey);

      set((state) => ({
        privateChats: {
          ...state.privateChats,
          [partnerId]: {
            partnerId,
            myKeyPair,
            messages: [],
            status: 'connecting',
          },
        },
        activePrivateChat: partnerId,
      }));

      socket.emit('key_exchange_request', {
        to: partnerId,
        from: userId,
        publicKey: myPublicKeyJwk,
      });
    } else {
      set({ activePrivateChat: partnerId });
    }
  },

  setActivePrivateChat: (partnerId) => set({ activePrivateChat: partnerId }),

  sendPrivateMessage: async (partnerId: string, text: string, selfDestruct: boolean = false) => {
    const { socket, userId, privateChats } = get();
    const chat = privateChats[partnerId];
    
    if (!socket || !chat || !chat.partnerPublicKey || !text.trim()) return;

    const encryptedData = await encryptWithEphemeralKey(text.trim(), chat.partnerPublicKey);
    const timestamp = Date.now();

    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: userId,
      text: text.trim(),
      timestamp,
      selfDestruct,
    };

    set((state) => ({
      privateChats: {
        ...state.privateChats,
        [partnerId]: {
          ...chat,
          messages: [...chat.messages, newMessage],
        },
      },
    }));

    socket.emit('private_message', {
      to: partnerId,
      from: userId,
      encryptedData,
      timestamp,
      selfDestruct,
    });
  },

  findMatch: () => {
    const { socket, userId } = get();
    if (!socket) return;
    set({ matchState: { status: 'searching', partnerId: null, roomId: null, messages: [] } });
    socket.emit('find_match', userId);
  },

  leaveMatch: () => {
    const { socket, userId, matchState } = get();
    if (!socket) return;
    if (matchState.status === 'searching') {
      socket.emit('leave_match_queue', userId);
    } else if (matchState.roomId) {
      socket.emit('leave_match_room', { roomId: matchState.roomId, userId });
    }
    set({ matchState: { status: 'idle', partnerId: null, roomId: null, messages: [] } });
  },

  sendMatchMessage: (text: string) => {
    const { socket, userId, matchState } = get();
    if (!socket || !matchState.roomId || !text.trim()) return;

    const message: Message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: userId,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    socket.emit('send_match_message', { roomId: matchState.roomId, message });
    
    set((state) => ({
      matchState: {
        ...state.matchState,
        messages: [...state.matchState.messages, message],
      },
      matchTyping: false,
    }));
  },

  sendTypingEvent: (isTyping: boolean, targetId?: string, isGlobal?: boolean, roomId?: string) => {
    const { socket, userId } = get();
    if (!socket) return;
    socket.emit('typing', { userId, isTyping, targetId, isGlobal, roomId });
  },
}));
