import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, School, QrCode, Volume2, VolumeX, CheckCircle, Sparkles, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { JadwalLatihan, Sekolah, User } from '../types';
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
  onOpenQrScanner: () => void;
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
    allActiveReminders: ScheduleReminderItem[];
  }>({ startingSoonList: [], todayList: [], allActiveReminders: [] });

  // For testing/simulation mode
  const [isSimulatedActive, setIsSimulatedActive] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Check browser notification permission status on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotifyGranted(true);
    }
  }, []);

  // Recalculate reminders every 30 seconds
  useEffect(() => {
    const updateReminders = () => {
      const now = new Date();
      let res = getScheduleReminders(jadwalList, sekolahList, currentUser, now);

      // If simulated mode is enabled and there are no natural starting soon items, synthesize one for demo
      if (isSimulatedActive && res.startingSoonList.length === 0) {
        const sampleSchool = sekolahList[0] || { id: 'sch-demo', namaSekolah: 'SDN Sukaharja 01' };
        const dummyJadwal: JadwalLatihan = {
          id: 'sim-jadwal-1',
          pelatihId: currentUser?.id || 'u-pelatih',
          sekolahId: sampleSchool.id,
          hari: 'Hari Ini',
          jamMulai: `${String(now.getHours()).padStart(2, '0')}:${String((now.getMinutes() + 35) % 60).padStart(2, '0')}`,
          jamSelesai: `${String((now.getHours() + 2) % 24).padStart(2, '0')}:00`,
          reminderEnabled: true,
          reminderMinutesBefore: 60
        };
        const simItem: ScheduleReminderItem = {
          jadwal: dummyJadwal,
          sekolah: sampleSchool as Sekolah,
          status: 'starting_soon',
          minutesUntilStart: 35,
          timeRemainingText: 'Dimulai dalam 35 menit (Simulasi)',
          hari: 'Hari Ini',
          jamMulai: dummyJadwal.jamMulai,
          jamSelesai: dummyJadwal.jamSelesai
        };
        res = {
          startingSoonList: [simItem],
          todayList: [simItem, ...res.todayList],
          allActiveReminders: [simItem]
        };
      }

      setReminders(res);

      // Check if there are newly entering "starting_soon" schedules to alert with chime & push
      res.startingSoonList.forEach(item => {
        const notifyKey = `${item.jadwal.id}-${new Date().toDateString()}`;
        if (!notifiedIdsRef.current.has(notifyKey)) {
          notifiedIdsRef.current.add(notifyKey);
          if (soundEnabled) {
            playNotificationTone();
          }
          sendBrowserNotification(
            '⏰ Pengingat Latihan Marching Band!',
            `Jadwal latihan di ${item.sekolah?.namaSekolah || 'Sekolah'} dimulai dalam ${item.minutesUntilStart} menit (Pukul ${item.jamMulai}).`
          );
        }
      });
    };

    updateReminders();
    const interval = setInterval(updateReminders, 30000);
    return () => clearInterval(interval);
  }, [jadwalList, sekolahList, currentUser, isSimulatedActive, soundEnabled]);

  // Handle click outside to close dropdown
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
      sendBrowserNotification('🔔 Notifikasi Aktif', 'Pengingat latihan 1 jam sebelum jadwal akan dikirimkan ke perangkat Anda.');
    }
  };

  const handleSimulateToggle = () => {
    const nextState = !isSimulatedActive;
    setIsSimulatedActive(nextState);
    if (nextState) {
      if (soundEnabled) playNotificationTone();
    }
  };

  const totalUrgentCount = reminders.startingSoonList.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
          totalUrgentCount > 0
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
        }`}
        title="Pengingat Jadwal Latihan (< 1 Jam)"
        aria-label="Notifikasi Jadwal"
      >
        <Bell className={`w-4 h-4 ${totalUrgentCount > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
        
        {/* Animated Badge Pill */}
        {totalUrgentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-bounce">
            {totalUrgentCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-auto md:right-0 mt-2 w-80 sm:w-96 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 py-3 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-4 pb-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Pengingat Jadwal Latihan</h4>
                <p className="text-[10px] text-slate-400">Peringatan otomatis &lt; 1 jam sebelum jam mulai</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Starting Soon Alerts */}
          <div className="max-h-72 overflow-y-auto p-3 space-y-2.5">
            {reminders.startingSoonList.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Mendesak: Latihan Segera Dimulai
                  </span>
                  <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    &lt; 1 Jam
                  </span>
                </div>

                {reminders.startingSoonList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-800/90 border border-amber-500/40 rounded-xl space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <h5 className="font-bold text-xs text-white truncate max-w-[200px]">
                            {item.sekolah?.namaSekolah || 'Sekolah Binaan'}
                          </h5>
                        </div>
                        <p className="text-[11px] text-amber-300 font-extrabold mt-0.5">
                          ⏰ {item.timeRemainingText} (Pukul {item.jamMulai} WIB)
                        </p>
                      </div>
                      <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shrink-0">
                        {item.jamMulai} - {item.jamSelesai}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.sekolah && onSelectSekolah) {
                            onSelectSekolah(item.sekolah.id);
                          }
                          onOpenQrScanner();
                          setIsOpen(false);
                        }}
                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Mulai Scan Presensi QR</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 px-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <CheckCircle className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-bold text-slate-300">Tidak Ada Jadwal Mendatang &lt; 1 Jam</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Sistem akan otomatis memberi notifikasi jika ada latihan yang dimulai dalam 1 jam.
                </p>
              </div>
            )}

            {/* List of other schedules today */}
            {reminders.todayList.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                  Jadwal Latihan Hari Ini ({reminders.todayList.length})
                </span>
                <div className="space-y-1.5">
                  {reminders.todayList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-800/70 border border-slate-700/60 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-200 block truncate">
                          {item.sekolah?.namaSekolah}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.hari} • {item.jamMulai} - {item.jamSelesai}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.status === 'starting_soon'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : item.status === 'in_progress'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {item.status === 'starting_soon' ? '< 1 Jam' : item.status === 'in_progress' ? 'Sedang Jalan' : item.jamMulai}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls & Simulator */}
          <div className="px-3 pt-2.5 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px] bg-slate-950/40">
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playNotificationTone();
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                title={soundEnabled ? 'Suara notifikasi aktif' : 'Suara notifikasi nonaktif'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {/* Push permission */}
              {!browserNotifyGranted && 'Notification' in window && (
                <button
                  type="button"
                  onClick={handleEnableBrowserNotify}
                  className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline"
                >
                  Aktifkan Web Push
                </button>
              )}
            </div>

            {/* Simulation test button */}
            <button
              type="button"
              onClick={handleSimulateToggle}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
                isSimulatedActive
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isSimulatedActive ? 'Matikan Simulasi' : 'Coba Tes Notifikasi'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
