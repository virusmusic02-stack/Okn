import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { format } from 'date-fns';

export function GlobalChat() {
  const { globalMessages, sendGlobalMessage, userId, activeUsersCount, globalTypingUsers, sendTypingEvent } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, globalTypingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    sendTypingEvent(true, undefined, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false, undefined, true);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendGlobalMessage(input);
      setInput('');
      sendTypingEvent(false, undefined, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Main Chat Feed */}
      <section className="flex-1 overflow-y-auto space-y-6 pb-4 no-scrollbar">
        {globalMessages.map((msg) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end ml-auto' : 'items-start'} max-w-[85%] group`}>
              <div className="flex items-center gap-2 mb-2 px-2">
                {!isMe && (
                  <span className="text-[10px] font-mono text-secondary-fixed-dim bg-on-secondary-fixed/30 px-2 py-0.5 rounded-sm">
                    USER_{msg.senderId.slice(-4)}
                  </span>
                )}
                <span className="text-[10px] text-on-surface-variant font-mono">
                  {format(msg.timestamp, 'HH:mm:ss')}
                </span>
                {isMe && (
                  <span className="text-[10px] font-mono text-primary bg-on-primary-container/30 px-2 py-0.5 rounded-sm">
                    YOU_{userId.slice(-4)}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className={isMe 
                  ? "glass-bubble text-white px-5 py-4 rounded-3xl rounded-tr-none shadow-[0_0_20px_rgba(222,142,255,0.1)] border border-primary/10"
                  : "bg-surface-container-high text-on-surface px-5 py-4 rounded-3xl rounded-tl-none shadow-xl border-l-2 border-primary/20"
                }>
                  <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        
        {globalTypingUsers.size > 0 && (
          <div className="flex flex-col items-start max-w-[85%] group animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-[10px] font-mono text-secondary-fixed-dim bg-on-secondary-fixed/30 px-2 py-0.5 rounded-sm">
                {globalTypingUsers.size === 1 ? 'Someone' : 'Multiple people'}
              </span>
            </div>
            <div className="bg-surface-container-high text-on-surface px-5 py-4 rounded-3xl rounded-tl-none shadow-xl border-l-2 border-primary/20">
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

      {/* Bottom Message Input Shell */}
      <div className="shrink-0 pt-4">
        <form onSubmit={handleSend} className="bg-surface-container-highest/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-3 shadow-2xl">
          <input 
            value={input}
            onChange={handleInputChange}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-on-surface-variant outline-none pl-4" 
            placeholder="Type an anonymous message..." 
            type="text" 
          />
          <div className="flex items-center gap-1 pr-1">
            <button type="submit" disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
