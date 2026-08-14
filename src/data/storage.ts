import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, EventLog, AbsenSiswaEntry } from '../types';
import {
  INITIAL_USERS,
  INITIAL_SEKOLAH,
  INITIAL_DIVISI,
  INITIAL_JADWAL,
  INITIAL_ANGGOTA,
  INITIAL_ABSEN_PELATIH,
  INITIAL_EVENTS,
  INITIAL_ABSEN_SISWA
} from './initialData';

const STORAGE_KEYS = {
  USERS: 'fmb_users_v1',
  SEKOLAH: 'fmb_sekolah_v1',
  DIVISI: 'fmb_divisi_v1',
  JADWAL: 'fmb_jadwal_v1',
  ANGGOTA: 'fmb_anggota_v1',
  ABSEN_PELATIH: 'fmb_absen_pelatih_v1',
  EVENTS: 'fmb_events_v1',
  ABSEN_SISWA: 'fmb_absen_siswa_v1',
  CURRENT_USER: 'fmb_current_user_v1',
  SELECTED_SEKOLAH: 'fmb_selected_sekolah_v1',
  TAHUN_AJARAN_LIST: 'fmb_tahun_ajaran_list_v1',
  ACTIVE_TAHUN_AJARAN: 'fmb_active_tahun_ajaran_v1'
};

const DEFAULT_TAHUN_AJARAN_LIST = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];
const DEFAULT_ACTIVE_TAHUN_AJARAN = '2024/2025';

// Helper to get item from localStorage or initialize default
function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      try {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      } catch (e) {
        console.warn('Could not set default item in localStorage:', key, e);
      }
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading localStorage key:', key, e);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error saving to localStorage key "${key}":`, e);

    // Quota recovery mechanism
    if (Array.isArray(value)) {
      try {
        // Strategy 1: Truncate large data URLs in older items (keep first 8 intact)
        const sanitizedArray = value.map((item, idx) => {
          if (idx >= 8 && item && typeof item === 'object') {
            const newItem = { ...item };
            if (newItem.fotoDokumentasiUrl && newItem.fotoDokumentasiUrl.length > 500) {
              newItem.fotoDokumentasiUrl = '';
            }
            if (newItem.signatureUrl && newItem.signatureUrl.length > 500) {
              newItem.signatureUrl = '';
            }
            if (newItem.parafPelatihUrl && newItem.parafPelatihUrl.length > 500) {
              newItem.parafPelatihUrl = '';
            }
            return newItem;
          }
          return item;
        });

        localStorage.setItem(key, JSON.stringify(sanitizedArray));
        console.info(`Saved sanitized array to "${key}" after quota warning.`);
        return;
      } catch (err2) {
        // Strategy 2: Slice to top 12 items
        try {
          const trimmed = value.slice(0, 12);
          localStorage.setItem(key, JSON.stringify(trimmed));
          console.info(`Saved trimmed 12 items to "${key}" after quota warning.`);
          return;
        } catch (err3) {
          console.error(`Failed to save to "${key}" even after trimming:`, err3);
        }
      }
    }
  }
}

