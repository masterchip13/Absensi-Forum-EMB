import React, { useState } from 'react';
import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, AbsenSiswaEntry, EventLog, isSchoolCoach, getSchoolCoachIds } from '../types';
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
import { 
  School, 
  Layers, 
  Clock, 
  Camera, 
  Users, 
  FileText, 
  QrCode, 
  Bell, 
  Plus, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Award, 
  ChevronDown, 
  UserCheck, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface PelatihDashboardProps {
  currentUser: User;
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah: (id: string) => void;
  onOpenQrScanner: () => void;
  onDataChanged: () => void;
  divisiList: Divisi[];
  jadwalList: JadwalLatihan[];
  anggotaList: Anggota[];
  absenPelatihList: AbsenPelatihItem[];
  absenSiswaList: AbsenSiswaEntry[];
  eventsList: EventLog[];
  activeTahunAjaran?: string;
  onOpenManageTahunAjaran?: () => void;
}

export const PelatihDashboard: React.FC<PelatihDashboardProps> = ({
  currentUser,
  sekolahList,
  selectedSekolahId,
  onSelectSekolah,
  onOpenQrScanner,
  onDataChanged,
  divisiList,
  jadwalList,
  anggotaList,
  absenPelatihList,
  absenSiswaList,
  eventsList,
  activeTahunAjaran = '2024/2025',
  onOpenManageTahunAjaran
}) => {
  const [activeTab, setActiveTab] = useState<'beranda' | 'anggota' | 'absen_pelatih' | 'penilaian' | 'rekap_pdf' | 'jadwal' | 'divisi' | 'statistik' | 'event' | 'galeri_foto'>('beranda');
  const [selectedJadwalForAttendance, setSelectedJadwalForAttendance] = useState<string | undefined>(undefined);

  const handleStartAttendanceFromJadwal = (jadwal: JadwalLatihan) => {
    if (jadwal.sekolahId) {
      onSelectSekolah(jadwal.sekolahId);
    }
    setSelectedJadwalForAttendance(jadwal.id);
    setActiveTab('absen_pelatih');
  };

  // RBAC Constraint: Coach ONLY manages their assigned or collaborative schools
  const userSekolahList = sekolahList.filter(s => isSchoolCoach(s, currentUser.id));
  const activeSchool = userSekolahList.find(s => s.id === selectedSekolahId) || userSekolahList[0];
  const pelatihSchoolIds = userSekolahList.map(s => s.id);
  const userDivisiList = divisiList.filter(d => d.pelatihId === currentUser.id || pelatihSchoolIds.includes(d.sekolahId));

  const userAnggotaList = anggotaList.filter(a => a.pelatihId === currentUser.id || pelatihSchoolIds.includes(a.sekolahId));
  const userJadwalList = jadwalList.filter(j => j.pelatihId === currentUser.id || pelatihSchoolIds.includes(j.sekolahId));
  // In a collaborative school, collaborating coaches share journals and attendance records
  const userAbsenPelatihList = absenPelatihList.filter(a => pelatihSchoolIds.includes(a.sekolahId));
  const userAbsenSiswaList = absenSiswaList.filter(a => pelatihSchoolIds.includes(a.sekolahId));
  const userEventsList = eventsList.filter(e => pelatihSchoolIds.includes(e.sekolahId));

  const schoolAnggota = userAnggotaList.filter(a => a.sekolahId === selectedSekolahId);
  const schoolJadwal = userJadwalList.filter(j => j.sekolahId === selectedSekolahId);
  const schoolAbsenPelatih = userAbsenPelatihList.filter(a => a.sekolahId === selectedSekolahId);

  // Collaborating coach info for the currently active school
  const allUsers = StorageService.getUsers();
  const activeCoachIds = activeSchool ? getSchoolCoachIds(activeSchool) : [];
  const activeSchoolCoaches = allUsers.filter(u => activeCoachIds.includes(u.id));
  const isCollaborative = activeCoachIds.length > 1;
  const isLeadCoach = activeSchool?.pelatihId === currentUser.id;

  // If coach has no schools assigned yet
  if (userSekolahList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <School className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Belum Ada Sekolah yang Ditugaskan</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Akun Coach <strong>{currentUser.name}</strong> belum memiliki penugasan sekolah binaan di sistem. Silakan hubungi <strong>Administrator</strong> untuk menugaskan sekolah ke akun Anda.
        </p>
        <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-mono">
          ID Pelatih: {currentUser.id} • Username: {currentUser.username}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Training Reminder Banner (< 1 Hour alert) */}
      <TrainingReminderBanner
        currentUser={currentUser}
        jadwalList={userJadwalList}
        sekolahList={userSekolahList}
        selectedSekolahId={selectedSekolahId}
        onSelectSekolah={onSelectSekolah}
        onOpenQrScanner={onOpenQrScanner}
        onNavigateToJadwal={() => setActiveTab('jadwal')}
        onStartAttendance={handleStartAttendanceFromJadwal}
      />

      {/* Navigation Bar for Coach */}
      <div className="bg-white p-3.5 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <UserCheck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-700">
                Sekolah Binaan Aktif: <strong className="text-blue-700">{activeSchool?.namaSekolah}</strong>
              </span>
              {isCollaborative && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                  🤝 Kolaborasi {activeSchoolCoaches.length} Pelatih
                </span>
              )}
            </div>

            {isCollaborative && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pl-8">
                <span className="text-slate-500 font-medium">Tim Pelatih:</span>
                {activeSchoolCoaches.map((c) => {
                  const isCurrent = c.id === currentUser.id;
                  const isLead = c.id === activeSchool?.pelatihId;
                  return (
                    <span 
                      key={c.id} 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        isCurrent 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[9px] opacity-75">
                        ({isLead ? 'Utama' : 'Kolaborator'}{isCurrent ? ' • Anda' : ''})
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Select for Mobile */}
          <div className="lg:hidden relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="appearance-none bg-slate-100 font-bold text-slate-800 border border-slate-300 rounded-xl px-3.5 py-1.5 pr-8 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="beranda">🏠 Beranda & Ringkasan</option>
              <option value="anggota">👥 Data Anggota & Barcode</option>
              <option value="absen_pelatih">📷 Absensi Pelatih (Jurnal)</option>
              <option value="penilaian">🎖️ Nilai Anggota & Raport</option>
              <option value="rekap_pdf">📄 Unduh Laporan Kegiatan</option>
              <option value="jadwal">⏰ Jadwal Latihan</option>
              <option value="divisi">🎺 Divisi / Alat Musik</option>
              <option value="statistik">📊 Statistik Kehadiran</option>
              <option value="event">🏆 Event & Prestasi</option>
              <option value="galeri_foto">🖼️ Galeri Dokumentasi</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Desktop Tab Pills */}
        <div className="hidden lg:flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('beranda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'beranda'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anggota')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'anggota'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Data Anggota & Barcode ({schoolAnggota.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('absen_pelatih')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'absen_pelatih'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Absensi Pelatih ({schoolAbsenPelatih.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('penilaian')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'penilaian'
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Nilai Anggota (Raport)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap_pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rekap_pdf'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cetak Laporan Kegiatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'jadwal'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Jadwal ({schoolJadwal.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('divisi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'divisi'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Divisi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'statistik'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('event')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'event'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Event ({userEventsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('galeri_foto')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'galeri_foto'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Galeri Foto</span>
          </button>
        </div>
      </div>

      {/* BERANDA HUB VIEW */}
      {activeTab === 'beranda' && (
        <div className="space-y-4">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30 inline-block mb-1">
                    Portal Coach Marching Band
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Selamat Datang, {currentUser.name}!
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Sekolah Aktif: <strong>{activeSchool?.namaSekolah}</strong> ({activeTahunAjaran})
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-xs text-blue-300 font-medium block">Total Sekolah Binaan Anda:</span>
                  <span className="text-2xl font-black text-amber-300">{userSekolahList.length} Sekolah</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-blue-800/80">
                <button
                  onClick={onOpenQrScanner}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Presensi Anggota</span>
                </button>

                <button
                  onClick={() => setActiveTab('absen_pelatih')}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition border border-white/20 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>Isi Jurnal & Foto Melatih</span>
                </button>

                <button
                  onClick={() => setActiveTab('anggota')}
                  className="flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition border border-blue-400/30 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-200" />
                  <span>Kelola Anggota & Kartu QR</span>
                </button>

                <button
                  onClick={() => setActiveTab('penilaian')}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Rekap Nilai Anggota</span>
                </button>

                <button
                  onClick={() => setActiveTab('rekap_pdf')}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Cetak / Unduh Laporan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setActiveTab('anggota')}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition"
            >
              <span className="text-[11px] text-slate-400 font-semibold block">Anggota Sekolah Ini</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolAnggota.length} Anggota</p>
            </div>
            <div 
              onClick={() => setActiveTab('jadwal')}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition"
            >
              <span className="text-[11px] text-slate-400 font-semibold block">Jadwal Rutin</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolJadwal.length} Sesi / Minggu</p>
            </div>
            <div 
              onClick={() => setActiveTab('absen_pelatih')}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition"
            >
              <span className="text-[11px] text-slate-400 font-semibold block">Jurnal Latihan Terisi</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolAbsenPelatih.length} Pertemuan</p>
            </div>
            <div 
              onClick={() => setActiveTab('divisi')}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition"
            >
              <span className="text-[11px] text-slate-400 font-semibold block">Divisi Terdaftar</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{userDivisiList.length} Divisi</p>
            </div>
          </div>

          {/* Schedule & Reminder Countdown Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Jadwal Latihan Sekolah: {activeSchool?.namaSekolah}
              </h3>
              <button
                onClick={() => setActiveTab('jadwal')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                + Kelola Jadwal
              </button>
            </div>

            {schoolJadwal.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Belum ada jadwal latihan rutin yang ditambahkan untuk sekolah ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {schoolJadwal.map((j) => (
                  <div key={j.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{j.hari}</span>
                      <span className="text-xs font-mono text-blue-700 font-bold">
                        {j.jamMulai} - {j.jamSelesai}
                      </span>
                    </div>
                    <button
                      onClick={onOpenQrScanner}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                      title="Mulai Scan Absen Anggota"
                    >
                      Scan QR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Member List Preview */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Daftar Anggota ({schoolAnggota.length})
              </h3>
              <button
                onClick={() => setActiveTab('anggota')}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua & Cetak Kartu Barcode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {schoolAnggota.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Belum ada data anggota. Klik <button onClick={() => setActiveTab('anggota')} className="text-blue-600 underline font-bold">Kelola Anggota</button> untuk menambahkan data atau import dari Excel.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {schoolAnggota.slice(0, 6).map((student) => (
                  <div key={student.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{student.nama}</p>
                      <p className="text-[10px] text-slate-500">{student.kelas} • {student.divisiNama}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                      QR Ready
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATISTIK KEHADIRAN VIEW */}
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

      {/* DIVISI MANAGER VIEW */}
      {activeTab === 'divisi' && (
        <DivisiManager
          currentPelatihId={currentUser.id}
          divisiList={userDivisiList}
          onDataChanged={onDataChanged}
        />
      )}

      {/* JADWAL MANAGER VIEW */}
      {activeTab === 'jadwal' && (
        <JadwalManager
          currentPelatihId={currentUser.id}
          selectedSekolahId={selectedSekolahId}
          sekolahList={userSekolahList}
          jadwalList={userJadwalList}
          absenPelatihList={userAbsenPelatihList}
          currentUser={currentUser}
          onDataChanged={onDataChanged}
          onStartAttendance={handleStartAttendanceFromJadwal}
          onViewJurnal={() => setActiveTab('absen_pelatih')}
        />
      )}

      {/* ABSEN PELATIH & DOKUMENTASI VIEW */}
      {activeTab === 'absen_pelatih' && (
        <AbsenPelatih
          currentPelatihId={currentUser.id}
          currentPelatihName={currentUser.name}
          selectedSekolahId={selectedSekolahId}
          sekolahList={userSekolahList}
          absenPelatihList={userAbsenPelatihList}
          jadwalList={userJadwalList}
          initialJadwalId={selectedJadwalForAttendance}
          onDataChanged={() => {
            setSelectedJadwalForAttendance(undefined);
            onDataChanged();
          }}
        />
      )}

      {/* GALERI DOKUMENTASI FOTO VIEW */}
      {activeTab === 'galeri_foto' && (
        <DokumentasiGaleri
          absenPelatihList={userAbsenPelatihList}
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          onSelectSekolah={onSelectSekolah}
          currentUser={currentUser}
          isAdmin={false}
          onDataChanged={onDataChanged}
        />
      )}

      {/* ANGGOTA MANAGER VIEW */}
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

      {/* EVENT MANAGER VIEW */}
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

      {/* PENILAIAN ANGGOTA VIEW */}
      {activeTab === 'penilaian' && (
        <PenilaianAnggota
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          anggotaList={userAnggotaList}
          absenSiswaList={userAbsenSiswaList}
        />
      )}

      {/* REKAP PDF VIEW */}
      {activeTab === 'rekap_pdf' && (
        <RekapPdf
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          absenPelatihList={userAbsenPelatihList}
          anggotaList={userAnggotaList}
          absenSiswaList={userAbsenSiswaList}
          eventsList={userEventsList}
        />
      )}
    </div>
  );
};
