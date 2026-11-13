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
  AbsenAsistenPelatihItem,
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
  INITIAL_ABSEN_ASISTEN,
  INITIAL_EVENTS,
  INITIAL_ABSEN_SISWA
} from './initialData';
import { StorageService, STORAGE_KEYS, setStoredItem } from './storage';

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  SEKOLAH: 'sekolah',
  DIVISI: 'divisi',
  JADWAL: 'jadwal',
  ANGGOTA: 'anggota',
  ABSEN_PELATIH: 'absenPelatih',
  ABSEN_ASISTEN: 'absenAsisten',
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

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as T;
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
          setStoredItem(STORAGE_KEYS.USERS, users);
          onDataUpdate?.();
        }
      }, err => console.warn('Users listener error:', err));
      syncListeners.push(unsubUsers);

      // 2. Sekolah
      const unsubSekolah = onSnapshot(collection(db, COLLECTIONS.SEKOLAH), snapshot => {
        const list: Sekolah[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Sekolah));
        setStoredItem(STORAGE_KEYS.SEKOLAH, list);
        onDataUpdate?.();
      }, err => console.warn('Sekolah listener error:', err));
      syncListeners.push(unsubSekolah);

      // 3. Divisi
      const unsubDivisi = onSnapshot(collection(db, COLLECTIONS.DIVISI), snapshot => {
        const list: Divisi[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Divisi));
        setStoredItem(STORAGE_KEYS.DIVISI, list);
        onDataUpdate?.();
      }, err => console.warn('Divisi listener error:', err));
      syncListeners.push(unsubDivisi);

      // 4. Jadwal
      const unsubJadwal = onSnapshot(collection(db, COLLECTIONS.JADWAL), snapshot => {
        const list: JadwalLatihan[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as JadwalLatihan));
        setStoredItem(STORAGE_KEYS.JADWAL, list);
        onDataUpdate?.();
      }, err => console.warn('Jadwal listener error:', err));
      syncListeners.push(unsubJadwal);

      // 5. Anggota
      const unsubAnggota = onSnapshot(collection(db, COLLECTIONS.ANGGOTA), snapshot => {
        const list: Anggota[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as Anggota));
        setStoredItem(STORAGE_KEYS.ANGGOTA, list);
        onDataUpdate?.();
      }, err => console.warn('Anggota listener error:', err));
      syncListeners.push(unsubAnggota);

      // 6. Absen Pelatih
      const unsubAbsenPelatih = onSnapshot(collection(db, COLLECTIONS.ABSEN_PELATIH), snapshot => {
        const list: AbsenPelatihItem[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as AbsenPelatihItem));
        // Sort newest first
        list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
        setStoredItem(STORAGE_KEYS.ABSEN_PELATIH, list);
        onDataUpdate?.();
      }, err => console.warn('AbsenPelatih listener error:', err));
      syncListeners.push(unsubAbsenPelatih);

      // 6b. Absen Asisten Pelatih
      const unsubAbsenAsisten = onSnapshot(collection(db, COLLECTIONS.ABSEN_ASISTEN), snapshot => {
        const list: AbsenAsistenPelatihItem[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as AbsenAsistenPelatihItem));
        list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
        setStoredItem(STORAGE_KEYS.ABSEN_ASISTEN, list);
        onDataUpdate?.();
      }, err => console.warn('AbsenAsisten listener error:', err));
      syncListeners.push(unsubAbsenAsisten);

      // 7. Events
      const unsubEvents = onSnapshot(collection(db, COLLECTIONS.EVENTS), snapshot => {
        const list: EventLog[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as EventLog));
        list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
        setStoredItem(STORAGE_KEYS.EVENTS, list);
        onDataUpdate?.();
      }, err => console.warn('Events listener error:', err));
      syncListeners.push(unsubEvents);

      // 8. Absen Siswa
      const unsubAbsenSiswa = onSnapshot(collection(db, COLLECTIONS.ABSEN_SISWA), snapshot => {
        const list: AbsenSiswaEntry[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as AbsenSiswaEntry));
        setStoredItem(STORAGE_KEYS.ABSEN_SISWA, list);
        onDataUpdate?.();
      }, err => console.warn('AbsenSiswa listener error:', err));
      syncListeners.push(unsubAbsenSiswa);

      // 9. Settings
      const unsubSettings = onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'app_config'), docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.activeTahunAjaran) {
            setStoredItem(STORAGE_KEYS.ACTIVE_TAHUN_AJARAN, data.activeTahunAjaran);
          }
          if (Array.isArray(data.tahunAjaranList)) {
            setStoredItem(STORAGE_KEYS.TAHUN_AJARAN_LIST, data.tahunAjaranList);
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
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), stripUndefined(user));
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
      await setDoc(doc(db, COLLECTIONS.SEKOLAH, sekolah.id), stripUndefined(sekolah));
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

  deleteSekolahWithCascade: async (
    sekolahId: string,
    related: {
      anggotaIds: string[];
      jadwalIds: string[];
      absenPelatihIds: string[];
      absenAsistenIds: string[];
      eventIds: string[];
      absenSiswaIds: string[];
    }
  ) => {
    try {
      const targets: Array<{ col: string; id: string }> = [
        { col: COLLECTIONS.SEKOLAH, id: sekolahId },
        ...related.anggotaIds.map(id => ({ col: COLLECTIONS.ANGGOTA, id })),
        ...related.jadwalIds.map(id => ({ col: COLLECTIONS.JADWAL, id })),
        ...related.absenPelatihIds.map(id => ({ col: COLLECTIONS.ABSEN_PELATIH, id })),
        ...related.absenAsistenIds.map(id => ({ col: COLLECTIONS.ABSEN_ASISTEN, id })),
        ...related.eventIds.map(id => ({ col: COLLECTIONS.EVENTS, id })),
        ...related.absenSiswaIds.map(id => ({ col: COLLECTIONS.ABSEN_SISWA, id }))
      ];

      const CHUNK_SIZE = 400;
      for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.delete(doc(db, item.col, item.id));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Failed to cascade delete sekolah from Firebase:', e);
    }
  },

  saveDivisi: async (divisi: Divisi) => {
    try {
      await setDoc(doc(db, COLLECTIONS.DIVISI, divisi.id), stripUndefined(divisi));
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
      await setDoc(doc(db, COLLECTIONS.JADWAL, jadwal.id), stripUndefined(jadwal));
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
      await setDoc(doc(db, COLLECTIONS.ANGGOTA, anggota.id), stripUndefined(anggota));
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
      await setDoc(doc(db, COLLECTIONS.ABSEN_PELATIH, item.id), stripUndefined(item));
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

  saveAbsenAsisten: async (item: AbsenAsistenPelatihItem) => {
    try {
      await setDoc(doc(db, COLLECTIONS.ABSEN_ASISTEN, item.id), stripUndefined(item));
    } catch (e) {
      console.warn('Failed to save absenAsisten to Firebase:', e);
    }
  },

  deleteAbsenAsisten: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ABSEN_ASISTEN, id));
    } catch (e) {
      console.warn('Failed to delete absenAsisten from Firebase:', e);
    }
  },

  saveEvent: async (evt: EventLog) => {
    try {
      await setDoc(doc(db, COLLECTIONS.EVENTS, evt.id), stripUndefined(evt));
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
      await setDoc(doc(db, COLLECTIONS.ABSEN_SISWA, entry.id), stripUndefined(entry));
    } catch (e) {
      console.warn('Failed to save absenSiswa to Firebase:', e);
    }
  },

  deleteAbsenSiswa: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ABSEN_SISWA, id));
    } catch (e) {
      console.warn('Failed to delete absenSiswa from Firebase:', e);
    }
  },

  deleteMultipleAbsenSiswa: async (ids: string[]) => {
    try {
      if (ids.length === 0) return;
      const CHUNK_SIZE = 400;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, COLLECTIONS.ABSEN_SISWA, id));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Failed to delete multiple absenSiswa from Firebase:', e);
    }
  },

  saveSettings: async (settings: { activeTahunAjaran?: string; tahunAjaranList?: string[] }) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'app_config'), settings, { merge: true });
    } catch (e) {
      console.warn('Failed to save settings to Firebase:', e);
    }
  },

  // Bulk push local data into Firebase Firestore (chunked by op count & payload size)
  pushAllLocalToFirebase: async () => {
    try {
      updateSyncStatus('syncing');

      const pendingOps: Array<{ col: string; id: string; data: Record<string, any>; merge?: boolean }> = [];

      const enqueue = (col: string, items: Array<{ id: string } & Record<string, any>>) => {
        items.forEach(item => {
          pendingOps.push({ col, id: item.id, data: stripUndefined(item) });
        });
      };

      const users = StorageService.getUsers().length > 0 ? StorageService.getUsers() : INITIAL_USERS;
      enqueue(COLLECTIONS.USERS, users);

      const sekolah = StorageService.getSekolah().length > 0 ? StorageService.getSekolah() : INITIAL_SEKOLAH;
      enqueue(COLLECTIONS.SEKOLAH, sekolah);

      const divisi = StorageService.getDivisi().length > 0 ? StorageService.getDivisi() : INITIAL_DIVISI;
      enqueue(COLLECTIONS.DIVISI, divisi);

      const jadwal = StorageService.getJadwal().length > 0 ? StorageService.getJadwal() : INITIAL_JADWAL;
      enqueue(COLLECTIONS.JADWAL, jadwal);

      const anggota = StorageService.getAnggota().length > 0 ? StorageService.getAnggota() : INITIAL_ANGGOTA;
      enqueue(COLLECTIONS.ANGGOTA, anggota);

      const absenPelatih = StorageService.getAbsenPelatih().length > 0 ? StorageService.getAbsenPelatih() : INITIAL_ABSEN_PELATIH;
      enqueue(COLLECTIONS.ABSEN_PELATIH, absenPelatih);

      const absenAsisten = StorageService.getAbsenAsisten().length > 0 ? StorageService.getAbsenAsisten() : INITIAL_ABSEN_ASISTEN;
      enqueue(COLLECTIONS.ABSEN_ASISTEN, absenAsisten);

      const events = StorageService.getEvents().length > 0 ? StorageService.getEvents() : INITIAL_EVENTS;
      enqueue(COLLECTIONS.EVENTS, events);

      const absenSiswa = StorageService.getAbsenSiswa().length > 0 ? StorageService.getAbsenSiswa() : INITIAL_ABSEN_SISWA;
      enqueue(COLLECTIONS.ABSEN_SISWA, absenSiswa);

      pendingOps.push({
        col: COLLECTIONS.SETTINGS,
        id: 'app_config',
        data: {
          activeTahunAjaran: StorageService.getActiveTahunAjaran(),
          tahunAjaranList: StorageService.getTahunAjaranList(),
          updatedAt: new Date().toISOString()
        },
        merge: true
      });

      let batch = writeBatch(db);
      let opCount = 0;
      let approxBytes = 0;

      for (const op of pendingOps) {
        const serializedSize = JSON.stringify(op.data).length;
        if (opCount >= 150 || (opCount > 0 && approxBytes + serializedSize > 3_500_000)) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
          approxBytes = 0;
        }
        const ref = doc(db, op.col, op.id);
        if (op.merge) {
          batch.set(ref, op.data, { merge: true });
        } else {
          batch.set(ref, op.data);
        }
        opCount++;
        approxBytes += serializedSize;
      }

      if (opCount > 0) {
        await batch.commit();
      }

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
