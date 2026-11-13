import React, { useState, useEffect } from 'react';
import { Bell, QrCode, X } from 'lucide-react';
import { JadwalLatihan, Sekolah, User } from '../types';
import { getScheduleReminders, ScheduleReminderItem } from '../utils/scheduleNotifications';

interface TrainingReminderBannerProps {
  currentUser: User;
  jadwalList: JadwalLatihan[];
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  onOpenQrScanner: (jadwalId?: string) => void;
  onNavigateToJadwal?: () => void;
}

export const TrainingReminderBanner: React.FC<TrainingReminderBannerProps> = ({
  currentUser,
  jadwalList,
  sekolahList,
  onSelectSekolah,
  onOpenQrScanner
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [urgentItems, setUrgentItems] = useState<ScheduleReminderItem[]>([]);

  useEffect(() => {
    const checkUrgent = () => {
      const now = new Date();
      const res = getScheduleReminders(jadwalList, sekolahList, currentUser, now);
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
    <div className="bg-amber-50 border border-amber-300 text-slate-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              Pengingat Latihan
            </span>
            <span className="text-xs font-bold text-slate-900">
              • {primaryItem.timeRemainingText}
            </span>
          </div>
          <p className="font-bold text-sm text-slate-900 mt-0.5">
            {primaryItem.sekolah?.namaSekolah || 'Sekolah Binaan'} — {primaryItem.tanggalLabel || primaryItem.hari} ({primaryItem.jamMulai} - {primaryItem.jamSelesai} WIB)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={() => {
            if (primaryItem.sekolah) {
              onSelectSekolah(primaryItem.sekolah.id);
            }
            onOpenQrScanner(primaryItem.jadwal.id);
          }}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Scan Absen Sesi</span>
        </button>
        <button
          type="button"
          onClick={() => handleDismiss(primaryItem.jadwal.id)}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-amber-100 rounded-lg transition cursor-pointer"
          title="Tutup Pengingat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
