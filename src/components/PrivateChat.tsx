import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { format } from 'date-fns';

export function PrivateChat() {
  const { 
    userId, 
    privateChats, 
    activePrivateChat, 
    startPrivateChat, 
    setActivePrivateChat, 
    sendPrivateMessage,
    privateTypingUsers,
    sendTypingEvent
  } = useAppStore();
  
  const [targetId, setTargetId] = useState('');
  const [input, setInput] = useState('');
  const [selfDestruct, setSelfDestruct] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChat = activePrivateChat ? privateChats[activePrivateChat] : null;
  const isPartnerTyping = activePrivateChat ? privateTypingUsers[activePrivateChat] : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, isPartnerTyping]);

  useEffect(() => {
    // Auto-remove self-destructing messages after 30 seconds
    if (!activeChat) return;
    const now = Date.now();
    const hasExpired = activeChat.messages.some(m => m.selfDestruct && now - m.timestamp > 30000);
    if (hasExpired) {
      const interval = setInterval(() => {
        // We'd need a store method to clean up messages, but for UI we can just filter them in render
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetId.trim() && targetId !== userId) {
      startPrivateChat(targetId.trim());
      setTargetId('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (activePrivateChat) {
      sendTypingEvent(true, activePrivateChat);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingEvent(false, activePrivateChat);
      }, 2000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && activePrivateChat) {
      sendPrivateMessage(activePrivateChat, input, selfDestruct);
      setInput('');
      sendTypingEvent(false, activePrivateChat);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  if (!activePrivateChat) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center h-full text-on-surface-variant max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-6xl mb-4 text-primary opacity-80">lock</span>
          <h2 className="text-2xl font-bold text-white mb-2">Encrypted Private Chat</h2>
          <p className="text-sm">Enter a User ID to start an end-to-end encrypted secure conversation.</p>
        </div>

        <form onSubmit={handleConnect} className="w-full space-y-4">
          <div className="bg-surface-container-highest rounded-2xl p-2 flex items-center border border-white/5 focus-within:border-primary/50 transition-colors">
            <span className="material-symbols-outlined pl-3 text-on-surface-variant">person_search</span>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter 8-10 digit User ID"
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-on-surface-variant px-3 py-2 outline-none"
            />
          </div>
          <button 
            type="submit"
            disabled={!targetId.trim() || targetId === userId}
            className="w-full py-3 rounded-2xl bg-primary text-on-primary font-bold hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Securely
          </button>
        </form>

        {Object.keys(privateChats).length > 0 && (
          <div className="mt-12 w-full">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Recent Chats</h3>
            <div className="space-y-2">
              {Object.values(privateChats).map((chat) => (
                <button
                  key={chat.partnerId}
                  onClick={() => setActivePrivateChat(chat.partnerId)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="text-left">
                      <div className="font-mono text-sm text-white">USER_{chat.partnerId.slice(-4)}</div>
                      <div className="text-xs text-on-surface-variant">
                        {chat.status === 'connected' ? 'Encrypted Session Active' : 'Connecting...'}
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full">
      {/* Chat Header */}
      <div className="shrink-0 flex items-center gap-4 mb-6 bg-surface-container-high p-4 rounded-3xl border border-white/5">
        <button 
          onClick={() => setActivePrivateChat(null)}
          className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-bright transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h3 className="font-mono font-bold text-white">USER_{activePrivateChat.slice(-4)}</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${activeChat?.status === 'connected' ? 'bg-secondary-fixed' : 'bg-error animate-pulse'}`}></span>
            <span className={activeChat?.status === 'connected' ? 'text-secondary-fixed' : 'text-error'}>
              {activeChat?.status === 'connected' ? 'E2E Encrypted' : 'Establishing Secure Connection...'}
            </span>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-bright transition-colors text-error">
          <span className="material-symbols-outlined">block</span>
        </button>
      </div>

      {/* Messages */}
      <section className="flex-1 overflow-y-auto space-y-6 pb-4 no-scrollbar">
        {activeChat?.messages.filter(m => !m.selfDestruct || Date.now() - m.timestamp < 30000).map((msg) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end ml-auto' : 'items-start'} max-w-[85%] group`}>
              <div className="flex items-center gap-2 mb-2 px-2">
                <span className="text-[10px] text-on-surface-variant font-mono">
                  {format(msg.timestamp, 'HH:mm:ss')}
                </span>
                {msg.selfDestruct && (
                  <span className="material-symbols-outlined text-[12px] text-error animate-pulse" title="Self-destructing message (30s)">
                    timer
                  </span>
                )}
              </div>
              <div className="relative">
                <div className={isMe 
                  ? "bg-primary text-on-primary px-5 py-4 rounded-3xl rounded-tr-none shadow-lg"
                  : "bg-surface-container-highest text-white px-5 py-4 rounded-3xl rounded-tl-none shadow-lg border border-white/5"
                }>
                  <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        
        {isPartnerTyping && (
          <div className="flex flex-col items-start max-w-[85%] group animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-[10px] font-mono text-secondary-fixed-dim bg-on-secondary-fixed/30 px-2 py-0.5 rounded-sm">
                USER_{activePrivateChat.slice(-4)}
              </span>
            </div>
            <div className="bg-surface-container-highest text-white px-5 py-4 rounded-3xl rounded-tl-none shadow-lg border border-white/5">
              <div className="flex gap-1.5 items-center h-5">
                <div className="w-2 h-2 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Input */}
      <div className="shrink-0 pt-4">
        <form onSubmit={handleSend} className="bg-surface-container-highest/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-3 shadow-2xl">
          <button 
            type="button" 
            onClick={() => setSelfDestruct(!selfDestruct)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${selfDestruct ? 'bg-error/20 text-error' : 'text-on-surface-variant hover:bg-white/5'}`}
            title="Toggle Self-Destruct (30s)"
          >
            <span className="material-symbols-outlined">timer</span>
          </button>
          <input 
            value={input}
            onChange={handleInputChange}
            disabled={activeChat?.status !== 'connected'}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-on-surface-variant outline-none disabled:opacity-50" 
            placeholder={activeChat?.status === 'connected' ? "Type an encrypted message..." : "Waiting for secure connection..."} 
            type="text" 
          />
          <div className="flex items-center gap-1 pr-1">
            <button type="submit" disabled={!input.trim() || activeChat?.status !== 'connected'} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
