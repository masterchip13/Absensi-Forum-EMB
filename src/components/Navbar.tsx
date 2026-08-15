import React, { useState, useRef, useEffect } from 'react';
import { User, Sekolah, JadwalLatihan } from '../types';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { NotificationBell } from './NotificationBell';
import {
  LogOut,
  QrCode,
  School,
  Calendar,
  Settings,
  RefreshCw,
  Cloud,
  CloudOff,
  ChevronDown,
  User as UserIcon,
  Shield,
  Check,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { StorageService } from '../data/storage';
import { FirebaseSync, SyncStatus } from '../data/firebaseSync';

interface NavbarProps {
  currentUser: User | null;
  sekolahList: Sekolah[];
  jadwalList?: JadwalLatihan[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  activeTahunAjaran?: string;
  tahunAjaranList?: string[];
  onSelectTahunAjaran?: (tahun: string) => void;
  onOpenManageTahunAjaran?: () => void;
  onOpenQrScanner: () => void;
  onLogout: () => void;
  onRefreshData?: () => void;
  syncStatus?: SyncStatus;
  onManualSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  sekolahList,
  jadwalList = [],
  selectedSekolahId,
  onSelectSekolah,
  activeTahunAjaran = '2024/2025',
  tahunAjaranList = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'],
  onSelectTahunAjaran,
  onOpenManageTahunAjaran,
  onOpenQrScanner,
  onLogout,
  onRefreshData,
  syncStatus = 'connected',
  onManualSync
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const schoolRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (schoolRef.current && !schoolRef.current.contains(target)) {
        setIsSchoolDropdownOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    if (onManualSync) {
      await onManualSync();
    } else {
      await FirebaseSync.pushAllLocalToFirebase();
    }
    setTimeout(() => setIsSyncing(false), 800);
  };

  const selectedSchool = sekolahList.find(s => s.id === selectedSekolahId) || sekolahList[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-5">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <TutWuriLogo className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow" />
              <MarchingBandLogo className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  Absensi Marching Band
                </h1>
                <span className="hidden lg:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SDN Sukaharja
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate hidden xs:block">
                Sistem Presensi QR & Dokumen Resmi
              </p>
            </div>
          </div>

          {/* Right: Dropdowns & Action Controls */}
          {currentUser && (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* 1. School Selector Dropdown */}
              <div className="relative" ref={schoolRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSchoolDropdownOpen(!isSchoolDropdownOpen);
                    setIsYearDropdownOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition text-xs font-semibold max-w-[150px] sm:max-w-[200px]"
                  title="Pilih Sekolah"
                >
                  <School className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">
                    {selectedSchool ? selectedSchool.namaSekolah : 'Pilih Sekolah'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isSchoolDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {isSchoolDropdownOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                      Pilih Sekolah Aktif
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {sekolahList.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">Belum ada data sekolah</div>
                      ) : (
                        sekolahList.map((s) => {
                          const isSelected = s.id === selectedSekolahId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                onSelectSekolah(s.id);
                                setIsSchoolDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-blue-600/20 text-blue-300 font-bold border-l-2 border-blue-500'
                                  : 'text-slate-200 hover:bg-slate-700/70 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <School className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                                <span className="truncate">{s.namaSekolah}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Academic Year Dropdown */}
              <div className="relative hidden md:block" ref={yearRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsYearDropdownOpen(!isYearDropdownOpen);
                    setIsSchoolDropdownOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-750 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 transition text-xs font-bold"
                  title="Pilih Tahun Ajaran"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>TA: {activeTahunAjaran}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-amber-400/70 transition-transform duration-200 shrink-0 ${isYearDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
                </button>

                {isYearDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
                      <span>Tahun Ajaran</span>
                      {onOpenManageTahunAjaran && (
                        <button
                          onClick={() => {
                            setIsYearDropdownOpen(false);
                            onOpenManageTahunAjaran();
                          }}
                          className="text-amber-400 hover:text-amber-300 transition"
                          title="Kelola Tahun Ajaran"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="py-1">
                      {tahunAjaranList.map((t) => {
                        const isSelected = t === activeTahunAjaran;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (onSelectTahunAjaran) onSelectTahunAjaran(t);
                              StorageService.setActiveTahunAjaran(t);
                              setIsYearDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-500'
                                : 'text-slate-200 hover:bg-slate-700/70 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                              <span>{t}</span>
                            </div>
                            {isSelected && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">Aktif</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Scan QR Shortcut (Pelatih only) */}
              {currentUser.role === 'pelatih' && (
                <button
                  onClick={onOpenQrScanner}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 text-xs"
                  title="Scan QR Presensi Siswa"
                >
                  <QrCode className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
              )}

              {/* 4. Notification Bell (< 1 Hour Training Reminder) */}
              <NotificationBell
                currentUser={currentUser}
                jadwalList={jadwalList}
                sekolahList={sekolahList}
                onOpenQrScanner={onOpenQrScanner}
                onSelectSekolah={onSelectSekolah}
              />

              {/* 5. User Profile & Settings Dropdown Menu */}
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsSchoolDropdownOpen(false);
                    setIsYearDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition"
                  title="Menu Pengguna"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="hidden sm:flex flex-col items-start text-left">
                    <span className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[100px]">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      currentUser.role === 'admin' 
                        ? 'text-amber-400' 
                        : currentUser.role === 'asisten_pelatih' 
                        ? 'text-emerald-400' 
                        : 'text-blue-400'
                    }`}>
                      {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'asisten_pelatih' ? 'Asisten Pelatih' : 'Pelatih'}
                    </span>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {/* Dropdown Menu Box */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* Header Info */}
                    <div className="px-4 py-2.5 border-b border-slate-700/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-0.5 ${
                            currentUser.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : currentUser.role === 'asisten_pelatih'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {currentUser.role === 'admin' 
                              ? 'Administrator' 
                              : currentUser.role === 'asisten_pelatih' 
                              ? 'Asisten Pelatih' 
                              : 'Pelatih Ekstrakurikuler'}
                          </span>
                        </div>
                      </div>
                      {currentUser.nip && (
                        <p className="text-[11px] text-slate-400 mt-2">NIP/NUPTK: {currentUser.nip}</p>
                      )}
                    </div>

                    {/* Mobile Year Selector Item (visible on mobile only) */}
                    <div className="md:hidden px-3 py-2 border-b border-slate-700/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Tahun Ajaran Aktif</span>
                        {onOpenManageTahunAjaran && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenManageTahunAjaran();
                            }}
                            className="text-amber-400 text-[10px] flex items-center gap-1 font-bold"
                          >
                            <Settings className="w-3 h-3" /> Kelola
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {tahunAjaranList.map(t => (
                          <button
                            key={t}
                            onClick={() => {
                              if (onSelectTahunAjaran) onSelectTahunAjaran(t);
                              StorageService.setActiveTahunAjaran(t);
                              setIsUserMenuOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-bold text-center ${
                              t === activeTahunAjaran
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="px-2 py-1 space-y-0.5">
                      
                      {/* Cloud Sync Status Button */}
                      <button
                        onClick={handleSyncClick}
                        disabled={isSyncing}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-700/70 text-slate-200 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          {syncStatus === 'connected' ? (
                            <Cloud className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <CloudOff className="w-4 h-4 text-amber-400" />
                          )}
                          <div>
                            <span className="font-semibold block">Sinkronisasi Cloud</span>
                            <span className="text-[10px] text-slate-400">
                              {syncStatus === 'connected' ? 'Firebase Firestore Terhubung' : 'Sedang Menghubungkan'}
                            </span>
                          </div>
                        </div>
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                      </button>

                      {/* Manage Academic Year */}
                      {onOpenManageTahunAjaran && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenManageTahunAjaran();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-700/70 text-slate-200 transition"
                        >
                          <Settings className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold">Kelola Tahun Ajaran</span>
                        </button>
                      )}

                      {/* Reset Demo Data */}
                      {onRefreshData && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onRefreshData();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-700/70 text-slate-300 hover:text-white transition"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-400" />
                          <span>Muat Ulang / Reset Data</span>
                        </button>
                      )}
                    </div>

                    {/* Logout Option */}
                    <div className="pt-1 mt-1 border-t border-slate-700/60 px-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Keluar Akun (Logout)</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </header>
  );
};
