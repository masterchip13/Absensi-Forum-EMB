import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Database, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestoredToast, setShowRestoredToast] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredToast(true);
      setTimeout(() => setShowRestoredToast(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if Service Worker is controlling the page
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setSwActive(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md border-b border-amber-800 text-xs flex flex-wrap items-center justify-between gap-2 animate-fade-in z-50">
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="p-1.5 bg-amber-950/30 rounded-xl border border-amber-400/30 shrink-0">
              <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-amber-100">
                <span>Mode Offline Aktif</span>
                <span className="bg-amber-950/50 text-amber-200 text-[10px] px-2 py-0.2 rounded-full border border-amber-400/20">
                  Tersimpan di Memori Lokal
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-tight">
                Sinyal internet terputus. Pelatih tetap dapat menginput presensi, scan QR Code, & menyimpan jurnal tanpa hambatan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 bg-amber-900/60 text-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-amber-500/30">
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span>Offline Database Ready</span>
            </span>
          </div>
        </div>
      )}

      {/* Online Restored Toast */}
      {showRestoredToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-fade-in max-w-sm">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300 shrink-0">
            <Wifi className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Koneksi Internet Pulih
            </h4>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              Seluruh data yang diinput selama offline telah siap disinkronisasikan.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
