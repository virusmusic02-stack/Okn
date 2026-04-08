import { useAppStore } from '../store';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Navigation({ isOpen, onClose }: NavigationProps) {
  const { view, setView } = useAppStore();

  const navItems = [
    { id: 'global', icon: 'public', label: 'Global' },
    { id: 'private', icon: 'chat_bubble', label: 'Private' },
    { id: 'match', icon: 'local_fire_department', label: 'Match' },
    { id: 'profile', icon: 'person', label: 'Profile' },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <nav 
        className={`fixed top-0 left-0 h-full w-64 bg-surface-container-high z-[70] transform transition-transform duration-300 ease-in-out border-r border-white/10 shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <span className="font-['Inter'] font-bold text-white tracking-tight text-xl font-black">Menu</span>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-white transition-colors">
            close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-['Inter'] text-sm font-bold tracking-wide">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
