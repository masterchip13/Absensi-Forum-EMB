import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, School, QrCode, Volume2, VolumeX, CheckCircle, X } from 'lucide-react';
import { JadwalLatihan, Sekolah, User } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import {
  getScheduleReminders,
  playNotificationTone,
  requestBrowserNotification,
  sendBrowserNotification,
  ScheduleReminderItem
} from '../utils/scheduleNotifications';

interface NotificationBellProps {
  currentUser: User | null;
  jadwalList: JadwalLatihan[];
  sekolahList: Sekolah[];
  onOpenQrScanner: (jadwalId?: string) => void;
  onSelectSekolah?: (id: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  jadwalList,
  sekolahList,
  onOpenQrScanner,
  onSelectSekolah
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifyGranted, setBrowserNotifyGranted] = useState(false);
  const [reminders, setReminders] = useState<{
    startingSoonList: ScheduleReminderItem[];
    todayList: ScheduleReminderItem[];
    upcomingList: ScheduleReminderItem[];
    allActiveReminders: ScheduleReminderItem[];
  }>({ startingSoonList: [], todayList: [], upcomingList: [], allActiveReminders: [] });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotifyGranted(true);
    }
  }, []);

  useEffect(() => {
    const updateReminders = () => {
      const now = new Date();
      const res = getScheduleReminders(jadwalList, sekolahList, currentUser, now);
      setReminders(res);

      // Send chime & browser push once per session day when entering reminder window
      const todayKey = getLocalDateString(now);
      res.startingSoonList.forEach(item => {
        const notifyKey = `${item.jadwal.id}-${todayKey}`;
        if (!notifiedIdsRef.current.has(notifyKey)) {
          notifiedIdsRef.current.add(notifyKey);
          if (soundEnabled) {
            playNotificationTone();
          }
          sendBrowserNotification(
            'Pengingat Latihan Marching Band',
            `Latihan di ${item.sekolah?.namaSekolah || 'Sekolah'} (${item.jamMulai} - ${item.jamSelesai}): ${item.timeRemainingText}`
          );
        }
      });
    };

    updateReminders();
    const interval = setInterval(updateReminders, 30000);
    return () => clearInterval(interval);
  }, [jadwalList, sekolahList, currentUser, soundEnabled]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnableBrowserNotify = async () => {
    const granted = await requestBrowserNotification();
    setBrowserNotifyGranted(granted);
    if (granted) {
      sendBrowserNotification('Notifikasi Diaktifkan', 'Pengingat jadwal latihan akan dikirim ke perangkat Anda.');
    }
  };

  const totalUrgentCount = reminders.startingSoonList.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
          totalUrgentCount > 0
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
        }`}
        title="Pengingat Jadwal Latihan"
        aria-label="Notifikasi Jadwal"
      >
        <Bell className={`w-4 h-4 ${totalUrgentCount > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
        {totalUrgentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-900 tabular-nums">
            {totalUrgentCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 py-3 z-50 overflow-hidden">
          <div className="px-4 pb-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Pengingat Jadwal Latihan</h4>
                <p className="text-[10px] text-slate-400">Otomatis sesuai waktu pengingat sesi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-3 space-y-2.5">
            {reminders.startingSoonList.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-300 px-1 block">
                  Segera Dimulai / Berlangsung
                </span>
                {reminders.startingSoonList.map((item) => (
                  <div
                    key={item.jadwal.id}
                    className="p-3 bg-slate-800 border border-amber-500/40 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <h5 className="font-bold text-xs text-white truncate">
                            {item.sekolah?.namaSekolah || 'Sekolah Binaan'}
                          </h5>
                        </div>
                        <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                          {item.tanggalLabel} • {item.timeRemainingText}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shrink-0 tabular-nums">
                        {item.jamMulai} - {item.jamSelesai}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (item.sekolah && onSelectSekolah) {
                          onSelectSekolah(item.sekolah.id);
                        }
                        onOpenQrScanner(item.jadwal.id);
                        setIsOpen(false);
                      }}
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mulai Scan Presensi QR</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 px-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
                <p className="text-xs font-semibold text-slate-200">Tidak Ada Sesi Mendesak Saat Ini</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Notifikasi otomatis muncul sebelum jadwal latihan dimulai.
                </p>
              </div>
            )}

            {reminders.todayList.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                  Jadwal Hari Ini ({reminders.todayList.length})
                </span>
                <div className="space-y-1.5">
                  {reminders.todayList.map((item) => (
                    <div
                      key={item.jadwal.id}
                      className="p-2 bg-slate-800/70 border border-slate-700/60 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-200 block truncate">
                          {item.sekolah?.namaSekolah}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {item.tanggalLabel} • {item.jamMulai} - {item.jamSelesai}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300 shrink-0 tabular-nums">
                        {item.jamMulai}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reminders.upcomingList.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                  Jadwal Mendatang ({reminders.upcomingList.slice(0, 3).length})
                </span>
                <div className="space-y-1.5">
                  {reminders.upcomingList.slice(0, 3).map((item) => (
                    <div
                      key={item.jadwal.id}
                      className="p-2 bg-slate-800/40 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-300 block truncate">
                          {item.sekolah?.namaSekolah}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {item.tanggalLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                        {item.jamMulai} - {item.jamSelesai}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pt-2.5 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playNotificationTone();
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                title={soundEnabled ? 'Suara pengingat aktif' : 'Suara pengingat nonaktif'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                <span className="text-[10px]">{soundEnabled ? 'Suara Aktif' : 'Senyap'}</span>
              </button>
            </div>

            {!browserNotifyGranted && 'Notification' in window && (
              <button
                type="button"
                onClick={handleEnableBrowserNotify}
                className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Aktifkan Notifikasi Browser
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
