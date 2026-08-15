import React, { useState, useMemo } from 'react';
import { User, UserRole, Sekolah, AbsenPelatihItem, AbsenAsistenPelatihItem, Anggota, Divisi, AbsenSiswaEntry, EventLog } from '../types';
import { StorageService } from '../data/storage';
import { DokumentasiGaleri } from './DokumentasiGaleri';
import { StatistikKehadiran } from './StatistikKehadiran';
import { EventManager } from './EventManager';
import { PenilaianAnggota } from './PenilaianAnggota';
import { 
  Shield, 
  UserPlus, 
  Users, 
  School, 
  Camera, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  Key, 
  Phone, 
  Award, 
  Search, 
  Sparkles, 
  BarChart3, 
  Calendar, 
  Settings, 
  ChevronDown,
  UserCheck,
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Layers
} from 'lucide-react';

interface AdminDashboardProps {
  usersList: User[];
  sekolahList: Sekolah[];
  absenPelatihList: AbsenPelatihItem[];
  absenAsistenList?: AbsenAsistenPelatihItem[];
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
  absenAsistenList = [],
  anggotaList,
  divisiList = [],
  absenSiswaList = [],
  eventsList = [],
  activeTahunAjaran = '2024/2025',
  onOpenManageTahunAjaran,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'pelatih' | 'rekap_asisten' | 'penilaian' | 'statistik' | 'progres' | 'dokumentasi' | 'event'>('pelatih');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'pelatih' | 'asisten_pelatih'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // User Form States
  const [role, setRole] = useState<UserRole>('pelatih');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');

  // Assistant Recap Filter States
  const [filterAsistenId, setFilterAsistenId] = useState<string>('all');
  const [filterAsistenSekolah, setFilterAsistenSekolah] = useState<string>('all');
  const [filterAsistenBulan, setFilterAsistenBulan] = useState<string>('all');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const pelatihUsers = usersList.filter(u => u.role === 'pelatih');
  const asistenUsers = usersList.filter(u => u.role === 'asisten_pelatih');

  const displayedUsers = useMemo(() => {
    if (userRoleFilter === 'pelatih') return pelatihUsers;
    if (userRoleFilter === 'asisten_pelatih') return asistenUsers;
    return usersList.filter(u => u.role === 'pelatih' || u.role === 'asisten_pelatih');
  }, [usersList, userRoleFilter, pelatihUsers, asistenUsers]);

  const openAddModal = (defaultRole: UserRole = 'pelatih') => {
    setEditingId(null);
    setRole(defaultRole);
    setName('');
    setUsername('');
    setPassword('123456');
    setNip('');
    setPhone('');
    setSpecialty(defaultRole === 'asisten_pelatih' ? 'Battery Percussion & Section Cadence' : 'Brass & Field Commander');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingId(u.id);
    setRole(u.role);
    setName(u.name);
    setUsername(u.username);
    setPassword(u.password || '');
    setNip(u.nip || '');
    setPhone(u.phone || '');
    setSpecialty(u.specialty || '');
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username) return;

    const newUser: User = {
      id: editingId || `u-${role}-${Date.now()}`,
      name,
      username,
      password: password || '123456',
      role,
      nip,
      phone,
      specialty,
      active: true
    };