export const StorageService = {
  // Reset all data back to mock defaults
  resetToDefaults: () => {
    localStorage.clear();
    setStoredItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStoredItem(STORAGE_KEYS.SEKOLAH, INITIAL_SEKOLAH);
    setStoredItem(STORAGE_KEYS.DIVISI, INITIAL_DIVISI);
    setStoredItem(STORAGE_KEYS.JADWAL, INITIAL_JADWAL);
    setStoredItem(STORAGE_KEYS.ANGGOTA, INITIAL_ANGGOTA);
    setStoredItem(STORAGE_KEYS.ABSEN_PELATIH, INITIAL_ABSEN_PELATIH);
    setStoredItem(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    setStoredItem(STORAGE_KEYS.ABSEN_SISWA, INITIAL_ABSEN_SISWA);
    setStoredItem(STORAGE_KEYS.CURRENT_USER, null);
    setStoredItem(STORAGE_KEYS.SELECTED_SEKOLAH, '');
    setStoredItem(STORAGE_KEYS.TAHUN_AJARAN_LIST, DEFAULT_TAHUN_AJARAN_LIST);
    setStoredItem(STORAGE_KEYS.ACTIVE_TAHUN_AJARAN, DEFAULT_ACTIVE_TAHUN_AJARAN);
  },

  // Current Auth User
  getCurrentUser: (): User | null => {
    const user = getStoredItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user && (user.username === 'budi' || user.username === 'siti' || user.id === 'u-pelatih-1' || user.id === 'u-pelatih-2')) {
      return null;
    }
    return user;
  },
  setCurrentUser: (user: User | null) => {
    setStoredItem(STORAGE_KEYS.CURRENT_USER, user);
  },

  // Active School Selection
  getSelectedSekolahId: (): string => {
    const list = StorageService.getSekolah();
    const stored = getStoredItem<string>(STORAGE_KEYS.SELECTED_SEKOLAH, '');
    if (stored && list.some(s => s.id === stored)) return stored;
    return list.length > 0 ? list[0].id : '';
  },
  setSelectedSekolahId: (id: string) => {
    setStoredItem(STORAGE_KEYS.SELECTED_SEKOLAH, id);
  },

  // Users
  getUsers: (): User[] => {
    const users = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    return users.filter(u => u.username !== 'budi' && u.username !== 'siti' && u.id !== 'u-pelatih-1' && u.id !== 'u-pelatih-2');
  },
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setStoredItem(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (userId: string) => {
    const users = StorageService.getUsers().filter(u => u.id !== userId);
    setStoredItem(STORAGE_KEYS.USERS, users);
  },

  // Sekolah
  getSekolah: (): Sekolah[] => {
    const list = getStoredItem<Sekolah[]>(STORAGE_KEYS.SEKOLAH, INITIAL_SEKOLAH);
    return list.filter(s => s.pelatihId !== 'u-pelatih-1' && s.pelatihId !== 'u-pelatih-2' && !['sch-1', 'sch-2', 'sch-3'].includes(s.id));
  },
  saveSekolah: (sekolah: Sekolah) => {
    const list = StorageService.getSekolah();
    const index = list.findIndex(s => s.id === sekolah.id);
    if (index >= 0) list[index] = sekolah;
    else list.push(sekolah);
    setStoredItem(STORAGE_KEYS.SEKOLAH, list);
  },
  deleteSekolah: (id: string) => {
    const list = StorageService.getSekolah().filter(s => s.id !== id);
    setStoredItem(STORAGE_KEYS.SEKOLAH, list);
  },

  // Divisi
  getDivisi: (): Divisi[] => {
    const list = getStoredItem<Divisi[]>(STORAGE_KEYS.DIVISI, INITIAL_DIVISI);
    return list.filter(d => d.pelatihId !== 'u-pelatih-1' && d.pelatihId !== 'u-pelatih-2');
  },
  saveDivisi: (divisi: Divisi) => {
    const list = StorageService.getDivisi();
    const index = list.findIndex(d => d.id === divisi.id);
    if (index >= 0) list[index] = divisi;
    else list.push(divisi);
    setStoredItem(STORAGE_KEYS.DIVISI, list);
  },
  deleteDivisi: (id: string) => {
    const list = StorageService.getDivisi().filter(d => d.id !== id);
    setStoredItem(STORAGE_KEYS.DIVISI, list);
  },

  // Jadwal Latihan
  getJadwal: (): JadwalLatihan[] => {
    const list = getStoredItem<JadwalLatihan[]>(STORAGE_KEYS.JADWAL, INITIAL_JADWAL);
    return list.filter(j => j.pelatihId !== 'u-pelatih-1' && j.pelatihId !== 'u-pelatih-2' && !['sch-1', 'sch-2', 'sch-3'].includes(j.sekolahId));
  },
  saveJadwal: (jadwal: JadwalLatihan) => {
    const list = StorageService.getJadwal();
    const index = list.findIndex(j => j.id === jadwal.id);
    if (index >= 0) list[index] = jadwal;
    else list.push(jadwal);
    setStoredItem(STORAGE_KEYS.JADWAL, list);
  },
  deleteJadwal: (id: string) => {
    const list = StorageService.getJadwal().filter(j => j.id !== id);
    setStoredItem(STORAGE_KEYS.JADWAL, list);
  },

  // Anggota (Siswa)
  getAnggota: (): Anggota[] => {
    const list = getStoredItem<Anggota[]>(STORAGE_KEYS.ANGGOTA, INITIAL_ANGGOTA);
    return list.filter(a => a.pelatihId !== 'u-pelatih-1' && a.pelatihId !== 'u-pelatih-2' && !['sch-1', 'sch-2', 'sch-3'].includes(a.sekolahId));
  },
  saveAnggota: (anggota: Anggota) => {
    const list = StorageService.getAnggota();
    const index = list.findIndex(a => a.id === anggota.id);
    if (index >= 0) list[index] = anggota;
    else list.push(anggota);
    setStoredItem(STORAGE_KEYS.ANGGOTA, list);
  },
  deleteAnggota: (id: string) => {
    const list = StorageService.getAnggota().filter(a => a.id !== id);
    setStoredItem(STORAGE_KEYS.ANGGOTA, list);
  },

  // Absen Pelatih & Dokumentasi
  getAbsenPelatih: (): AbsenPelatihItem[] => {
    const list = getStoredItem<AbsenPelatihItem[]>(STORAGE_KEYS.ABSEN_PELATIH, INITIAL_ABSEN_PELATIH);
    return list.filter(a => a.pelatihId !== 'u-pelatih-1' && a.pelatihId !== 'u-pelatih-2' && !['sch-1', 'sch-2', 'sch-3'].includes(a.sekolahId));
  },
  saveAbsenPelatih: (item: AbsenPelatihItem) => {
    const list = StorageService.getAbsenPelatih();
    const index = list.findIndex(a => a.id === item.id);
    if (index >= 0) list[index] = item;
    else list.unshift(item); // top is newest
    setStoredItem(STORAGE_KEYS.ABSEN_PELATIH, list);
  },
  deleteAbsenPelatih: (id: string) => {
    const list = StorageService.getAbsenPelatih().filter(a => a.id !== id);
    setStoredItem(STORAGE_KEYS.ABSEN_PELATIH, list);
  },

  // Events
  getEvents: (): EventLog[] => {
    const list = getStoredItem<EventLog[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    return list.filter(e => !['sch-1', 'sch-2', 'sch-3'].includes(e.sekolahId));
  },
  saveEvent: (evt: EventLog) => {
    const list = StorageService.getEvents();
    const index = list.findIndex(e => e.id === evt.id);
    if (index >= 0) list[index] = evt;
    else list.push(evt);
    setStoredItem(STORAGE_KEYS.EVENTS, list);
  },
  deleteEvent: (id: string) => {
    const list = StorageService.getEvents().filter(e => e.id !== id);
    setStoredItem(STORAGE_KEYS.EVENTS, list);
  },

  // Absen Siswa (Column 1 - 5)
  getAbsenSiswa: (): AbsenSiswaEntry[] => {
    const list = getStoredItem<AbsenSiswaEntry[]>(STORAGE_KEYS.ABSEN_SISWA, INITIAL_ABSEN_SISWA);
    return list.filter(a => !['sch-1', 'sch-2', 'sch-3'].includes(a.sekolahId));
  },
  saveAbsenSiswa: (entry: AbsenSiswaEntry) => {
    const list = StorageService.getAbsenSiswa();
    // Check if entry exists for this anggota, bulan, tahun, and kolomIndex
    const index = list.findIndex(
      a => a.anggotaId === entry.anggotaId &&
           a.bulan === entry.bulan &&
           a.tahunAjaran === entry.tahunAjaran &&
           a.kolomIndex === entry.kolomIndex
    );
    if (index >= 0) list[index] = entry;
    else list.push(entry);
    setStoredItem(STORAGE_KEYS.ABSEN_SISWA, list);
  },

  // Tahun Ajaran Management
  getTahunAjaranList: (): string[] => {
    return getStoredItem<string[]>(STORAGE_KEYS.TAHUN_AJARAN_LIST, DEFAULT_TAHUN_AJARAN_LIST);
  },
  getActiveTahunAjaran: (): string => {
    return getStoredItem<string>(STORAGE_KEYS.ACTIVE_TAHUN_AJARAN, DEFAULT_ACTIVE_TAHUN_AJARAN);
  },
  setActiveTahunAjaran: (tahun: string) => {
    setStoredItem(STORAGE_KEYS.ACTIVE_TAHUN_AJARAN, tahun);
  },
  saveTahunAjaranList: (list: string[]) => {
    setStoredItem(STORAGE_KEYS.TAHUN_AJARAN_LIST, list);
  },
  addTahunAjaran: (tahun: string) => {
    const list = StorageService.getTahunAjaranList();
    if (!list.includes(tahun)) {
      list.push(tahun);
      // Sort academic years (e.g. 2023/2024, 2024/2025)
      list.sort((a, b) => a.localeCompare(b));
      StorageService.saveTahunAjaranList(list);
    }
  },
  deleteTahunAjaran: (tahun: string) => {
    const active = StorageService.getActiveTahunAjaran();
    if (tahun === active) return; // Cannot delete current active academic year
    const list = StorageService.getTahunAjaranList().filter(t => t !== tahun);
    StorageService.saveTahunAjaranList(list);
  }
};
