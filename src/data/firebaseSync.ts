import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  Sekolah,
  Divisi,
  Anggota,
  JadwalLatihan,
  AbsenPelatihItem,
  EventLog,
  AbsenSiswaEntry
} from '../types';
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
import { StorageService } from './storage';

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  SEKOLAH: 'sekolah',
  DIVISI: 'divisi',
  JADWAL: 'jadwal',
  ANGGOTA: 'anggota',
  ABSEN_PELATIH: 'absenPelatih',
  EVENTS: 'events',
  ABSEN_SISWA: 'absenSiswa',
  SETTINGS: 'settings'
};

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

let syncListeners: Unsubscribe[] = [];
let currentSyncStatus: SyncStatus = 'offline';
const statusListeners: ((status: SyncStatus) => void)[] = [];

export function onSyncStatusChange(callback: (status: SyncStatus) => void) {
  statusListeners.push(callback);
  callback(currentSyncStatus);
  return () => {
    const idx = statusListeners.indexOf(callback);
    if (idx >= 0) statusListeners.splice(idx, 1);
  };
}

function updateSyncStatus(newStatus: SyncStatus) {
  currentSyncStatus = newStatus;
  statusListeners.forEach(cb => cb(newStatus));
}

export const FirebaseSync = {
  getStatus: () => currentSyncStatus,

  // Initialize listeners and first seed if Firestore is empty
  init: async (onDataUpdate?: () => void) => {
    try {
      updateSyncStatus('syncing');

      // Check if collections are empty; if so, seed with initial or local data
      const sekolahSnap = await getDocs(collection(db, COLLECTIONS.SEKOLAH));
      if (sekolahSnap.empty) {
        console.log('Firebase collections empty, seeding from initial/local data...');
        await FirebaseSync.pushAllLocalToFirebase();
      }

      // Clear existing listeners
      syncListeners.forEach(unsub => unsub());
      syncListeners = [];

      // 1. Users
      const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), snapshot => {
        if (!snapshot.empty) {
          const users: User[] = [];
          snapshot.forEach(docSnap => users.push(docSnap.data() as User));
          localStorage.setItem('fmb_users_v1', JSON.stringify(users));
          onDataUpdate?.();
        }
      }, err => console.warn('Users listener error:', err));
      syncListeners.push(unsubUsers);

      // 2. Sekolah
      const unsubSekolah = onSnapshot(collection(db, COLLECTIONS.SEKOLAH), snapshot => {
        if (!snapshot.empty) {
          const list: Sekolah[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as Sekolah));
          localStorage.setItem('fmb_sekolah_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('Sekolah listener error:', err));
      syncListeners.push(unsubSekolah);

      // 3. Divisi
      const unsubDivisi = onSnapshot(collection(db, COLLECTIONS.DIVISI), snapshot => {
        if (!snapshot.empty) {
          const list: Divisi[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as Divisi));
          localStorage.setItem('fmb_divisi_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('Divisi listener error:', err));
      syncListeners.push(unsubDivisi);

      // 4. Jadwal
      const unsubJadwal = onSnapshot(collection(db, COLLECTIONS.JADWAL), snapshot => {
        if (!snapshot.empty) {
          const list: JadwalLatihan[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as JadwalLatihan));
          localStorage.setItem('fmb_jadwal_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('Jadwal listener error:', err));
      syncListeners.push(unsubJadwal);

      // 5. Anggota
      const unsubAnggota = onSnapshot(collection(db, COLLECTIONS.ANGGOTA), snapshot => {
        if (!snapshot.empty) {
          const list: Anggota[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as Anggota));
          localStorage.setItem('fmb_anggota_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('Anggota listener error:', err));
      syncListeners.push(unsubAnggota);

      // 6. Absen Pelatih
      const unsubAbsenPelatih = onSnapshot(collection(db, COLLECTIONS.ABSEN_PELATIH), snapshot => {
        if (!snapshot.empty) {
          const list: AbsenPelatihItem[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as AbsenPelatihItem));
          // Sort newest first
          list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
          localStorage.setItem('fmb_absen_pelatih_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('AbsenPelatih listener error:', err));
      syncListeners.push(unsubAbsenPelatih);

      // 7. Events
      const unsubEvents = onSnapshot(collection(db, COLLECTIONS.EVENTS), snapshot => {
        if (!snapshot.empty) {
          const list: EventLog[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as EventLog));
          list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
          localStorage.setItem('fmb_events_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('Events listener error:', err));
      syncListeners.push(unsubEvents);

      // 8. Absen Siswa
      const unsubAbsenSiswa = onSnapshot(collection(db, COLLECTIONS.ABSEN_SISWA), snapshot => {
        if (!snapshot.empty) {
          const list: AbsenSiswaEntry[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as AbsenSiswaEntry));
          localStorage.setItem('fmb_absen_siswa_v1', JSON.stringify(list));
          onDataUpdate?.();
        }
      }, err => console.warn('AbsenSiswa listener error:', err));
      syncListeners.push(unsubAbsenSiswa);

      // 9. Settings
      const unsubSettings = onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'app_config'), docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.activeTahunAjaran) {
            localStorage.setItem('fmb_active_tahun_ajaran_v1', JSON.stringify(data.activeTahunAjaran));
          }
          if (Array.isArray(data.tahunAjaranList)) {
            localStorage.setItem('fmb_tahun_ajaran_list_v1', JSON.stringify(data.tahunAjaranList));
          }
          onDataUpdate?.();
        }
      }, err => console.warn('Settings listener error:', err));
      syncListeners.push(unsubSettings);

      updateSyncStatus('connected');
    } catch (error) {
      console.error('Firebase sync init failed:', error);
      updateSyncStatus('error');
    }
  },

  // Push individual items to Firestore
  saveUser: async (user: User) => {
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), user);
    } catch (e) {
      console.warn('Failed to save user to Firebase:', e);
    }
  },

  deleteUser: async (userId: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    } catch (e) {
      console.warn('Failed to delete user from Firebase:', e);
    }
  },

  saveSekolah: async (sekolah: Sekolah) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SEKOLAH, sekolah.id), sekolah);
    } catch (e) {
      console.warn('Failed to save sekolah to Firebase:', e);
    }
  },

  deleteSekolah: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.SEKOLAH, id));
    } catch (e) {
      console.warn('Failed to delete sekolah from Firebase:', e);
    }
  },

  saveDivisi: async (divisi: Divisi) => {
    try {
      await setDoc(doc(db, COLLECTIONS.DIVISI, divisi.id), divisi);
    } catch (e) {
      console.warn('Failed to save divisi to Firebase:', e);
    }
  },

  deleteDivisi: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DIVISI, id));
    } catch (e) {
      console.warn('Failed to delete divisi from Firebase:', e);
    }
  },

  saveJadwal: async (jadwal: JadwalLatihan) => {
    try {
      await setDoc(doc(db, COLLECTIONS.JADWAL, jadwal.id), jadwal);
    } catch (e) {
      console.warn('Failed to save jadwal to Firebase:', e);
    }
  },

  deleteJadwal: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.JADWAL, id));
    } catch (e) {
      console.warn('Failed to delete jadwal from Firebase:', e);
    }
  },

  saveAnggota: async (anggota: Anggota) => {
    try {
      await setDoc(doc(db, COLLECTIONS.ANGGOTA, anggota.id), anggota);
    } catch (e) {
      console.warn('Failed to save anggota to Firebase:', e);
    }
  },

  deleteAnggota: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ANGGOTA, id));
    } catch (e) {
      console.warn('Failed to delete anggota from Firebase:', e);
    }
  },

  saveAbsenPelatih: async (item: AbsenPelatihItem) => {
    try {
      await setDoc(doc(db, COLLECTIONS.ABSEN_PELATIH, item.id), item);
    } catch (e) {
      console.warn('Failed to save absenPelatih to Firebase:', e);
    }
  },

  deleteAbsenPelatih: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ABSEN_PELATIH, id));
    } catch (e) {
      console.warn('Failed to delete absenPelatih from Firebase:', e);
    }
  },

  saveEvent: async (evt: EventLog) => {
    try {
      await setDoc(doc(db, COLLECTIONS.EVENTS, evt.id), evt);
    } catch (e) {
      console.warn('Failed to save event to Firebase:', e);
    }
  },

  deleteEvent: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EVENTS, id));
    } catch (e) {
      console.warn('Failed to delete event from Firebase:', e);
    }
  },

  saveAbsenSiswa: async (entry: AbsenSiswaEntry) => {
    try {
      await setDoc(doc(db, COLLECTIONS.ABSEN_SISWA, entry.id), entry);
    } catch (e) {
      console.warn('Failed to save absenSiswa to Firebase:', e);
    }
  },

  saveSettings: async (settings: { activeTahunAjaran?: string; tahunAjaranList?: string[] }) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'app_config'), settings, { merge: true });
    } catch (e) {
      console.warn('Failed to save settings to Firebase:', e);
    }
  },

  // Bulk push local data into Firebase Firestore
  pushAllLocalToFirebase: async () => {
    try {
      updateSyncStatus('syncing');
      const batch = writeBatch(db);

      const users = StorageService.getUsers().length > 0 ? StorageService.getUsers() : INITIAL_USERS;
      users.forEach(u => batch.set(doc(db, COLLECTIONS.USERS, u.id), u));

      const sekolah = StorageService.getSekolah().length > 0 ? StorageService.getSekolah() : INITIAL_SEKOLAH;
      sekolah.forEach(s => batch.set(doc(db, COLLECTIONS.SEKOLAH, s.id), s));

      const divisi = StorageService.getDivisi().length > 0 ? StorageService.getDivisi() : INITIAL_DIVISI;
      divisi.forEach(d => batch.set(doc(db, COLLECTIONS.DIVISI, d.id), d));

      const jadwal = StorageService.getJadwal().length > 0 ? StorageService.getJadwal() : INITIAL_JADWAL;
      jadwal.forEach(j => batch.set(doc(db, COLLECTIONS.JADWAL, j.id), j));

      const anggota = StorageService.getAnggota().length > 0 ? StorageService.getAnggota() : INITIAL_ANGGOTA;
      anggota.forEach(a => batch.set(doc(db, COLLECTIONS.ANGGOTA, a.id), a));

      const absenPelatih = StorageService.getAbsenPelatih().length > 0 ? StorageService.getAbsenPelatih() : INITIAL_ABSEN_PELATIH;
      absenPelatih.forEach(ap => batch.set(doc(db, COLLECTIONS.ABSEN_PELATIH, ap.id), ap));

      const events = StorageService.getEvents().length > 0 ? StorageService.getEvents() : INITIAL_EVENTS;
      events.forEach(ev => batch.set(doc(db, COLLECTIONS.EVENTS, ev.id), ev));

      const absenSiswa = StorageService.getAbsenSiswa().length > 0 ? StorageService.getAbsenSiswa() : INITIAL_ABSEN_SISWA;
      absenSiswa.forEach(as => batch.set(doc(db, COLLECTIONS.ABSEN_SISWA, as.id), as));

      batch.set(doc(db, COLLECTIONS.SETTINGS, 'app_config'), {
        activeTahunAjaran: StorageService.getActiveTahunAjaran(),
        tahunAjaranList: StorageService.getTahunAjaranList(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();
      updateSyncStatus('connected');
      console.log('Local data successfully pushed to Firebase Firestore!');
      return true;
    } catch (err) {
      console.error('Error pushing data to Firebase Firestore:', err);
      updateSyncStatus('error');
      return false;
    }
  }
};
