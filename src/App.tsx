import React, { useState, useEffect, useCallback } from 'react';
import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, AbsenSiswaEntry, EventLog } from './types';
import { StorageService } from './data/storage';
import { FirebaseSync, SyncStatus, onSyncStatusChange } from './data/firebaseSync';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PelatihDashboard } from './components/PelatihDashboard';
import { QrScannerModal } from './components/QrScannerModal';
import { TahunAjaranModal } from './components/TahunAjaranModal';
import { OfflineBanner } from './components/OfflineBanner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedSekolahId, setSelectedSekolahId] = useState<string>('');

  const [usersList, setUsersList] = useState<User[]>([]);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [jadwalList, setJadwalList] = useState<JadwalLatihan[]>([]);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [absenPelatihList, setAbsenPelatihList] = useState<AbsenPelatihItem[]>([]);
  const [absenSiswaList, setAbsenSiswaList] = useState<AbsenSiswaEntry[]>([]);
  const [eventsList, setEventsList] = useState<EventLog[]>([]);

  const [activeTahunAjaran, setActiveTahunAjaran] = useState<string>('2024/2025');
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
  const [isTahunAjaranModalOpen, setIsTahunAjaranModalOpen] = useState(false);

  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  const loadAllData = useCallback(() => {
    const user = StorageService.getCurrentUser();
    setCurrentUser(user);

    const users = StorageService.getUsers();
    setUsersList(users);

    const sekolah = StorageService.getSekolah();
    setSekolahList(sekolah);

    const visibleSekolah = user && user.role === 'pelatih'
      ? sekolah.filter(s => s.pelatihId === user.id)
      : sekolah;

    const selectedSch = StorageService.getSelectedSekolahId();
    if (user && user.role === 'pelatih') {
      const isValid = visibleSekolah.some(s => s.id === selectedSch);
      if (!isValid && visibleSekolah.length > 0) {
        setSelectedSekolahId(visibleSekolah[0].id);
        StorageService.setSelectedSekolahId(visibleSekolah[0].id);
      } else if (visibleSekolah.length === 0) {
        setSelectedSekolahId('');
      } else {
        setSelectedSekolahId(selectedSch);
      }
    } else {
      setSelectedSekolahId(selectedSch || (sekolah.length > 0 ? sekolah[0].id : ''));
    }

    setDivisiList(StorageService.getDivisi());
    setJadwalList(StorageService.getJadwal());
    setAnggotaList(StorageService.getAnggota());
    setAbsenPelatihList(StorageService.getAbsenPelatih());
    setAbsenSiswaList(StorageService.getAbsenSiswa());
    setEventsList(StorageService.getEvents());

    setActiveTahunAjaran(StorageService.getActiveTahunAjaran());
    setTahunAjaranList(StorageService.getTahunAjaranList());
  }, []);

  // Initialize and load state + Firebase real-time sync
  useEffect(() => {
    loadAllData();
    const unsubStatus = onSyncStatusChange(setSyncStatus);
    FirebaseSync.init(loadAllData);
    return () => {
      unsubStatus();
    };
  }, [loadAllData]);

  const handleSelectSekolah = (id: string) => {
    setSelectedSekolahId(id);
    StorageService.setSelectedSekolahId(id);
  };

  const handleSelectTahunAjaran = (tahun: string) => {
    StorageService.setActiveTahunAjaran(tahun);
    loadAllData();
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleResetData = () => {
    if (confirm('Reset seluruh data ke pengaturan demo awal?')) {
      StorageService.resetToDefaults();
      loadAllData();
    }
  };

  const handleQrScanSuccess = (student: Anggota, columnNumber: number, monthName?: string) => {
    // Record attendance entry with student's digital signature for column 1 to 5
    const activeBulan = monthName || 'Agustus';
    const newEntry: AbsenSiswaEntry = {
      id: `abs-${student.id}-${activeBulan}-${columnNumber}-${Date.now()}`,
      sekolahId: student.sekolahId,
      anggotaId: student.id,
      bulan: activeBulan,
      tahunAjaran: StorageService.getActiveTahunAjaran(),
      kolomIndex: columnNumber,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'Hadir',
      signatureUrl: student.signatureUrl
    };

    StorageService.saveAbsenSiswa(newEntry);
    loadAllData();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <OfflineBanner />
        <LoginView onLoginSuccess={(u) => { setCurrentUser(u); loadAllData(); }} />
      </div>
    );
  }

  // Filter school list based on user role: pelatih only sees their own schools
  const displayedSekolahList = currentUser.role === 'pelatih'
    ? sekolahList.filter(s => s.pelatihId === currentUser.id)
    : sekolahList;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        sekolahList={displayedSekolahList}
        selectedSekolahId={selectedSekolahId}
        onSelectSekolah={handleSelectSekolah}
        activeTahunAjaran={activeTahunAjaran}
        tahunAjaranList={tahunAjaranList}
        onSelectTahunAjaran={handleSelectTahunAjaran}
        onOpenManageTahunAjaran={() => setIsTahunAjaranModalOpen(true)}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
        onLogout={handleLogout}
        onRefreshData={handleResetData}
        syncStatus={syncStatus}
        onManualSync={async () => {
          await FirebaseSync.pushAllLocalToFirebase();
          loadAllData();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {currentUser.role === 'admin' ? (
          <AdminDashboard
            usersList={usersList}
            sekolahList={sekolahList}
            absenPelatihList={absenPelatihList}
            anggotaList={anggotaList}
            divisiList={divisiList}
            absenSiswaList={absenSiswaList}
            eventsList={eventsList}
            activeTahunAjaran={activeTahunAjaran}
            onOpenManageTahunAjaran={() => setIsTahunAjaranModalOpen(true)}
            onDataChanged={loadAllData}
          />
        ) : (
          <PelatihDashboard
            currentUser={currentUser}
            sekolahList={displayedSekolahList}
            selectedSekolahId={selectedSekolahId}
            onSelectSekolah={handleSelectSekolah}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onDataChanged={loadAllData}
            divisiList={divisiList}
            jadwalList={jadwalList}
            anggotaList={anggotaList}
            absenPelatihList={absenPelatihList}
            absenSiswaList={absenSiswaList}
            eventsList={eventsList}
            activeTahunAjaran={activeTahunAjaran}
            onOpenManageTahunAjaran={() => setIsTahunAjaranModalOpen(true)}
          />
        )}
      </main>

      {/* Global QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        selectedSekolahId={selectedSekolahId}
        onScanSuccess={handleQrScanSuccess}
      />

      {/* Academic Year Management Modal */}
      <TahunAjaranModal
        isOpen={isTahunAjaranModalOpen}
        onClose={() => setIsTahunAjaranModalOpen(false)}
        activeTahunAjaran={activeTahunAjaran}
        tahunAjaranList={tahunAjaranList}
        sekolahList={sekolahList}
        absenSiswaList={absenSiswaList}
        absenPelatihList={absenPelatihList}
        onSelectActive={handleSelectTahunAjaran}
        onDataChanged={loadAllData}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center text-xs py-3 border-t border-slate-800 mt-auto">
        <p>Aplikasi Absensi Forum Ekstrakurikuler Marching Band — Sistem QR & PDF Rekapitulasi Laporan</p>
      </footer>
    </div>
  );
}
