import React, { useState } from 'react';
import { User, Sekolah, AbsenPelatihItem, Anggota, Divisi, AbsenSiswaEntry, EventLog } from '../types';
import { StorageService } from '../data/storage';
import { DokumentasiGaleri } from './DokumentasiGaleri';
import { StatistikKehadiran } from './StatistikKehadiran';
import { EventManager } from './EventManager';
import { PenilaianAnggota } from './PenilaianAnggota';
import { Shield, UserPlus, Users, School, Camera, CheckCircle2, Trash2, Edit2, Key, Phone, Award, Search, Sparkles, BarChart3, Calendar, Settings, ChevronDown } from 'lucide-react';

interface AdminDashboardProps {
  usersList: User[];
  sekolahList: Sekolah[];
  absenPelatihList: AbsenPelatihItem[];
  anggotaList: Anggota[];
  divisiList?: Divisi[];
  absenSiswaList?: AbsenSiswaEntry[];
  eventsList?: EventLog[];
  activeTahunAjaran?: string;
  onOpenManageTahunAjaran?: () => void;
  onDataChanged: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  usersList,
  sekolahList,
  absenPelatihList,
  anggotaList,
  divisiList = [],
  absenSiswaList = [],
  eventsList = [],
  activeTahunAjaran = '2024/2025',
  onOpenManageTahunAjaran,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'pelatih' | 'penilaian' | 'statistik' | 'progres' | 'dokumentasi' | 'event'>('pelatih');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const pelatihUsers = usersList.filter(u => u.role === 'pelatih');

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setPassword('123456');
    setNip('');
    setPhone('');
    setSpecialty('Brass & Field Commander');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingId(u.id);
    setName(u.name);
    setUsername(u.username);
    setPassword(u.password || '');
    setNip(u.nip || '');
    setPhone(u.phone || '');
    setSpecialty(u.specialty || '');
    setIsModalOpen(true);
  };

  const handleSavePelatih = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username) return;

    const newPelatih: User = {
      id: editingId || `u-pelatih-${Date.now()}`,
      name,
      username,
      password: password || '123456',
      role: 'pelatih',
      nip,
      phone,
      specialty,
      active: true
    };

    StorageService.saveUser(newPelatih);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDeletePelatih = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus user pelatih ini?')) {
      StorageService.deleteUser(id);
      onDataChanged();
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Academic Year Banner & Quick Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Tahun Ajaran Aktif System:</span>
              <span className="text-sm font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                {activeTahunAjaran}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Seluruh data absensi, laporan PDF, dan analisis statistik terkelompok sesuai tahun ajaran aktif.
            </p>
          </div>
        </div>

        {onOpenManageTahunAjaran && (
          <button
            onClick={onOpenManageTahunAjaran}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>Kelola & Ubah Tahun Ajaran</span>
          </button>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-100">Total Pelatih</span>
            <Users className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">{pelatihUsers.length}</p>
          <span className="text-[10px] text-blue-200">User Pelatih Aktif</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-100">Total Sekolah</span>
            <School className="w-4 h-4 text-indigo-200" />
          </div>
          <p className="text-2xl font-black">{sekolahList.length}</p>
          <span className="text-[10px] text-indigo-200">Sekolah Binaan</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-100">Siswa Marching Band</span>
            <Users className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{anggotaList.length}</p>
          <span className="text-[10px] text-emerald-200">Anggota Terdaftar</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-100">Sesi Latihan Log</span>
            <Camera className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-2xl font-black">{absenPelatihList.length}</p>
          <span className="text-[10px] text-amber-200">Dokumentasi Terunggah</span>
        </div>
      </div>

      {/* Main Admin Section with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Panel Kontrol Administrator</h2>
              <p className="text-xs text-slate-500">Kelola akun pelatih, pantau progres melatih & dokumentasi bukti kehadiran</p>
            </div>
          </div>

          {/* Navigation Controls: Dropdown for Mobile/Tablet & Tabs for Desktop */}
          <div className="flex items-center gap-2">
            {/* Dropdown Menu for quick select */}
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="appearance-none bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 border border-slate-300 rounded-xl px-3.5 py-1.5 pr-8 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="pelatih">👥 Kelola Akun Pelatih</option>
                <option value="penilaian">🎖️ Penilaian Raport Siswa (A, B, C, D)</option>
                <option value="statistik">📊 Statistik Kehadiran</option>
                <option value="progres">📈 Progres Melatih & Target</option>
                <option value="dokumentasi">🖼️ Galeri Foto Dokumentasi</option>
                <option value="event">🏆 Laporan Kegiatan & Event</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* TAB EVENT MANAGER */}
        {activeTab === 'event' && (
          <EventManager
            sekolahList={sekolahList}
            selectedSekolahId=""
            eventsList={eventsList}
            onDataChanged={onDataChanged}
            activeTahunAjaran={activeTahunAjaran}
          />
        )}

        {/* TAB PENILAIAN ANGGOTA */}
        {activeTab === 'penilaian' && (
          <PenilaianAnggota
            sekolahList={sekolahList}
            selectedSekolahId={sekolahList[0]?.id || ''}
            anggotaList={anggotaList}
            absenSiswaList={absenSiswaList}
          />
        )}

        {/* TAB STATISTIK KEHADIRAN RECHARTS */}
        {activeTab === 'statistik' && (
          <StatistikKehadiran
            sekolahList={sekolahList}
            divisiList={divisiList}
            anggotaList={anggotaList}
            absenSiswaList={absenSiswaList}
            absenPelatihList={absenPelatihList}
          />
        )}

        {/* TAB 1: Kelola User Pelatih */}
        {activeTab === 'pelatih' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Daftar Akun Pelatih Terdaftar</h3>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pelatih Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pelatihUsers.map((u) => {
                const coachedSchools = sekolahList.filter(s => s.pelatihId === u.id);
                const sessionsLogged = absenPelatihList.filter(a => a.pelatihId === u.id).length;

                return (
                  <div key={u.id} className="p-3.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-xl transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{u.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Spesialisasi: {u.specialty || 'Pelatih Marching Band'}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Username:</span>
                          <strong className="font-mono text-slate-800">{u.username}</strong>
                        </div>
                        {u.nip && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">NIP:</span>
                            <span className="font-medium text-slate-700">{u.nip}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Sekolah Binaan:</span>
                          <div className="text-right">
                            <strong className="text-blue-700 block">{coachedSchools.length} Sekolah</strong>
                            {coachedSchools.map(sch => (
                              <span key={sch.id} className="text-[10px] text-slate-600 block">
                                • {sch.namaSekolah}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Sesi Melatih:</span>
                          <strong className="text-emerald-700">{sessionsLogged} Sesi</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit User
                      </button>
                      <button
                        onClick={() => handleDeletePelatih(u.id)}
                        className="p-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Progres Melatih */}
        {activeTab === 'progres' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Monitoring Progres & Pencapaian Melatih</h3>

            <div className="space-y-3">
              {pelatihUsers.map((p) => {
                const logs = absenPelatihList.filter(a => a.pelatihId === p.id);
                const avgAchievement = logs.length > 0
                  ? Math.round(logs.reduce((acc, curr) => acc + curr.pencapaianPercent, 0) / logs.length)
                  : 0;

                return (
                  <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{p.name}</h4>
                        <p className="text-xs text-slate-500">NIP: {p.nip || '-'} • Telepon: {p.phone || '-'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-semibold block">Rata-rata Pencapaian:</span>
                          <span className="text-base font-black text-emerald-700">{avgAchievement}%</span>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center font-black text-emerald-800 text-sm">
                          {avgAchievement}%
                        </div>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-slate-700 mb-2">Riwayat Latihan Terakhir:</h5>
                    {logs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-white p-2.5 rounded-xl border border-slate-200">Belum ada catatan melatih yang diinput oleh pelatih ini.</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.slice(0, 3).map((log) => {
                          const school = sekolahList.find(s => s.id === log.sekolahId);
                          return (
                            <div key={log.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-blue-700">{school?.namaSekolah}</span>
                                <span className="text-slate-400 mx-1.5">•</span>
                                <span className="text-slate-600 font-medium">{log.hariTanggalFormat}</span>
                                <p className="text-slate-800 font-semibold mt-0.5">{log.materiPokok}</p>
                              </div>
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg shrink-0">
                                {log.pencapaianPercent}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Galeri Foto Dokumentasi */}
        {activeTab === 'dokumentasi' && (
          <DokumentasiGaleri
            absenPelatihList={absenPelatihList}
            sekolahList={sekolahList}
            usersList={usersList}
          />
        )}
      </div>

      {/* Modal Add/Edit Pelatih */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                {editingId ? 'Edit Data User Pelatih' : 'Tambah User Pelatih Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSavePelatih} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Pelatih <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username Login <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="budi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  placeholder="198804122015031002"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. HP / Whatsapp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Spesialisasi / Divisi Utama</label>
                  <input
                    type="text"
                    placeholder="Brass / Battery Percussion"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow"
                >
                  Simpan Pelatih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
