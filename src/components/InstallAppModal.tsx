import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Apple, 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  WifiOff, 
  QrCode
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Capture Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setDeferredPrompt(null);
        setTimeout(() => {
          setIsInstalled(true);
        }, 1000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 sm:p-6 border-b border-slate-700/80 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-blue-400/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Pasang Aplikasi di HP
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Kompatibel penuh untuk Android & Apple (iPhone / iPad)
              </p>
            </div>
          </div>

          {/* Platform Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-slate-700/60">
            <button
              onClick={() => setPlatform('android')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                platform === 'android'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-300" />
              <span>Android (Google)</span>
            </button>

            <button
              onClick={() => setPlatform('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                platform === 'ios'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple className="w-4 h-4 text-slate-100" />
              <span>Apple (iPhone / iPad)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Status Badge */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-xs">Aplikasi Sudah Terpasang!</p>
                <p className="text-[11px] text-emerald-300/90">
                  Anda sedang membuka aplikasi dalam mode native standalone. Fitur offline dan kamera siap digunakan.
                </p>
              </div>
            </div>
          ) : installSuccess ? (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-xs">Pemasangan Berhasil!</p>
                <p className="text-[11px] text-emerald-300/90">
                  Ikon aplikasi telah ditambahkan ke Layar Utama perangkat Anda.
                </p>
              </div>
            </div>
          ) : null}

          {/* Android Instructions */}
          {platform === 'android' && !isInstalled && (
            <div className="space-y-3">
              <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Pemasangan di Android (Chrome / Edge / Samsung)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    PWA Ready
                  </span>
                </div>

                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Aplikasi Sekarang (1 Klik)</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 text-slate-300 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                        1
                      </div>
                      <p>
                        Buka menu browser dengan mengetuk ikon <b>titik tiga (⋮)</b> di pojok kanan atas browser Google Chrome.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                        2
                      </div>
                      <p>
                        Pilih menu <b>"Pasang aplikasi"</b> atau <b>"Tambahkan ke Layar Utama" (Add to Home screen)</b>.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                        3
                      </div>
                      <p>
                        Ketuk <b>"Pasang" / "Install"</b>. Aplikasi akan terpasang di menu utama HP layaknya aplikasi Google Play Store.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apple (iOS / iPadOS) Instructions */}
          {platform === 'ios' && !isInstalled && (
            <div className="space-y-3">
              <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Apple className="w-4 h-4 text-blue-400" />
                    Panduan Apple iPhone & iPad (Safari)
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    iOS Web App
                  </span>
                </div>

                <div className="space-y-3 text-slate-300 text-xs">
                  <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                    <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Share className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">1. Ketuk Tombol Share (Bagikan)</p>
                      <p className="text-[11px] text-slate-400">
                        Buka situs ini di browser Safari, lalu ketuk ikon <b>Bagikan (Share)</b> di bilah bawah layar iPhone atau atas layar iPad.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">2. Pilih "Tambah ke Layar Utama"</p>
                      <p className="text-[11px] text-slate-400">
                        Gulir menu ke bawah lalu pilih opsi <b>"Add to Home Screen"</b> (Tambah ke Layar Utama).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                    <div className="w-6 h-6 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">3. Ketuk "Tambah" (Add)</p>
                      <p className="text-[11px] text-slate-400">
                        Ketuk tombol <b>Tambah / Add</b> di pojok kanan atas. Ikon aplikasi akan langsung muncul di Homescreen Apple Anda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Highlights on Mobile Devices */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block text-slate-200 text-[11px]">Scan Kamera Cepat</span>
                <span className="text-[10px] text-slate-400">Presensi instan di HP</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-slate-200 text-[11px]">Dukungan Offline</span>
                <span className="text-[10px] text-slate-400">Tetap jalan tanpa sinyal</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
