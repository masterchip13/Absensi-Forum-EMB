import { JadwalLatihan, Sekolah, User } from '../types';

export interface ScheduleReminderItem {
  jadwal: JadwalLatihan;
  sekolah: Sekolah | undefined;
  status: 'starting_soon' | 'in_progress' | 'upcoming_today' | 'upcoming_week';
  minutesUntilStart: number;
  timeRemainingText: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getIndonesianDayName(date: Date = new Date()): string {
  return INDONESIAN_DAYS[date.getDay()];
}

// Convert "HH:mm" to minutes since midnight
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Check upcoming training reminders for the logged-in coach
export function getScheduleReminders(
  jadwalList: JadwalLatihan[],
  sekolahList: Sekolah[],
  currentUser: User | null,
  currentDate: Date = new Date()
): {
  startingSoonList: ScheduleReminderItem[];
  todayList: ScheduleReminderItem[];
  allActiveReminders: ScheduleReminderItem[];
} {
  if (!currentUser) {
    return { startingSoonList: [], todayList: [], allActiveReminders: [] };
  }

  const todayName = getIndonesianDayName(currentDate);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  // Filter schedules relevant to this user
  const userSekolahIds = currentUser.role === 'admin'
    ? sekolahList.map(s => s.id)
    : sekolahList.filter(s => s.pelatihId === currentUser.id).map(s => s.id);

  const relevantJadwal = jadwalList.filter(j => 
    (currentUser.role === 'admin' || j.pelatihId === currentUser.id || userSekolahIds.includes(j.sekolahId))
  );

  const startingSoonList: ScheduleReminderItem[] = [];
  const todayList: ScheduleReminderItem[] = [];
  const allActiveReminders: ScheduleReminderItem[] = [];

  for (const j of relevantJadwal) {
    const sekolah = sekolahList.find(s => s.id === j.sekolahId);
    const startMin = timeStringToMinutes(j.jamMulai);
    const endMin = timeStringToMinutes(j.jamSelesai);
    const diff = startMin - currentMinutes;

    const isToday = j.hari.trim().toLowerCase() === todayName.toLowerCase();

    if (isToday) {
      let status: 'starting_soon' | 'in_progress' | 'upcoming_today' = 'upcoming_today';
      let timeRemainingText = '';

      if (diff > 0 && diff <= 60) {
        // Less than or equal to 60 minutes before start!
        status = 'starting_soon';
        timeRemainingText = `Dimulai dalam ${diff} menit`;
      } else if (diff <= 0 && (endMin - currentMinutes) > 0) {
        // Currently ongoing
        status = 'in_progress';
        timeRemainingText = `Sedang berlangsung (hingga ${j.jamSelesai})`;
      } else if (diff > 60) {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        timeRemainingText = `Mulai dalam ${hours} jam ${mins > 0 ? `${mins} mnt` : ''}`;
      } else {
        timeRemainingText = `Selesai hari ini (${j.jamSelesai})`;
      }

      const item: ScheduleReminderItem = {
        jadwal: j,
        sekolah,
        status,
        minutesUntilStart: diff,
        timeRemainingText,
        hari: j.hari,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai
      };

      todayList.push(item);

      if (status === 'starting_soon' || status === 'in_progress') {
        startingSoonList.push(item);
        allActiveReminders.push(item);
      }
    }
  }

  // Sort starting soon by closest start time
  startingSoonList.sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
  todayList.sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);

  return { startingSoonList, todayList, allActiveReminders };
}

// Notification sound player
export function playNotificationTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch (e) {
    // Ignore audio restrictions
  }
}

// Browser notification permission helper
export async function requestBrowserNotification(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icon.png'
    });
  } catch (e) {
    // Ignore
  }
}
