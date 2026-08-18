import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../data/storage';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { Shield, UserCheck, Users, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('pelatih');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const users = StorageService.getUsers();
    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() &&
           u.password === password &&
           u.role === roleTab
    );

    if (found) {
      if (found.active === false) {
        setErrorMsg('Akun Anda dinonaktifkan oleh Administrator. Silakan hubungi admin.');
        return;
      }
      StorageService.setCurrentUser(found);
      onLoginSuccess(found);
    } else {
      const roleLabel = roleTab === 'admin' 
        ? 'Administrator' 
        : roleTab === 'asisten_pelatih' 
        ? 'Asisten Pelatih' 
        : 'Pelatih';
      setErrorMsg(`Username atau Password ${roleLabel} tidak sesuai.`);
    }
  };

  const getRoleTitle = () => {
    switch (roleTab) {
      case 'admin': return 'Administrator';
      case 'asisten_pelatih': return 'Asisten Pelatih';
      case 'pelatih': return 'Pelatih';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden z-10">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-center border-b border-slate-700/60 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <TutWuriLogo className="w-12 h-12 drop-shadow-md" />
            <MarchingBandLogo className="w-12 h-12 drop-shadow-md" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white leading-tight">
            Absensi Forum Ekstrakurikuler Marching Band
          </h1>
        </div>

        {/* Role Toggle Tabs - 3 Roles */}
        <div className="grid grid-cols-3 border-b border-slate-700 bg-slate-900/60 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setRoleTab('pelatih');
              setUsername('');
              setPassword('');
              setErrorMsg(null);
            }}
            className={`py-2 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              roleTab === 'pelatih'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pelatih</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('asisten_pelatih');
              setUsername('');
              setPassword('');
              setErrorMsg(null);
            }}
            className={`py-2 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              roleTab === 'asisten_pelatih'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Asisten</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('admin');
              setUsername('admin');
              setPassword('admin123');
              setErrorMsg(null);
            }}
            className={`py-2 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              roleTab === 'admin'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username {getRoleTitle()}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder={
                  roleTab === 'admin'
                    ? 'admin'
                    : roleTab === 'asisten_pelatih'
                    ? 'username asisten pelatih'
                    : 'username pelatih'
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
              roleTab === 'admin'
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : roleTab === 'asisten_pelatih'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <span>Masuk Portal {getRoleTitle()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="bg-slate-900/80 px-4 py-2.5 border-t border-slate-700/60 flex items-center justify-center gap-2 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Database Terhubung ke Google Cloud Firebase Firestore</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-6 text-center">
        © 2026 Forum Ekstrakurikuler Marching Band. Hak Cipta Dilindungi.
      </p>
    </div>
  );
};
