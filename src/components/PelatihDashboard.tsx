import React, { useState } from 'react';
import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, AbsenSiswaEntry, EventLog } from '../types';
import { SekolahManager } from './SekolahManager';
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
import { School, Layers, Clock, Camera, Users, FileText, QrCode, Bell, Plus, Calendar, ArrowRight, CheckCircle2, BarChart3, Award, ChevronDown } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'beranda' | 'statistik' | 'penilaian' | 'sekolah' | 'divisi' | 'jadwal' | 'absen_pelatih' | 'galeri_foto' | 'anggota' | 'event' | 'rekap_pdf'>('beranda');

  // Data filtering for current logged in pelatih
  const userSekolahList = sekolahList.filter(s => s.pelatihId === currentUser.id);
  const activeSchool = userSekolahList.find(s => s.id === selectedSekolahId) || userSekolahList[0];
  const userDivisiList = divisiList.filter(d => d.pelatihId === currentUser.id);
  const pelatihSchoolIds = userSekolahList.map(s => s.id);

  const userAnggotaList = anggotaList.filter(a => a.pelatihId === currentUser.id || pelatihSchoolIds.includes(a.sekolahId));
  const userJadwalList = jadwalList.filter(j => j.pelatihId === currentUser.id || pelatihSchoolIds.includes(j.sekolahId));
  const userAbsenPelatihList = absenPelatihList.filter(a => a.pelatihId === currentUser.id);
  const userAbsenSiswaList = absenSiswaList.filter(a => pelatihSchoolIds.includes(a.sekolahId));
  const userEventsList = eventsList.filter(e => pelatihSchoolIds.includes(e.sekolahId));

  const schoolAnggota = userAnggotaList.filter(a => a.sekolahId === selectedSekolahId);
  const schoolJadwal = userJadwalList.filter(j => j.sekolahId === selectedSekolahId);
  const schoolAbsenPelatih = userAbsenPelatihList.filter(a => a.sekolahId === selectedSekolahId);

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
      />

      {/* Navigation Dropdown & Quick Hub Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-xs font-bold text-slate-500 shrink-0 hidden sm:inline">Navigasi Modul:</span>
          
          {/* Main Dropdown Navigation */}
          <div className="relative flex-1 max-w-md">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 font-bold text-slate-900 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition shadow-xs"
            >
              <option value="beranda">🏠 Beranda</option>
              <option value="penilaian">🎖️ Nilai Anggota</option>
              <option value="statistik">📊 Statistik Kehadiran Siswa</option>
              <option value="sekolah">🏫 Sekolah</option>
              <option value="divisi">🎺 Divisi</option>
              <option value="absen_pelatih">📷 Absensi Pelatih</option>
              <option value="galeri_foto">🖼️ Riwayat Dokumentasi</option>
              <option value="event">🏆 Event</option>
              <option value="rekap_pdf">📄 Cetak Rekap Absensi</option>
              <option value="anggota">👥 Data Anggota & Barcode</option>
              <option value="jadwal">⏰ Jadwal Latihan</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('beranda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'beranda'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penilaian')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'penilaian'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nilai Anggota
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'statistik'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Statistik Kehadiran
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('absen_pelatih')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'absen_pelatih'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Absensi Pelatih
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rekap_pdf')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rekap_pdf'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cetak Rekap
          </button>
        </div>
      </div>

      {/* BERANDA HUB VIEW */}
      {activeTab === 'beranda' && (
        <div className="space-y-4">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30 inline-block mb-1">
                    Portal Pelatih Marching Band
                  </span>
                  <h2 className="text-xl font-black">Selamat Datang, {currentUser.name}!</h2>
                  <p className="text-xs text-blue-200 mt-1 max-w-lg">
                    Mengajar di <strong className="text-white">{activeSchool?.namaSekolah || 'Sekolah Binaan'}</strong>
                  </p>
                </div>

                {/* Academic Year Badge */}
                {onOpenManageTahunAjaran && (
                  <button
                    onClick={onOpenManageTahunAjaran}
                    className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs px-3.5 py-2 rounded-2xl transition cursor-pointer"
                    title="Ubah atau kelola tahun ajaran aktif"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Tahun Ajaran: {activeTahunAjaran}</span>
                  </button>
                )}
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-blue-800/80">
                <button
                  onClick={onOpenQrScanner}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Presensi Anggota</span>
                </button>

                <button
                  onClick={() => setActiveTab('absen_pelatih')}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition border border-white/20"
                >
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>Isi Bukti Foto Melatih</span>
                </button>

                <button
                  onClick={() => setActiveTab('event')}
                  className="flex items-center gap-1.5 bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition border border-purple-400/30"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Isi Laporan Event</span>
                </button>

                <button
                  onClick={() => setActiveTab('statistik')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition border border-blue-400/30"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-300" />
                  <span>Statistik Kehadiran</span>
                </button>

                <button
                  onClick={() => setActiveTab('rekap_pdf')}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                >
                  <FileText className="w-4 h-4 text-yellow-300" />
                  <span>Cetak PDF Laporan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold block">Anggota Sekolah Ini</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolAnggota.length} Anggota</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold block">Jadwal Rutin</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolJadwal.length} Hari / Mgg</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold block">Sesi Latihan Log</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{schoolAbsenPelatih.length} Sesi</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold block">Divisi Terdaftar</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{userDivisiList.length} Divisi</p>
            </div>
          </div>

          {/* Schedule & Reminder Countdown Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Jadwal & Pengingat Latihan Sekolah Aktif
              </h3>
              <button
                onClick={() => setActiveTab('jadwal')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Kelola Jadwal
              </button>
            </div>

            {schoolJadwal.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-xl">
                Belum ada jadwal latihan terdaftar untuk {activeSchool?.namaSekolah}.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {schoolJadwal.map((j) => (
                  <div key={j.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                        Hari {j.hari}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        Jam: {j.jamMulai} S/D {j.jamSelesai}
                      </p>
                      {j.reminderEnabled && (
                        <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                          ✓ Pengingat otomatis {j.reminderMinutesBefore}m sebelum latihan
                        </span>
                      )}
                    </div>
                    <button
                      onClick={onOpenQrScanner}
                      className="p-2 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                      title="Mulai Scan Absen"
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
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua & Cetak QR</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {schoolAnggota.slice(0, 6).map((student) => (
                <div key={student.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{student.nama}</p>
                    <p className="text-[10px] text-slate-500">{student.kelas} • {student.divisiNama}</p>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    QR Ready
                  </span>
                </div>
              ))}
            </div>
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

      {/* SEKOLAH MANAGER VIEW */}
      {activeTab === 'sekolah' && (
        <SekolahManager
          currentPelatihId={currentUser.id}
          sekolahList={userSekolahList}
          onDataChanged={onDataChanged}
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
          onDataChanged={onDataChanged}
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
          onDataChanged={onDataChanged}
        />
      )}

      {/* GALERI DOKUMENTASI FOTO VIEW */}
      {activeTab === 'galeri_foto' && (
        <DokumentasiGaleri
          absenPelatihList={userAbsenPelatihList}
          sekolahList={userSekolahList}
          selectedSekolahId={selectedSekolahId}
          onSelectSekolah={onSelectSekolah}
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
