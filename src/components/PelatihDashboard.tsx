import React, { useState } from 'react';
import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, AbsenAsistenPelatihItem, AbsenSiswaEntry, EventLog, isSchoolCoach, getSchoolCoachIds } from '../types';
import { DivisiManager } from './DivisiManager';
import { JadwalManager } from './JadwalManager';
import { AbsenPelatih } from './AbsenPelatih';
import { AnggotaManager } from './AnggotaManager';
import { RekapPdf } from './RekapPdf';
import { DokumentasiGaleri } from './DokumentasiGaleri';
import { StatistikKehadiran } from './StatistikKehadiran';
import { EventManager } from './EventManager';
import { PenilaianAnggota } from './PenilaianAnggota';
import { TrainingReminderBanner } from './TrainingReminderBanner';
import { StorageService } from '../data/storage';
import { formatIndonesianDate, getLocalDateString } from '../utils/dateUtils';
import {
  School,
  Layers,
  Clock,
  Camera,
  Users,
  FileText,
  QrCode,
  Calendar,
  ArrowRight,
  BarChart3,
  Award,
  Sparkles
} from 'lucide-react';

interface PelatihDashboardProps {
  currentUser: User;
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  onOpenQrScanner: (jadwalId?: string) => void;
  onDataChanged: () => void;
  usersList?: User[];
  divisiList: Divisi[];
  jadwalList: JadwalLatihan[];
  anggotaList: Anggota[];
  absenPelatihList: AbsenPelatihItem[];
  absenAsistenList?: AbsenAsistenPelatihItem[];
  absenSiswaList: AbsenSiswaEntry[];
  eventsList: EventLog[];
  activeTahunAjaran?: string;
  onOpenManageTahunAjaran?: () => void;
}

type PelatihTab =
  | 'beranda'
  | 'anggota'
  | 'jadwal'
  | 'absen_pelatih'
  | 'penilaian'
  | 'rekap_pdf'
  | 'divisi'
  | 'statistik'
  | 'event'
  | 'galeri_foto';

