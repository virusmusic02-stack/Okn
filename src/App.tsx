/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { GlobalChat } from './components/GlobalChat';
import { PrivateChat } from './components/PrivateChat';
import { MatchChat } from './components/MatchChat';
import { Profile } from './components/Profile';
import { Navigation } from './components/Navigation';
import { Login } from './components/Login';

export default function App() {
  const { init, userId, isConnected, view, isAuthenticated, logout, activeUsersCount } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full bg-[#0e0e0e] text-[#de8eff] flex justify-between items-center px-4 h-16 z-50 border-b border-[#494847]/15 shadow-[0_4px_32px_rgba(222,142,255,0.08)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
            <img
              alt="User Profile"
              className="w-8 h-8 opacity-80"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuASFfkIQobj5avDrZM1YQvlCOVSsAvXF6xxUZNscWqhIYWZMcE5K9HN_J_DUC-6Or2Hauo7qXDNG823w5P9F75E-jTDBvnENZ9rwzDwGAFbdI8XxxBG8hz3AQCWIXxzhN7TqY2_Fk8wJkDnLCsMhq0-Na1dNypXdTuo293rbA-QJd9jUJnuvpkuxnd3wH9BUtf8sUxqhWhNdZfsM2MEXQ9YaebOy12sxcgRRCrgxZJZQIFM1aEr4qbznuGWNdL-kzz4h9QDYZXvj51p"
            />
          </div>
          <span className="font-['Inter'] font-bold text-white tracking-tight text-xl font-black hidden sm:block">OpenAnon</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 hidden md:flex">
            <div className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></div>
            <span className="text-xs font-bold text-secondary-fixed">{activeUsersCount} Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary-fixed' : 'bg-error'}`}></div>
            <span className="font-mono text-xs text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 max-w-[100px] truncate">
              ID: {userId}
            </span>
          </div>
          <button onClick={logout} className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors" title="Logout">logout</button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 mt-16 overflow-hidden px-4 md:px-8 pt-6 pb-4 max-w-5xl mx-auto w-full flex flex-col">
        {view === 'global' && <GlobalChat />}
        {view === 'private' && <PrivateChat />}
        {view === 'match' && <MatchChat />}
        {view === 'profile' && <Profile />}
      </main>

      <Navigation isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
