import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../data/storage';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { Shield, UserCheck, ArrowRight, Sparkles, School, Key } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('pelatih');
  const [username, setUsername] = useState('coach');
  const [password, setPassword] = useState('coach123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const users = StorageService.getUsers();
    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() &&
           u.password === password &&
           (u.role === roleTab || (roleTab === 'pelatih' && (u.role as string) === 'coach'))
    );

    if (found) {
      if (found.active === false) {
        setErrorMsg('Akun Anda dinonaktifkan oleh Administrator. Silakan hubungi admin.');
        return;
      }
      StorageService.setCurrentUser(found);
      onLoginSuccess(found);
    } else {
      const roleLabel = roleTab === 'admin' ? 'Administrator' : 'Coach (Pelatih)';
      setErrorMsg(`Username atau Password ${roleLabel} tidak sesuai.`);
    }
  };

  const setRoleAndCredentials = (role: UserRole, user: string, pass: string) => {
    setRoleTab(role);
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
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
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Sistem Role-Based Access Control (Admin & Coach)
          </p>
        </div>

        {/* Primary Role Selector - Two Main Roles: Admin & Coach */}
        <div className="grid grid-cols-2 border-b border-slate-700 bg-slate-900/60 p-2 gap-2">
          <button
            type="button"
            onClick={() => setRoleAndCredentials('pelatih', 'coach', 'coach123')}
            className={`py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
              roleTab === 'pelatih'
                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-blue-200" />
            <div className="text-left">
              <span className="block text-xs font-black">Coach (Pelatih)</span>
              <span className="text-[10px] text-blue-200/80 block -mt-0.5">Kelola Absen & Siswa</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRoleAndCredentials('admin', 'admin', 'admin123')}
            className={`py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
              roleTab === 'admin'
                ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-200" />
            <div className="text-left">
              <span className="block text-xs font-black">Administrator</span>
              <span className="text-[10px] text-amber-200/80 block -mt-0.5">Kontrol Penuh Sistem</span>
            </div>
          </button>
        </div>

        {/* Role Description Card */}
        <div className="px-6 pt-4 pb-1">
          <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
            roleTab === 'admin' 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
              : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
          }`}>
            {roleTab === 'admin' ? (
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-300">Akses Penuh Administrator:</span>
                  Manajemen akun pelatih, kelola & penugasan sekolah, pantau seluruh rekap presensi dan unduh laporan semua sekolah.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-blue-300">Akses Khusus Coach / Pelatih:</span>
                  Input presensi QR siswa, tulis jurnal latihan harian, kelola siswa & unduh laporan khusus sekolah binaan yang ditugaskan.
                </div>
              </div>
            )}
          </div>
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
              Username {roleTab === 'admin' ? 'Administrator' : 'Coach / Pelatih'}
            </label>
            <input
              type="text"
              required
              placeholder={roleTab === 'admin' ? 'admin' : 'coach'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi / Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          {/* Quick Demo Login Chips */}
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase tracking-wider">
              ⚡ Akun Demo Siap Pakai:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {roleTab === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setRoleAndCredentials('admin', 'admin', 'admin123')}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  🔑 Login Admin (admin / admin123)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setRoleAndCredentials('pelatih', 'coach', 'coach123')}
                    className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    🎺 Coach Hendra (coach / coach123)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleAndCredentials('pelatih', 'coach2', 'coach123')}
                    className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    🎺 Coach Rizky (coach2 / coach123)
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              roleTab === 'admin'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
            }`}
          >
            <span>Masuk Portal {roleTab === 'admin' ? 'Administrator' : 'Coach (Pelatih)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="bg-slate-900/80 px-4 py-2.5 border-t border-slate-700/60 flex items-center justify-center gap-2 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Database Terhubung ke Google Cloud Firebase Firestore</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-6 text-center">
        © 2026 Forum Ekstrakurikuler Marching Band — Sistem Role-Based Access Control
      </p>
    </div>
  );
};