    StorageService.saveUser(newUser);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDeleteUser = (id: string, userName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun user "${userName}"?`)) {
      StorageService.deleteUser(id);
      onDataChanged();
    }
  };

  // Filtered Assistant Attendance List for Admin
  const filteredAbsenAsisten = useMemo(() => {
    return absenAsistenList.filter(item => {
      if (filterAsistenId !== 'all' && item.asistenId !== filterAsistenId) return false;
      if (filterAsistenSekolah !== 'all' && item.sekolahId !== filterAsistenSekolah) return false;
      if (filterAsistenBulan !== 'all' && item.tanggal) {
        const d = new Date(item.tanggal);
        const m = bulanList[d.getMonth()];
        if (m !== filterAsistenBulan) return false;
      }
      return true;
    });
  }, [absenAsistenList, filterAsistenId, filterAsistenSekolah, filterAsistenBulan, bulanList]);

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-100">Pelatih Utama</span>
            <Users className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">{pelatihUsers.length}</p>
          <span className="text-[10px] text-blue-200">Pelatih Aktif</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-100">Asisten Pelatih</span>
            <UserCheck className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{asistenUsers.length}</p>
          <span className="text-[10px] text-emerald-200">Asisten Terdaftar</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-100">Total Sekolah</span>
            <School className="w-4 h-4 text-indigo-200" />
          </div>
          <p className="text-2xl font-black">{sekolahList.length}</p>
          <span className="text-[10px] text-indigo-200">Sekolah Binaan</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-teal-600 to-cyan-700 text-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal-100">Siswa Marching</span>
            <Users className="w-4 h-4 text-teal-200" />
          </div>
          <p className="text-2xl font-black">{anggotaList.length}</p>
          <span className="text-[10px] text-teal-200">Anggota Terdaftar</span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-100">Absensi Asisten</span>
            <Calendar className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-2xl font-black">{absenAsistenList.length}</p>
          <span className="text-[10px] text-amber-200">Log Kehadiran Asisten</span>
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
              <p className="text-xs text-slate-500">Kelola akun pelatih & asisten, pantau rekap kehadiran, progres melatih & dokumentasi</p>
            </div>
          </div>

          {/* Navigation Controls: Dropdown for Navigation */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="appearance-none bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 border border-slate-300 rounded-xl px-3.5 py-1.5 pr-8 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="pelatih">👥 Kelola Akun Pelatih & Asisten</option>
                <option value="rekap_asisten">📋 Rekap Absensi Asisten Pelatih</option>
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

        {/* TAB 1: KELOLA USER PELATIH & ASISTEN */}
        {activeTab === 'pelatih' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Subtabs Role Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    userRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({usersList.filter(u => u.role !== 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('pelatih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    userRoleFilter === 'pelatih' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pelatih Utama ({pelatihUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('asisten_pelatih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    userRoleFilter === 'asisten_pelatih' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Asisten Pelatih ({asistenUsers.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAddModal('asisten_pelatih')}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Asisten Pelatih</span>
                </button>

                <button
                  onClick={() => openAddModal('pelatih')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pelatih Utama</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedUsers.map((u) => {
                const isAsisten = u.role === 'asisten_pelatih';
                const coachedSchools = sekolahList.filter(s => s.pelatihId === u.id);
                const sessionsLogged = isAsisten
                  ? absenAsistenList.filter(a => a.asistenId === u.id).length
                  : absenPelatihList.filter(a => a.pelatihId === u.id).length;

                return (
                  <div 
                    key={u.id} 
                    className={`p-3.5 border rounded-2xl transition flex flex-col justify-between ${
                      isAsisten 
                        ? 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200/80' 
                        : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shadow-xs ${
                            isAsisten ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-slate-900 text-sm">{u.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                                isAsisten ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {isAsisten ? 'Asisten Pelatih' : 'Pelatih Utama'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Spesialisasi: {u.specialty || (isAsisten ? 'Pendamping Section' : 'Pelatih Marching Band')}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Username Login:</span>
                          <strong className="font-mono text-slate-800">{u.username}</strong>
                        </div>
                        {u.phone && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">No. HP/WA:</span>
                            <span className="font-medium text-slate-700">{u.phone}</span>
                          </div>
                        )}
                        {!isAsisten && (
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
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Absen Terisi:</span>
                          <strong className={isAsisten ? 'text-emerald-700' : 'text-blue-700'}>
                            {sessionsLogged} Sesi
                          </strong>
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
                        onClick={() => handleDeleteUser(u.id, u.name)}
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

        {/* TAB REKAP ABSENSI ASISTEN PELATIH */}
        {activeTab === 'rekap_asisten' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Asisten */}
                <select
                  value={filterAsistenId}
                  onChange={(e) => setFilterAsistenId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Asisten Pelatih</option>
                  {asistenUsers.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                {/* Filter Sekolah */}
                <select
                  value={filterAsistenSekolah}
                  onChange={(e) => setFilterAsistenSekolah(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Sekolah Binaan</option>
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>

                {/* Filter Bulan */}
                <select
                  value={filterAsistenBulan}
                  onChange={(e) => setFilterAsistenBulan(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Bulan</option>
                  {bulanList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rekap</span>
                </button>
              </div>
            </div>

            {filteredAbsenAsisten.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Belum ada data absensi asisten pelatih yang sesuai dengan filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <th className="p-2.5 w-8 text-center">No</th>
                      <th className="p-2.5">Nama Asisten</th>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Sekolah Binaan</th>
                      <th className="p-2.5 text-center">Jam</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Materi Pendampingan</th>
                      <th className="p-2.5 text-center">Foto Bukti</th>
                      <th className="p-2.5 text-center">Paraf</th>
                      <th className="p-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAbsenAsisten.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{item.asistenName}</td>
                        <td className="p-2.5 font-medium text-slate-700">{item.hariTanggalFormat || item.tanggal}</td>
                        <td className="p-2.5 font-semibold text-emerald-800">
                          {item.sekolahNama}
                          {item.divisiBinaan && (
                            <span className="block text-[10px] text-teal-600 font-normal">
                              Divisi: {item.divisiBinaan}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-600">{item.jamMulai} - {item.jamSelesai}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.statusKehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.statusKehadiran}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 max-w-xs truncate" title={item.kegiatanPendampingan}>
                          {item.kegiatanPendampingan || '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.fotoDokumentasiUrl ? (
                            <button
                              onClick={() => setPreviewPhotoUrl(item.fotoDokumentasiUrl || null)}
                              className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.parafAsistenUrl ? (
                            <img src={item.parafAsistenUrl} alt="Paraf" className="h-6 max-w-[50px] object-contain mx-auto" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              if (confirm('Hapus log absensi asisten ini?')) {
                                StorageService.deleteAbsenAsisten(item.id);
                                onDataChanged();
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

        {/* TAB PROGRES MELATIH */}
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

        {/* TAB GALERI DOKUMENTASI */}
        {activeTab === 'dokumentasi' && (
          <DokumentasiGaleri
            absenPelatihList={absenPelatihList}
            sekolahList={sekolahList}
            usersList={usersList}
          />
        )}
      </div>

      {/* Modal Add/Edit User (Pelatih / Asisten) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className={`text-white p-4 flex items-center justify-between ${
              role === 'asisten_pelatih' ? 'bg-emerald-900' : 'bg-slate-900'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                {editingId 
                  ? `Edit Data User ${role === 'asisten_pelatih' ? 'Asisten Pelatih' : 'Pelatih Utama'}`
                  : `Tambah User ${role === 'asisten_pelatih' ? 'Asisten Pelatih' : 'Pelatih Utama'} Baru`
                }
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="p-4 space-y-3">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peran / Role User <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('pelatih')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'pelatih'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pelatih Utama
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('asisten_pelatih')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'asisten_pelatih'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Asisten Pelatih
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap {role === 'asisten_pelatih' ? 'Asisten Pelatih' : 'Pelatih'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={role === 'asisten_pelatih' ? 'Contoh: Rizky Pratama' : 'Contoh: Budi Santoso, S.Pd.'}
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
                    placeholder={role === 'asisten_pelatih' ? 'rizky' : 'budi'}
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

              {role === 'pelatih' && (
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
              )}

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Spesialisasi / Section</label>
                  <input
                    type="text"
                    placeholder={role === 'asisten_pelatih' ? 'Battery / Pit / Guard' : 'Brass / Field Commander'}
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
                  className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow ${
                    role === 'asisten_pelatih' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal for Admin */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Foto Bukti Kehadiran Asisten Pelatih</span>
              <button onClick={() => setPreviewPhotoUrl(null)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <img src={previewPhotoUrl} alt="Bukti Foto" className="w-full max-h-[70vh] object-contain rounded-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
