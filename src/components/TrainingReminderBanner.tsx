import React, { useState, useEffect } from 'react';
import { Bell, Clock, School, QrCode, X, ChevronRight, Sparkles, Volume2 } from 'lucide-react';
import { JadwalLatihan, Sekolah, User } from '../types';
import { getScheduleReminders, ScheduleReminderItem } from '../utils/scheduleNotifications';

interface TrainingReminderBannerProps {
  currentUser: User;
  jadwalList: JadwalLatihan[];
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  onOpenQrScanner: () => void;
  onNavigateToJadwal?: () => void;
}

export const TrainingReminderBanner: React.FC<TrainingReminderBannerProps> = ({
  currentUser,
  jadwalList,
  sekolahList,
  selectedSekolahId,
  onSelectSekolah,
  onOpenQrScanner,
  onNavigateToJadwal
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [urgentItems, setUrgentItems] = useState<ScheduleReminderItem[]>([]);

  useEffect(() => {
    const checkUrgent = () => {
      const now = new Date();
      const res = getScheduleReminders(jadwalList, sekolahList, currentUser, now);
      // Filter out dismissed for this session
      const visible = res.startingSoonList.filter(item => !dismissedIds.includes(item.jadwal.id));
      setUrgentItems(visible);
    };

    checkUrgent();
    const interval = setInterval(checkUrgent, 30000);
    return () => clearInterval(interval);
  }, [jadwalList, sekolahList, currentUser, dismissedIds]);

  if (urgentItems.length === 0) {
    return null;
  }

  const primaryItem = urgentItems[0];

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 p-4 rounded-2xl shadow-lg border-2 border-amber-300 animate-fade-in relative overflow-hidden">
      {/* Background ambient pattern */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Alert Content */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-slate-950 text-amber-300 rounded-xl shadow-md shrink-0 mt-0.5 animate-bounce">
            <Bell className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full">
                ⚠️ Peringatan Latihan &lt; 1 Jam
              </span>
              <span className="text-xs font-black text-slate-950 underline underline-offset-2">
                {primaryItem.timeRemainingText}
              </span>
            </div>

            <h4 className="font-extrabold text-base text-slate-950 mt-1 leading-tight">
              Latihan di {primaryItem.sekolah?.namaSekolah || 'Sekolah'} akan segera dimulai!
            </h4>
            
            <p className="text-xs text-slate-900 font-semibold mt-0.5">
              Jadwal: Hari {primaryItem.hari} Pukul {primaryItem.jamMulai} - {primaryItem.jamSelesai} WIB. Siapkan perlengkapan dan buka presensi QR.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => {
              if (primaryItem.sekolah) {
                onSelectSekolah(primaryItem.sekolah.id);
              }
              onOpenQrScanner();
            }}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-amber-200 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Mulai Scan Presensi QR</span>
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(primaryItem.jadwal.id)}
            className="p-2 text-slate-950/70 hover:text-slate-950 hover:bg-white/20 rounded-xl transition"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
