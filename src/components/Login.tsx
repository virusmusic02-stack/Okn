import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateUserId } from '../lib/utils';

// Helper function to hash passphrase using Web Crypto API
async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function Login() {
  const [deviceId, setDeviceId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isNewDevice, setIsNewDevice] = useState(true);
  const [usePassphrase, setUsePassphrase] = useState(false);
  
  const login = useAppStore(state => state.login);

  useEffect(() => {
    // Check if device identity already exists
    const existingId = localStorage.getItem('openanon_device_id');
    if (existingId) {
      setDeviceId(existingId);
      setIsNewDevice(false);
      
      // Check if it has a passphrase lock
      const hasLock = localStorage.getItem('openanon_device_lock');
      if (hasLock) {
        setUsePassphrase(true);
      }
    } else {
      setDeviceId(generateUserId());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNewDevice) {
      if (usePassphrase) {
        if (!passphrase) {
          setError('Passphrase is required if lock is enabled.');
          return;
        }
        if (passphrase !== confirmPassphrase) {
          setError('Passphrases do not match.');
          return;
        }
        const hashedPassphrase = await hashPassphrase(passphrase);
        localStorage.setItem('openanon_device_lock', hashedPassphrase);
      }
      localStorage.setItem('openanon_device_id', deviceId);
      login(deviceId);
    } else {
      if (usePassphrase) {
        const savedLock = localStorage.getItem('openanon_device_lock');
        const hashedInput = await hashPassphrase(passphrase);
        if (savedLock !== hashedInput) {
          setError('Invalid passphrase.');
          return;
        }
      }
      login(deviceId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-body">
      <div className="w-full max-w-md bg-surface-container rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
              <span className="material-symbols-outlined text-3xl text-primary">
                {isNewDevice ? 'fingerprint' : 'lock'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
              {isNewDevice ? 'Device Identity' : 'Unlock Device'}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isNewDevice 
                ? 'Your anonymous numeric identity has been generated.' 
                : 'Enter your passphrase to unlock your identity.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                Device ID (Auto-Generated)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">badge</span>
                <input
                  type="text"
                  value={deviceId}
                  readOnly
                  className="w-full bg-surface-container-highest border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white/70 focus:outline-none font-mono text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {isNewDevice && (
              <div className="flex items-center gap-3 py-2">
                <button 
                  type="button"
                  onClick={() => setUsePassphrase(!usePassphrase)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${usePassphrase ? 'bg-primary' : 'bg-surface-container-highest border border-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${usePassphrase ? 'left-7' : 'left-1'}`}></div>
                </button>
                <span className="text-sm text-white font-medium">Enable Optional Passphrase Lock</span>
              </div>
            )}

            {usePassphrase && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                    Passphrase
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">key</span>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-highest border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                    />
                  </div>
                </div>

                {isNewDevice && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                      Confirm Passphrase
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">password</span>
                      <input
                        type="password"
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-container-highest border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-bold hover:bg-primary-dim transition-all shadow-[0_0_20px_rgba(222,142,255,0.15)] hover:shadow-[0_0_25px_rgba(222,142,255,0.25)] active:scale-[0.98] mt-2"
            >
              {isNewDevice ? 'Initialize Identity' : 'Unlock Identity'}
            </button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[12px]">verified_user</span>
              Zero-Knowledge Architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
