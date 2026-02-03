
import React, { useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await googleSheetService.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      // Strip internal error codes if present for a cleaner UI
      const cleanMessage = (err as Error).message.replace('AUTH_FAILED: ', '');
      setError(cleanMessage || "Authentication Failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tp-purple relative overflow-hidden p-6">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tp-red/10 rounded-full blur-[140px] -mr-80 -mt-80 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -ml-60 -mb-60"></div>
      
      <div className="w-full max-w-lg relative z-10 animate-fadeIn">
        <div className="text-center mb-10">
          <div className="inline-flex w-24 h-24 bg-white rounded-[32px] items-center justify-center shadow-2xl mb-6 transform hover:rotate-6 transition-transform">
            <span className="text-tp-purple font-black text-4xl">TP</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Skillence Academy</h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            <AirlineIcon className="w-4 h-4 text-tp-red" />
            <p className="text-tp-red font-black text-[10px] uppercase tracking-[0.4em]">Lufthansa Account Coach • Global Standards</p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[48px] p-10 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-tp-red/10 border border-tp-red/20 p-5 rounded-2xl flex items-center gap-4 text-tp-red animate-shake">
                <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-widest leading-tight">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-tp-purple/60 uppercase tracking-widest mb-2 block px-2">Enterprise ID / Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="agent.name@tp.eg"
                  className="w-full bg-tp-purple/5 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:border-tp-red focus:bg-white transition-all text-tp-purple font-bold placeholder-tp-purple/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-tp-purple/60 uppercase tracking-widest mb-2 block px-2">Secure Access Code</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-tp-purple/5 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:border-tp-red focus:bg-white transition-all text-tp-purple font-bold placeholder-tp-purple/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-tp-navy text-white py-5 rounded-[24px] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-tp-purple hover:-translate-y-1 transition-all flex items-center justify-center disabled:opacity-50 min-h-[60px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Authorize Session"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-tp-purple/10">
            <div className="bg-tp-purple/5 rounded-3xl p-6 text-center">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">No enterprise access?</p>
              <button 
                onClick={onEnterSandbox}
                className="w-full px-8 py-4 bg-white border border-tp-purple/10 text-tp-purple rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-tp-red hover:text-white hover:border-tp-red transition-all shadow-sm"
              >
                Launch Offline Sandbox (Bypass)
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.5em] mb-2">
            Lufthansa Internal Learning Resource
          </p>
          <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.3em]">
            © 2025 Teleperformance Egypt • Information Security Protected
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
