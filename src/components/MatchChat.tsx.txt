import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { format } from 'date-fns';

export function MatchChat() {
  const { 
    userId, 
    matchState,
    findMatch,
    leaveMatch,
    sendMatchMessage,
    matchTyping,
    sendTypingEvent
  } = useAppStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchState.messages, matchTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (matchState.roomId) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingEvent(true, undefined, false, matchState.roomId);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        sendTypingEvent(false, undefined, false, matchState.roomId!);
      }, 2000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && matchState.status === 'matched') {
      sendMatchMessage(input);
      setInput('');
      if (matchState.roomId) {
        isTypingRef.current = false;
        sendTypingEvent(false, undefined, false, matchState.roomId);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  if (matchState.status === 'idle') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center h-full text-on-surface-variant max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-6xl mb-4 text-error opacity-80">local_fire_department</span>
          <h2 className="text-2xl font-bold text-white mb-2">Random Match</h2>
          <p className="text-sm">Find someone new to talk to. Connections are anonymous and temporary.</p>
        </div>

        <button 
          onClick={findMatch}
          className="w-full py-4 rounded-2xl bg-error text-on-error font-bold hover:bg-error-dim transition-colors shadow-[0_0_20px_rgba(255,110,132,0.2)]"
        >
          Start Searching
        </button>
      </div>
    );
  }

  if (matchState.status === 'searching') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center h-full text-on-surface-variant max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-error/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-error border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center material-symbols-outlined text-error text-3xl">search</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Searching...</h2>
          <p className="text-sm">Looking for a random partner.</p>
        </div>

        <button 
          onClick={leaveMatch}
          className="w-full py-3 rounded-2xl bg-surface-container-highest text-white font-bold hover:bg-surface-bright transition-colors border border-white/5"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full">
      {/* Chat Header */}
      <div className="shrink-0 flex items-center gap-4 mb-6 bg-surface-container-high p-4 rounded-3xl border border-white/5">
        <div className="flex-1">
          <h3 className="font-mono font-bold text-white">Stranger</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
            <span className="text-secondary-fixed">Connected</span>
          </div>
        </div>
        <button 
          onClick={leaveMatch}
          className="px-4 py-2 rounded-full bg-surface-container-highest text-white text-sm font-bold hover:bg-surface-bright transition-colors border border-white/5"
        >
          Skip
        </button>
      </div>

      {/* Messages */}
      <section className="flex-1 overflow-y-auto space-y-6 pb-4 no-scrollbar">
        {matchState.messages.map((msg, idx) => {
          if (msg.senderId === 'system') {
            return (
              <div key={idx} className="flex justify-center py-2">
                <div className="bg-surface-container-lowest/50 font-mono text-[10px] px-4 py-1.5 rounded-full border border-outline-variant/20 text-on-surface-variant">
                  {msg.text}
                </div>
              </div>
            );
          }

          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end ml-auto' : 'items-start'} max-w-[85%] group`}>
              <div className="flex items-center gap-2 mb-2 px-2">
                <span className="text-[10px] text-on-surface-variant font-mono">
                  {format(msg.timestamp, 'HH:mm:ss')}
                </span>
              </div>
              <div className="relative">
                <div className={isMe 
                  ? "bg-error text-on-error px-5 py-4 rounded-3xl rounded-tr-none shadow-lg"
                  : "bg-surface-container-highest text-white px-5 py-4 rounded-3xl rounded-tl-none shadow-lg border border-white/5"
                }>
                  <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        
        {matchTyping && (
          <div className="flex flex-col items-start max-w-[85%] group animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-[10px] font-mono text-secondary-fixed-dim bg-on-secondary-fixed/30 px-2 py-0.5 rounded-sm">
                Stranger
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
          <input 
            value={input}
            onChange={handleInputChange}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-on-surface-variant outline-none pl-4" 
            placeholder="Type a message..." 
            type="text" 
          />
          <div className="flex items-center gap-1 pr-1">
            <button type="submit" disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center rounded-full bg-error text-on-error shadow-lg shadow-error/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
