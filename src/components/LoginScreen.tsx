import React, { useState } from 'react';
import { BottleLogo } from './BottleLogo.js';
import { useInventory } from '../context/InventoryContext.js';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useInventory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    } else {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col justify-center items-center p-4 sm:p-6 text-[#242119]">
      <div className="w-full max-w-[350px] sm:max-w-[380px] bg-white border border-[#e8e4da] rounded-[28px] shadow-xl shadow-black/5 p-6 sm:p-7 space-y-5">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center">
          <BottleLogo size={40} showSubtitle={true} layout="vertical" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c7156]">
              USERNAME
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8c8878] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Username"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#faf8f4] border border-[#e8e4da] rounded-xl text-sm text-[#242119] placeholder:text-[#a09a8a] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c7156]">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8c8878] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="• • • • • •"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#faf8f4] border border-[#e8e4da] rounded-xl text-sm font-mono text-[#242119] placeholder:text-[#a09a8a] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#f8ede5] text-[#a05539] text-xs rounded-xl flex items-start gap-2 border border-[#ecdccf]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#242119] hover:bg-[#34302a] active:scale-[0.99] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <span>Sign In to Mobile App</span>
            <ArrowRight className="w-4 h-4 text-[#9c8f6f]" />
          </button>
        </form>
      </div>
    </div>
  );
};
