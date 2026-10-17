import React, { useState } from 'react';
import { BottleLogo } from './BottleLogo.js';
import { useInventory } from '../context/InventoryContext.js';
import { Shield, User, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

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

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    const res = login(u, p);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col justify-center items-center p-4 sm:p-6 text-[#242119]">
      <div className="w-full max-w-sm bg-white border border-[#e7e2d4] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Original Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BottleLogo size={42} showSubtitle={true} className="justify-center" />
          <div className="w-10 h-0.5 bg-[#9c8f6f] rounded-full mt-2" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7c7156]">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8c8878] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="ferdie or charlene"
                className="w-full pl-9 pr-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7c7156]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8c8878] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••"
                className="w-full pl-9 pr-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
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
            className="w-full py-2.5 px-4 bg-[#242119] hover:bg-[#34302a] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <span>Sign In to Mobile App</span>
            <ArrowRight className="w-4 h-4 text-[#9c8f6f]" />
          </button>
        </form>

        {/* Quick Credentials Helper for Mobile App Users */}
        <div className="pt-4 border-t border-[#f0ece0] space-y-2.5 text-center">
          <span className="text-[11px] font-semibold text-[#8c8878] uppercase tracking-wider block">
            Select Role to Quick Sign-In
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ferdie', '123')}
              className="p-2.5 rounded-xl border border-[#9c8f6f] bg-[#efeadc] hover:bg-[#e7e2d4] text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#242119]">
                <Shield className="w-3.5 h-3.5 text-[#7c7156]" /> Admin
              </div>
              <div className="text-[11px] font-mono text-[#7c7156] mt-0.5">ferdie / 123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('charlene', '123')}
              className="p-2.5 rounded-xl border border-[#e7e2d4] bg-[#faf8f4] hover:bg-[#f2efe6] text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#242119]">
                <User className="w-3.5 h-3.5 text-[#8c8878]" /> Personnel
              </div>
              <div className="text-[11px] font-mono text-[#8c8878] mt-0.5">charlene / 123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
