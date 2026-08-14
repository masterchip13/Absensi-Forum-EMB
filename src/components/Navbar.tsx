import React from 'react';
import { User, Sekolah } from '../types';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { LogOut, QrCode, School, Calendar, Settings, RefreshCw } from 'lucide-react';
import { StorageService } from '../data/storage';

interface NavbarProps {
  currentUser: User | null;
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  activeTahunAjaran?: string;
  tahunAjaranList?: string[];
  onSelectTahunAjaran?: (tahun: string) => void;
  onOpenManageTahunAjaran?: () => void;
  onOpenQrScanner: () => void;
  onLogout: () => void;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  sekolahList,
  selectedSekolahId,
  onSelectSekolah,
  activeTahunAjaran = '2024/2025',
  tahunAjaranList = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'],
  onSelectTahunAjaran,
  onOpenManageTahunAjaran,
  onOpenQrScanner,
  onLogout,
  onRefreshData
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
      {/* Top Banner Branding */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-2 flex items-center justify-between border-b border-blue-900/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <TutWuriLogo className="w-8 h-8 drop-shadow" />
            <MarchingBandLogo className="w-8 h-8 drop-shadow" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
              Absensi Forum Ekstrakurikuler Marching Band
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-200 font-medium">
              Sistem Absensi Digital QR Code & Rekap Laporan Resmi
            </p>
          </div>
        </div>

        {/* User Badge */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-100">{currentUser.name}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {currentUser.role === 'admin' ? 'Administrator' : 'Pelatih'}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Keluar"
              className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 rounded-lg border border-slate-700 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* School Selector & Academic Year Selector Bar */}
      {currentUser && (
        <div className="bg-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/50 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* School Dropdown */}
            <div className="flex items-center gap-1.5">
              <School className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-300 font-medium whitespace-nowrap">Sekolah:</span>
              <select
                value={selectedSekolahId}
                onChange={(e) => onSelectSekolah(e.target.value)}
                className="bg-slate-900 text-white font-semibold border border-slate-600 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-[180px] sm:max-w-xs truncate"
              >
                {sekolahList.length === 0 ? (
                  <option value="">Belum ada sekolah</option>
                ) : (
                  sekolahList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.namaSekolah}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Academic Year Control */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Tahun Ajaran:</span>
              <select
                value={activeTahunAjaran}
                onChange={(e) => {
                  if (onSelectTahunAjaran) onSelectTahunAjaran(e.target.value);
                  StorageService.setActiveTahunAjaran(e.target.value);
                }}
                className="bg-transparent text-amber-300 font-extrabold text-xs focus:outline-none cursor-pointer"
              >
                {tahunAjaranList.map((t) => (
                  <option key={t} value={t} className="bg-slate-900 text-white font-bold">
                    {t} {t === activeTahunAjaran ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>

              {onOpenManageTahunAjaran && (
                <button
                  onClick={onOpenManageTahunAjaran}
                  className="p-1 text-slate-400 hover:text-amber-300 transition"
                  title="Kelola Daftar Tahun Ajaran"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser.role === 'pelatih' && (
              <button
                onClick={onOpenQrScanner}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
              >
                <QrCode className="w-4 h-4 text-yellow-300" />
                <span>Scan QR Absen</span>
              </button>
            )}

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                title="Reset/Reset Data Demo"
                className="p-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
