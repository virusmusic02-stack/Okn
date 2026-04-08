import { useAppStore } from '../store';

export function Profile() {
  const { userId, activeUsersCount } = useAppStore();

  return (
    <div className="flex flex-col flex-1 items-center justify-center h-full text-on-surface-variant max-w-md mx-auto w-full">
      <div className="text-center mb-12">
        <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-6 border-4 border-surface-container-highest relative overflow-hidden">
          <img
            alt="User Profile"
            className="w-full h-full object-cover opacity-80"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuASFfkIQobj5avDrZM1YQvlCOVSsAvXF6xxUZNscWqhIYWZMcE5K9HN_J_DUC-6Or2Hauo7qXDNG823w5P9F75E-jTDBvnENZ9rwzDwGAFbdI8XxxBG8hz3AQCWIXxzhN7TqY2_Fk8wJkDnLCsMhq0-Na1dNypXdTuo293rbA-QJd9jUJnuvpkuxnd3wH9BUtf8sUxqhWhNdZfsM2MEXQ9YaebOy12sxcgRRCrgxZJZQIFM1aEr4qbznuGWNdL-kzz4h9QDYZXvj51p"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">OpenAnon</h2>
        <p className="text-sm">Your anonymous identity</p>
      </div>

      <div className="w-full space-y-4">
        <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">User ID</span>
            <button className="text-primary hover:text-primary-dim transition-colors">
              <span className="material-symbols-outlined text-sm">content_copy</span>
            </button>
          </div>
          <div className="font-mono text-2xl text-white tracking-widest text-center py-4 bg-surface-container-lowest rounded-xl border border-white/5">
            {userId.slice(0, 4)}-{userId.slice(4, 8)}{userId.slice(8) ? `-${userId.slice(8)}` : ''}
          </div>
          <p className="text-xs text-center text-on-surface-variant mt-4">
            Share this ID with others to start a private, end-to-end encrypted chat.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container rounded-3xl p-6 border border-white/5 text-center">
            <span className="material-symbols-outlined text-3xl text-secondary mb-2">public</span>
            <div className="text-2xl font-black text-white">{activeUsersCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Online Now</div>
          </div>
          <div className="bg-surface-container rounded-3xl p-6 border border-white/5 text-center">
            <span className="material-symbols-outlined text-3xl text-tertiary mb-2">shield</span>
            <div className="text-2xl font-black text-white">E2EE</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Secured</div>
          </div>
        </div>
      </div>
    </div>
  );
}
