
import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import { BrainIcon, ExclamationCircleIcon, AirlineIcon } from './Icons';
import type { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onEnterSandbox: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onEnterSandbox }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConn = async () => {
      const isOnline = await googleSheetService.testConnection();
      setSystemStatus(isOnline ? 'online' : 'offline');
    };
    checkConn();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await googleSheetService.login(email, password);
      // Role routing is handled by the parent (App.tsx) based on user.role
      onLoginSuccess(user);
    } catch (err) {
      const cleanMessage = (err as Error).message.replace('AUTH_FAILED: ', '');
      setError(cleanMessage || "Authentication Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tp-purple relative overflow-hidden p-6 bg-gradient-to-br from-tp-purple via-tp-navy to-tp-purple">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tp-red/10 rounded-full blur-[140px] -mr-80 -mt-80 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tp-red/5 rounded-full blur-[100px] -ml-40 -mb-40"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-xl mb-4">
            <span className="text-tp-purple font-extrabold text-2xl">S</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Skillence Academy</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              systemStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 
              systemStatus === 'offline' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-400'
            }`}></div>
            <p className="text-white/70 font-semibold text-xs uppercase tracking-wider">
              {systemStatus === 'online' ? 'Global Node Online' : systemStatus === 'offline' ? 'Sandbox Mode Ready' : 'Syncing...'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-center gap-2.5 text-rose-700">
                <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Enterprise Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="admin@tp-skillence.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-tp-purple focus:ring-2 focus:ring-tp-purple/20 transition-all text-slate-900 font-medium text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Access Code</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-tp-purple focus:ring-2 focus:ring-tp-purple/20 transition-all text-slate-900 font-medium text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-tp-purple text-white py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-tp-purple-light transition-all disabled:opacity-50"
            >
              {isLoading ? "Validating Session..." : "Authorize Portal"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={onEnterSandbox}
              className="text-slate-500 hover:text-tp-purple font-semibold uppercase text-xs tracking-wider transition-colors"
            >
              Emergency Sandbox Access (Offline)
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
            © 2025 Skillence Egypt • Client Specialized Track
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
