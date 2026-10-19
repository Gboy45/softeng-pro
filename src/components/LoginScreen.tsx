import React, { useState } from 'react';
import { BottleLogo } from './BottleLogo.js';
import { useInventory } from '../context/InventoryContext.js';
import { User, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useInventory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'personnel' | null>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    } else {
      setError(null);
    }
  };

  const handleQuickLogin = (u: string, p: string, role: 'admin' | 'personnel') => {
    setSelectedRole(role);
    setUsername(u);
    setPassword(p);
    setError(null);
    login(u, p);
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col justify-center items-center p-4 sm:p-6 text-[#242119]">
      {/* Non-bulky Mobile-Friendly GUI Card matching user screenshot */}
      <div className="w-full max-w-[350px] sm:max-w-[380px] bg-white border border-[#e8e4da] rounded-[28px] shadow-xl shadow-black/5 p-6 sm:p-7 space-y-5">
        {/* Logo Header matching photo */}
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
                placeholder="ferdie or charlene"
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

        {/* Divider & Select Role to Quick Sign-In */}
        <div className="pt-3 border-t border-[#f0ece0] space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] text-center">
            SELECT ROLE TO QUICK SIGN-IN
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Admin Role Button */}
            <button
              type="button"
              onClick={() => handleQuickLogin('ferdie', '123', 'admin')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedRole === 'admin'
                  ? 'bg-[#ede6d8] border-[#cfc4af] shadow-xs'
                  : 'bg-[#faf8f4] border-[#e8e4da] hover:bg-[#f2efe6]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#1b1915]">
                <Shield className="w-3.5 h-3.5 text-[#56534a]" />
                <span>Admin</span>
              </div>
              <div className="text-[11px] text-[#7c7156] mt-0.5 font-mono">
                ferdie / 123
              </div>
            </button>

            {/* Personnel Role Button */}
            <button
              type="button"
              onClick={() => handleQuickLogin('charlene', '123', 'personnel')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedRole === 'personnel'
                  ? 'bg-[#ede6d8] border-[#cfc4af] shadow-xs'
                  : 'bg-[#faf8f4] border-[#e8e4da] hover:bg-[#f2efe6]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#1b1915]">
                <User className="w-3.5 h-3.5 text-[#56534a]" />
                <span>Personnel</span>
              </div>
              <div className="text-[11px] text-[#7c7156] mt-0.5 font-mono">
                charlene / 123
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