export const PelatihDashboard: React.FC<PelatihDashboardProps> = ({
  currentUser,
  sekolahList,
  selectedSekolahId,
  onSelectSekolah,
  onOpenQrScanner,
  onDataChanged,
  usersList,
  divisiList,
  jadwalList,
  anggotaList,
  absenPelatihList,
  absenAsistenList,
  absenSiswaList,
  eventsList,
  activeTahunAjaran = '2024/2025'
}) => {
  const [activeTab, setActiveTab] = useState<PelatihTab>('beranda');

  const userSekolahList = sekolahList.filter(s => isSchoolCoach(s, currentUser.id));
  const activeSchool = userSekolahList.find(s => s.id === selectedSekolahId) || userSekolahList[0];
  const pelatihSchoolIds = userSekolahList.map(s => s.id);
  const userDivisiList = divisiList.filter(d => d.pelatihId === currentUser.id || (d.sekolahId && pelatihSchoolIds.includes(d.sekolahId)));

  const userAnggotaList = anggotaList.filter(a => a.pelatihId === currentUser.id || pelatihSchoolIds.includes(a.sekolahId));
  const userJadwalList = jadwalList.filter(j => j.pelatihId === currentUser.id || pelatihSchoolIds.includes(j.sekolahId));
  const userAbsenPelatihList = absenPelatihList.filter(a => pelatihSchoolIds.includes(a.sekolahId));
  const userAbsenSiswaList = absenSiswaList.filter(a => pelatihSchoolIds.includes(a.sekolahId));
  const userEventsList = eventsList.filter(e => pelatihSchoolIds.includes(e.sekolahId));

  const schoolAnggota = userAnggotaList.filter(a => a.sekolahId === selectedSekolahId);
  const schoolJadwal = userJadwalList.filter(j => j.sekolahId === selectedSekolahId);
  const schoolAbsenPelatih = userAbsenPelatihList.filter(a => a.sekolahId === selectedSekolahId);

  const allUsers = usersList && usersList.length > 0 ? usersList : StorageService.getUsers();
  const activeCoachIds = activeSchool ? getSchoolCoachIds(activeSchool) : [];
  const activeSchoolCoaches = allUsers.filter(u => activeCoachIds.includes(u.id));
  const todayStr = getLocalDateString();

  const sortedSchoolJadwal = [...schoolJadwal].sort((a, b) => {
    const aPast = a.tanggal ? a.tanggal < todayStr : false;
    const bPast = b.tanggal ? b.tanggal < todayStr : false;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return (a.tanggal || '').localeCompare(b.tanggal || '') || a.jamMulai.localeCompare(b.jamMulai);
  });

  if (userSekolahList.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
          <School className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Belum Ada Sekolah Ditugaskan</h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Akun <strong>{currentUser.name}</strong> belum ditugaskan ke sekolah binaan. Hubungi Administrator untuk penugasan sekolah.
        </p>
      </div>
    );
  }

  const navItems: { id: PelatihTab; label: string; icon: React.ReactNode }[] = [
    { id: 'beranda', label: 'Beranda', icon: <School className="w-3.5 h-3.5" /> },
    { id: 'jadwal', label: `Jadwal (${schoolJadwal.length})`, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'anggota', label: `Anggota (${schoolAnggota.length})`, icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'absen_pelatih', label: `Jurnal (${schoolAbsenPelatih.length})`, icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'penilaian', label: 'Nilai', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'rekap_pdf', label: 'Laporan', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'divisi', label: 'Divisi', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'statistik', label: 'Statistik', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'event', label: 'Event', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'galeri_foto', label: 'Galeri', icon: <Camera className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="space-y-4">
      <TrainingReminderBanner
        currentUser={currentUser}
        jadwalList={userJadwalList}
        sekolahList={userSekolahList}
        selectedSekolahId={selectedSekolahId}
        onSelectSekolah={onSelectSekolah}
        onOpenQrScanner={onOpenQrScanner}
        onNavigateToJadwal={() => setActiveTab('jadwal')}
      />

      {/* Clean Single-Surface Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 pt-3.5 pb-2 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {activeSchool?.namaSekolah}
            </h2>
            <p className="text-xs text-slate-500">
              {currentUser.name} • TA {activeTahunAjaran}
              {activeSchoolCoaches.length > 1 && (
                <span> • Tim: {activeSchoolCoaches.map(c => c.name.split(' ')[0]).join(', ')}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenQrScanner()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Absen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('absen_pelatih')}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Isi Jurnal</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Select */}
        <div className="lg:hidden pb-1">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as PelatihTab)}
            className="w-full bg-slate-50 font-semibold text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {navItems.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Clean Tab Strip */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-2">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BERANDA */}
      {activeTab === 'beranda' && (
        <div className="space-y-4">
          {/* Compact Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('anggota')}
              className="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
            >
              <span className="text-xs text-slate-500 font-medium block">Anggota Aktif</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{schoolAnggota.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jadwal')}
              className="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
            >
              <span className="text-xs text-slate-500 font-medium block">Sesi Terjadwal</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{schoolJadwal.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('absen_pelatih')}
              className="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
            >
              <span className="text-xs text-slate-500 font-medium block">Jurnal Terisi</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{schoolAbsenPelatih.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rekap_pdf')}
              className="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
            >
              <span className="text-xs text-slate-500 font-medium block">Laporan & Cetak</span>
              <p className="text-sm font-bold text-blue-700 mt-2 flex items-center gap-1">
                <span>Buka Rekap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </p>
            </button>
          </div>

          {/* Scheduled Sessions Preview */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Jadwal Sesi Latihan</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('jadwal')}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                Kelola Jadwal
              </button>
            </div>

            {sortedSchoolJadwal.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Belum ada sesi latihan terjadwal. Klik <button type="button" onClick={() => setActiveTab('jadwal')} className="text-blue-600 font-semibold hover:underline cursor-pointer">Kelola Jadwal</button> untuk menambahkan tanggal dan jam latihan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {sortedSchoolJadwal.slice(0, 6).map((j) => {
                  const linkedCount = new Set(
                    userAbsenSiswaList
                      .filter(a => a.sekolahId === j.sekolahId && a.status === 'Hadir' && (a.jadwalId === j.id || (j.tanggal && a.tanggal === j.tanggal)))
                      .map(a => a.anggotaId)
                  ).size;

                  return (
                    <div key={j.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {j.tanggal ? formatIndonesianDate(j.tanggal) : `Hari ${j.hari}`}
                        </span>
                        <span className="text-xs text-slate-600 tabular-nums block">
                          {j.jamMulai} - {j.jamSelesai} • {linkedCount} hadir
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenQrScanner(j.id)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer"
                      >
                        Scan
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Member Preview */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Anggota ({schoolAnggota.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('anggota')}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {schoolAnggota.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Belum ada anggota terdaftar untuk sekolah ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {schoolAnggota.slice(0, 6).map((student) => (
                  <div key={student.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{student.nama}</p>
                      <p className="text-[11px] text-slate-500 truncate">{student.kelas} • {student.divisiNama}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'statistik' && (
        <StatistikKehadiran
          sekolahList={userSekolahList}
          divisiList={userDivisiList}
          anggotaList={userAnggotaList}
          absenSiswaList={userAbsenSiswaList}
          absenPelatihList={userAbsenPelatihList}
          selectedSekolahId={selectedSekolahId}
          onSelectSekolah={onSelectSekolah}
        />
      )}

      {activeTab === 'divisi' && (
        <DivisiManager
          currentPelatihId={currentUser.id}
          divisiList={userDivisiList}
          onDataChanged={onDataChanged}
        />
      )}

      {activeTab === 'jadwal' && (
        <JadwalManager
          currentPelatihId={currentUser.id}
          selectedSekolahId={selectedSekolahId}
          sekolahList={userSekolahList}
          jadwalList={userJadwalList}
          absenSiswaList={userAbsenSiswaList}
          absenPelatihList={userAbsenPelatihList}
          onOpenQrScanner={onOpenQrScanner}
          onDataChanged={onDataChanged}
        />
      )}

      {activeTab === 'absen_pelatih' && (
        <AbsenPelatih
          currentPelatihId={currentUser.id}
          currentPelatihName={currentUser.name}
          selectedSekolahId={selectedSekolahId}
          sekolahList={userSekolahList}
          usersList={allUsers}
          jadwalList={userJadwalList}
          absenPelatihList={userAbsenPelatihList}
          onDataChanged={onDataChanged}
        />
      )}

      {activeTab === 'galeri_foto' && (
        <DokumentasiGaleri
          absenPelatihList={userAbsenPelatihList}
          eventsList={userEventsList}
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          onSelectSekolah={onSelectSekolah}
        />
      )}

      {activeTab === 'anggota' && (
        <AnggotaManager
          currentPelatihId={currentUser.id}
          selectedSekolahId={selectedSekolahId}
          sekolahList={userSekolahList}
          divisiList={userDivisiList}
          anggotaList={userAnggotaList}
          onDataChanged={onDataChanged}
        />
      )}

      {activeTab === 'event' && (
        <EventManager
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          onSelectSekolah={onSelectSekolah}
          eventsList={userEventsList}
          currentUser={currentUser}
          onDataChanged={onDataChanged}
          activeTahunAjaran={activeTahunAjaran}
        />
      )}

      {activeTab === 'penilaian' && (
        <PenilaianAnggota
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          anggotaList={userAnggotaList}
          absenSiswaList={userAbsenSiswaList}
          absenPelatihList={userAbsenPelatihList}
          usersList={allUsers}
        />
      )}

      {activeTab === 'rekap_pdf' && (
        <RekapPdf
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          absenPelatihList={userAbsenPelatihList}
          absenAsistenList={absenAsistenList}
          usersList={allUsers}
          anggotaList={userAnggotaList}
          absenSiswaList={userAbsenSiswaList}
          eventsList={userEventsList}
          activeTahunAjaran={activeTahunAjaran}
        />
      )}
    </div>
  );
};
