import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, UserRole, Sekolah, AbsenPelatihItem, AbsenAsistenPelatihItem, Anggota, Divisi, AbsenSiswaEntry, EventLog } from '../types';
import { StorageService } from '../data/storage';
import { DokumentasiGaleri } from './DokumentasiGaleri';
import { StatistikKehadiran } from './StatistikKehadiran';
import { EventManager } from './EventManager';
import { PenilaianAnggota } from './PenilaianAnggota';
import { SekolahManager } from './SekolahManager';
import { RekapPdf } from './RekapPdf';
import { AuditPresensi } from './AuditPresensi';
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
  Layers,
  FileText,
  Filter,
  CheckCircle,
  ClipboardList,
  AlertTriangle,
  TrendingDown
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
  const [activeTab, setActiveTab] = useState<'pelatih' | 'sekolah' | 'absensi' | 'penilaian' | 'laporan' | 'audit' | 'statistik' | 'progres' | 'dokumentasi' | 'event'>('pelatih');
  const [absensiSubTab, setAbsensiSubTab] = useState<'siswa' | 'pelatih' | 'asisten'>('siswa');
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

  // Attendance Records Filter States
  const [filterAbsenSekolah, setFilterAbsenSekolah] = useState<string>('all');
  const [filterAbsenBulan, setFilterAbsenBulan] = useState<string>('all');
  const [filterAbsenStatus, setFilterAbsenStatus] = useState<string>('all');
  const [searchAnggotaText, setSearchAnggotaText] = useState<string>('');

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
    setPassword('coach123');
    setNip('');
    setPhone('');
    setSpecialty('Pelatih Marching Band');
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

  // Filtered Student Attendance Records across All Schools
  const filteredAbsenSiswa = useMemo(() => {
    return absenSiswaList.filter(item => {
      if (filterAbsenSekolah !== 'all' && item.sekolahId !== filterAbsenSekolah) return false;
      if (filterAbsenBulan !== 'all' && item.bulan !== filterAbsenBulan) return false;
      if (filterAbsenStatus !== 'all' && item.status !== filterAbsenStatus) return false;
      if (searchAnggotaText.trim()) {
        const student = anggotaList.find(a => a.id === item.anggotaId);
        const nameMatch = student ? student.nama.toLowerCase().includes(searchAnggotaText.toLowerCase()) : false;
        if (!nameMatch) return false;
      }
      return true;
    });
  }, [absenSiswaList, filterAbsenSekolah, filterAbsenBulan, filterAbsenStatus, searchAnggotaText, anggotaList]);

  // Filtered Coach Practice Logs across All Schools
  const filteredAbsenPelatih = useMemo(() => {
    return absenPelatihList.filter(item => {
      if (filterAbsenSekolah !== 'all' && item.sekolahId !== filterAbsenSekolah) return false;
      if (filterAbsenBulan !== 'all' && item.tanggal) {
        const d = new Date(item.tanggal);
        const m = bulanList[d.getMonth()];
        if (m !== filterAbsenBulan) return false;
      }
      return true;
    });
  }, [absenPelatihList, filterAbsenSekolah, filterAbsenBulan, bulanList]);

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

  // Export Filtered Student Attendance to Excel
  const handleExportAllAttendanceExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows: any[][] = [
        ['REKAP SELURUH PRESENSI SISWA EKSTRAKURIKULER MARCHING BAND'],
        [`Tahun Pelajaran: ${activeTahunAjaran}`],
        [`Filter Sekolah: ${filterAbsenSekolah === 'all' ? 'Semua Sekolah' : (sekolahList.find(s => s.id === filterAbsenSekolah)?.namaSekolah || '-')}`],
        [`Filter Bulan: ${filterAbsenBulan === 'all' ? 'Semua Bulan' : filterAbsenBulan}`],
        [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`],
        [],
        ['No', 'Nama Siswa', 'Sekolah', 'Kelas', 'Divisi', 'Bulan', 'Kolom / Sesi', 'Tanggal', 'Status Kehadiran']
      ];

      filteredAbsenSiswa.forEach((item, idx) => {
        const student = anggotaList.find(a => a.id === item.anggotaId);
        const school = sekolahList.find(s => s.id === item.sekolahId);
        rows.push([
          idx + 1,
          student?.nama || '-',
          school?.namaSekolah || '-',
          student?.kelas || '-',
          student?.divisiNama || '-',
          item.bulan,
          `Minggu Ke-${item.kolomIndex}`,
          item.tanggal,
          item.status
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 32 },
        { wch: 10 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Presensi Siswa');
      XLSX.writeFile(wb, `Rekap_Presensi_Siswa_${activeTahunAjaran.replace('/', '-')}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Terjadi kesalahan saat mengekspor Excel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Academic Year Banner & Quick Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-2xl shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">Tahun Ajaran Aktif Sistem:</span>
              <span className="text-sm font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                {activeTahunAjaran}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-400/30">
                Mode Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Anda memiliki hak akses penuh: Kelola akun pelatih, atur penugasan sekolah, pantau rekap presensi seluruh sekolah, dan unduh laporan resmi.
            </p>
          </div>
        </div>

        {onOpenManageTahunAjaran && (
          <button
            onClick={onOpenManageTahunAjaran}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Kelola & Ubah Tahun Ajaran</span>
          </button>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setActiveTab('pelatih')} 
          className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xs cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-100">Pelatih / Coach</span>
            <Users className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">{pelatihUsers.length}</p>
          <span className="text-[10px] text-blue-200">Akun Pelatih Aktif</span>
        </div>

        <div 
          onClick={() => setActiveTab('sekolah')} 
          className="p-3.5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-xs cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-100">Sekolah Binaan</span>
            <School className="w-4 h-4 text-indigo-200" />
          </div>
          <p className="text-2xl font-black">{sekolahList.length}</p>
          <span className="text-[10px] text-indigo-200">Kelola & Penugasan</span>
        </div>

        <div 
          onClick={() => setActiveTab('absensi')} 
          className="p-3.5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-2xl shadow-xs cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal-100">Presensi Siswa</span>
            <ClipboardList className="w-4 h-4 text-teal-200" />
          </div>
          <p className="text-2xl font-black">{absenSiswaList.length}</p>
          <span className="text-[10px] text-teal-200">Log Seluruh Sekolah</span>
        </div>

        <div 
          onClick={() => setActiveTab('absensi')} 
          className="p-3.5 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-xs cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-100">Jurnal Pelatih</span>
            <Calendar className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-2xl font-black">{absenPelatihList.length}</p>
          <span className="text-[10px] text-amber-200">Sesi Latihan Terisi</span>
        </div>

        <div 
          onClick={() => setActiveTab('absensi')} 
          className="p-3.5 bg-gradient-to-br from-emerald-600 to-cyan-700 text-white rounded-2xl shadow-xs col-span-2 sm:col-span-1 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-100">Total Anggota</span>
            <UserCheck className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{anggotaList.length}</p>
          <span className="text-[10px] text-emerald-200">Anggota Terdaftar</span>
        </div>
      </div>

      {/* Main Admin Section with Responsive Tab Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        
        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-200 pb-4 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-base">Panel Kontrol Administrator</h2>
                <p className="text-xs text-slate-500">Pusat kendali akun pelatih, sekolah binaan, monitoring presensi dan laporan</p>
              </div>
            </div>

            {/* Quick dropdown for mobile */}
            <div className="lg:hidden relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="appearance-none bg-slate-100 font-bold text-slate-800 border border-slate-300 rounded-xl px-3.5 py-2 pr-8 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="pelatih">👥 Kelola Akun Pelatih</option>
                <option value="sekolah">🏫 Kelola Data Sekolah & Penugasan</option>
                <option value="absensi">📋 Semua Rekap Absensi</option>
                <option value="audit">🚨 Audit Presensi (Evaluasi Siswa Terendah)</option>
                <option value="penilaian">🎖️ Rekap Nilai Siswa</option>
                <option value="laporan">📄 Cetak Laporan Kegiatan</option>
                <option value="statistik">📊 Statistik Kehadiran</option>
                <option value="event">🏆 Event & Prestasi</option>
                <option value="dokumentasi">🖼️ Galeri Dokumentasi</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Desktop Tab Pills */}
          <div className="hidden lg:flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('pelatih')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'pelatih'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Kelola Pelatih ({pelatihUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sekolah')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'sekolah'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <School className="w-4 h-4" />
              <span>Kelola Sekolah ({sekolahList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('absensi')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'absensi'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Semua Rekap Absensi ({absenSiswaList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white text-rose-700 shadow-sm border border-rose-300 ring-1 ring-rose-200'
                  : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50/70 font-black'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Audit Presensi</span>
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-md border border-rose-200">
                Evaluasi
              </span>
            </button>

            <button
              onClick={() => setActiveTab('penilaian')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'penilaian'
                  ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Rekap Nilai Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('laporan')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'laporan'
                  ? 'bg-white text-rose-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cetak Laporan Kegiatan</span>
            </button>

            <button
              onClick={() => setActiveTab('statistik')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'statistik'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statistik</span>
            </button>

            <button
              onClick={() => setActiveTab('event')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'event'
                  ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Event ({eventsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('dokumentasi')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'dokumentasi'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Galeri Foto</span>
            </button>
          </div>
        </div>

        {/* TAB 1: KELOLA AKUN PELATIH / COACH MANAGEMENT */}
        {activeTab === 'pelatih' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Subtabs Role Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Akun ({usersList.filter(u => u.role !== 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('pelatih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'pelatih' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Coach / Pelatih Utama ({pelatihUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('asisten_pelatih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'asisten_pelatih' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Asisten Pelatih ({asistenUsers.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAddModal('pelatih')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Coach (Pelatih) Baru</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedUsers.map((u) => {
                const isAsisten = u.role === 'asisten_pelatih';
                const coachedSchools = sekolahList.filter(s => s.pelatihId === u.id);
                const sessionsLogged = isAsisten
                  ? absenAsistenList.filter(a => a.asistenId === u.id).length
                  : absenPelatihList.filter(a => a.pelatihId === u.id).length;

                return (
                  <div 
                    key={u.id} 
                    className={`p-4 border rounded-2xl transition flex flex-col justify-between shadow-xs ${
                      isAsisten 
                        ? 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200/80' 
                        : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-11 h-11 rounded-xl font-black flex items-center justify-center text-sm shadow-xs ${
                            isAsisten ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{u.name}</h4>
                            </div>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                              isAsisten ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {isAsisten ? 'Asisten Pelatih' : 'Coach / Pelatih'}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 mb-3 shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Username Login:</span>
                          <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{u.username}</strong>
                        </div>
                        {u.specialty && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Spesialisasi:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[170px]">{u.specialty}</span>
                          </div>
                        )}
                        {u.nip && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">NIP:</span>
                            <span className="font-mono text-slate-700">{u.nip}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">No. WhatsApp:</span>
                            <span className="font-medium text-slate-700">{u.phone}</span>
                          </div>
                        )}
                        {!isAsisten && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-slate-400 block text-[11px] mb-1">Sekolah yang Ditugaskan:</span>
                            {coachedSchools.length === 0 ? (
                              <span className="text-[11px] text-amber-700 italic bg-amber-50 px-2 py-0.5 rounded block">
                                Belum ada sekolah (atur di tab Kelola Sekolah)
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {coachedSchools.map(sch => (
                                  <span key={sch.id} className="text-[11px] font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                                    <School className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span className="truncate">{sch.namaSekolah}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Total Absen Log:</span>
                          <strong className={isAsisten ? 'text-emerald-700' : 'text-blue-700'}>
                            {sessionsLogged} Sesi
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA SEKOLAH & PENUGASAN PELATIH */}
        {activeTab === 'sekolah' && (
          <div className="space-y-4">
            <SekolahManager
              currentPelatihId="u-admin"
              sekolahList={sekolahList}
              usersList={usersList}
              isAdmin={true}
              onDataChanged={onDataChanged}
            />
          </div>
        )}

        {/* TAB 3: SEMUA REKAP ABSENSI (SISWA, JURNAL PELATIH, LOG ASISTEN) */}
        {activeTab === 'absensi' && (
          <div className="space-y-4">
            {/* Sub-navigation between Siswa, Jurnal Pelatih, and Asisten */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setAbsensiSubTab('siswa')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    absensiSubTab === 'siswa' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span>Presensi Siswa / Anggota ({absenSiswaList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbsensiSubTab('pelatih')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    absensiSubTab === 'pelatih' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Jurnal Latihan Pelatih ({absenPelatihList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbsensiSubTab('asisten')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    absensiSubTab === 'asisten' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Log Asisten Pelatih ({absenAsistenList.length})</span>
                </button>
              </div>

              {absensiSubTab === 'siswa' && (
                <button
                  onClick={handleExportAllAttendanceExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                  title="Unduh seluruh rekaman presensi ke format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Unduh Rekap Presensi (.xlsx)</span>
                </button>
              )}
            </div>

            {/* Filter Controls Row */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sekolah:</label>
                <select
                  value={filterAbsenSekolah}
                  onChange={(e) => setFilterAbsenSekolah(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Sekolah Binaan</option>
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Bulan:</label>
                <select
                  value={filterAbsenBulan}
                  onChange={(e) => setFilterAbsenBulan(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Bulan</option>
                  {bulanList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {absensiSubTab === 'siswa' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Kehadiran:</label>
                    <select
                      value={filterAbsenStatus}
                      onChange={(e) => setFilterAbsenStatus(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Semua Status</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Alfa">Alfa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari Nama Anggota:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama anggota..."
                        value={searchAnggotaText}
                        onChange={(e) => setSearchAnggotaText(e.target.value)}
                        className="w-full px-3 py-1.5 pl-8 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sub-view 1: Student Attendance Table */}
            {absensiSubTab === 'siswa' && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {filteredAbsenSiswa.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data presensi anggota yang sesuai filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px]">
                    <table className="w-full text-left text-xs bg-white">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-12">No</th>
                          <th className="p-3 text-center">Nama Anggota</th>
                          <th className="p-3">Sekolah</th>
                          <th className="p-3 text-center">Kelas</th>
                          <th className="p-3">Divisi</th>
                          <th className="p-3 text-center">Bulan & Sesi</th>
                          <th className="p-3 text-center">Tanggal</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredAbsenSiswa.map((entry, idx) => {
                          const student = anggotaList.find(a => a.id === entry.anggotaId);
                          const school = sekolahList.find(s => s.id === entry.sekolahId);
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 text-center font-medium text-slate-500">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-900 text-center">{student?.nama || 'Anggota Dihapus'}</td>
                              <td className="p-3 font-medium text-slate-700 truncate max-w-[200px]">{school?.namaSekolah || '-'}</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{student?.kelas || '-'}</td>
                              <td className="p-3 text-slate-700">{student?.divisiNama || '-'}</td>
                              <td className="p-3 text-center">
                                <span className="font-semibold text-slate-800">{entry.bulan}</span>
                                <span className="text-[10px] text-slate-500 block">Minggu {entry.kolomIndex}</span>
                              </td>
                              <td className="p-3 text-center font-mono text-[11px] text-slate-600">{entry.tanggal}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  entry.status === 'Hadir' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : entry.status === 'Izin'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : entry.status === 'Sakit'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {entry.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {entry.signatureUrl ? (
                                  <img src={entry.signatureUrl} alt="TTD" className="h-6 max-w-[60px] object-contain mx-auto" />
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Otomatis</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view 2: Coach Journal Table */}
            {absensiSubTab === 'pelatih' && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {filteredAbsenPelatih.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Belum ada catatan jurnal latihan pelatih pada filter ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px]">
                    <table className="w-full text-left text-xs bg-white">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-12">No</th>
                          <th className="p-3">Pelatih</th>
                          <th className="p-3">Sekolah</th>
                          <th className="p-3">Hari & Tanggal</th>
                          <th className="p-3 text-center">Waktu</th>
                          <th className="p-3">Materi Pokok / Kegiatan</th>
                          <th className="p-3 text-center">Capaian</th>
                          <th className="p-3 text-center">Foto Bukti</th>
                          <th className="p-3 text-center">Paraf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredAbsenPelatih.map((item, idx) => {
                          const coach = usersList.find(u => u.id === item.pelatihId);
                          const school = sekolahList.find(s => s.id === item.sekolahId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 text-center font-medium text-slate-500">{idx + 1}</td>
                              <td className="p-3 font-bold text-blue-900">{coach?.name || 'Pelatih'}</td>
                              <td className="p-3 font-semibold text-slate-800">{school?.namaSekolah || '-'}</td>
                              <td className="p-3 text-slate-700">{item.hariTanggalFormat || item.tanggal}</td>
                              <td className="p-3 text-center text-slate-600 font-mono text-[11px]">{item.jamMulai} - {item.jamSelesai}</td>
                              <td className="p-3 font-medium text-slate-800 max-w-xs">{item.materiPokok}</td>
                              <td className="p-3 text-center font-bold text-emerald-700">{item.pencapaianPercent}%</td>
                              <td className="p-3 text-center">
                                {item.fotoDokumentasiUrl ? (
                                  <button
                                    onClick={() => setPreviewPhotoUrl(item.fotoDokumentasiUrl)}
                                    className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Lihat</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {item.parafPelatihUrl ? (
                                  <img src={item.parafPelatihUrl} alt="Paraf" className="h-6 max-w-[50px] object-contain mx-auto" />
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view 3: Assistant Attendance Table */}
            {absensiSubTab === 'asisten' && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {filteredAbsenAsisten.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Belum ada rekaman log asisten pelatih.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px]">
                    <table className="w-full text-left text-xs bg-white">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-12">No</th>
                          <th className="p-3">Asisten Pelatih</th>
                          <th className="p-3">Hari & Tanggal</th>
                          <th className="p-3">Sekolah & Divisi</th>
                          <th className="p-3 text-center">Waktu</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3">Kegiatan Pendampingan</th>
                          <th className="p-3 text-center">Foto</th>
                          <th className="p-3 text-center">Paraf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredAbsenAsisten.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 text-center font-medium text-slate-500">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{item.asistenName}</td>
                            <td className="p-3 font-medium text-slate-700">{item.hariTanggalFormat || item.tanggal}</td>
                            <td className="p-3 font-semibold text-emerald-800">
                              {item.sekolahNama}
                              {item.divisiBinaan && (
                                <span className="block text-[10px] text-teal-600 font-normal">
                                  Divisi: {item.divisiBinaan}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center text-slate-600 font-mono text-[11px]">{item.jamMulai} - {item.jamSelesai}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.statusKehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.statusKehadiran}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 max-w-xs truncate" title={item.kegiatanPendampingan}>
                              {item.kegiatanPendampingan || '-'}
                            </td>
                            <td className="p-3 text-center">
                              {item.fotoDokumentasiUrl ? (
                                <button
                                  onClick={() => setPreviewPhotoUrl(item.fotoDokumentasiUrl || null)}
                                  className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {item.parafAsistenUrl ? (
                                <img src={item.parafAsistenUrl} alt="Paraf" className="h-6 max-w-[50px] object-contain mx-auto" />
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB AUDIT PRESENSI (EVALUASI KEHADIRAN TERENDAH TIAP SEKOLAH) */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <AuditPresensi
              sekolahList={sekolahList}
              anggotaList={anggotaList}
              absenSiswaList={absenSiswaList}
              usersList={usersList}
            />
          </div>
        )}

        {/* TAB 4: REKAP NILAI SISWA (PENILAIAN ANGGOTA & RAPORT) */}
        {activeTab === 'penilaian' && (
          <div className="space-y-4">
            <PenilaianAnggota
              sekolahList={sekolahList}
              selectedSekolahId={sekolahList[0]?.id || ''}
              anggotaList={anggotaList}
              absenSiswaList={absenSiswaList}
            />
          </div>
        )}

        {/* TAB 5: CETAK LAPORAN RESMI (REKAP PDF / WORD / EXCEL) */}
        {activeTab === 'laporan' && (
          <div className="space-y-4">
            <RekapPdf
              sekolahList={sekolahList}
              selectedSekolahId={sekolahList[0]?.id || ''}
              absenPelatihList={absenPelatihList}
              anggotaList={anggotaList}
              absenSiswaList={absenSiswaList}
              eventsList={eventsList}
            />
          </div>
        )}

        {/* TAB 6: STATISTIK KEHADIRAN */}
        {activeTab === 'statistik' && (
          <div className="space-y-4">
            <StatistikKehadiran
              sekolahList={sekolahList}
              divisiList={divisiList}
              anggotaList={anggotaList}
              absenSiswaList={absenSiswaList}
              absenPelatihList={absenPelatihList}
            />
          </div>
        )}

        {/* TAB 7: EVENT MANAGER */}
        {activeTab === 'event' && (
          <div className="space-y-4">
            <EventManager
              sekolahList={sekolahList}
              selectedSekolahId=""
              eventsList={eventsList}
              onDataChanged={onDataChanged}
              activeTahunAjaran={activeTahunAjaran}
            />
          </div>
        )}

        {/* TAB 8: DOKUMENTASI GALERI */}
        {activeTab === 'dokumentasi' && (
          <div className="space-y-4">
            <DokumentasiGaleri
              absenPelatihList={absenPelatihList}
              eventsList={eventsList}
              sekolahList={sekolahList}
            />
          </div>
        )}
      </div>

      {/* Modal Add/Edit User (Coach or Assistant) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Data User' : role === 'asisten_pelatih' ? 'Tambah Asisten Pelatih' : 'Tambah Coach (Pelatih) Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Akun / Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="pelatih">🎺 Coach (Pelatih Utama)</option>
                  <option value="asisten_pelatih">👥 Asisten Pelatih</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hendra Pratama, S.Pd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Spesialisasi / Keahlian</label>
                <input
                  type="text"
                  placeholder="Contoh: Brass & Display Drill / Percussion"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username Login <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="coach"
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
                    placeholder="coach123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP (Nomor Induk Pegawai) - Opsional</label>
                <input
                  type="text"
                  placeholder="198904122015021004"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. HP / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Contoh: 081298765432"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer ${
                    role === 'asisten_pelatih' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Simpan Akun
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
              <span className="text-xs font-bold text-slate-800">Foto Bukti Dokumentasi</span>
              <button onClick={() => setPreviewPhotoUrl(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
