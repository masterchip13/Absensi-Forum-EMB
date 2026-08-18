import React, { useState, useMemo } from 'react';
import { User, Sekolah, AbsenAsistenPelatihItem } from '../types';
import { StorageService } from '../data/storage';
import { SignaturePad } from './SignaturePad';
import { compressImageDataUrl } from '../utils/imageCompressor';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import {
  Calendar,
  Clock,
  School,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Download,
  Filter,
  Search,
  BarChart3,
  Award,
  Users,
  Eye,
  Check,
  ChevronRight,
  TrendingUp,
  Building2,
  MapPin,
  Sparkles,
  Layers
} from 'lucide-react';

interface AsistenPelatihDashboardProps {
  currentUser: User;
  sekolahList: Sekolah[];
  absenAsistenList: AbsenAsistenPelatihItem[];
  activeTahunAjaran: string;
  onDataChanged: () => void;
}

export const AsistenPelatihDashboard: React.FC<AsistenPelatihDashboardProps> = ({
  currentUser,
  sekolahList,
  absenAsistenList,
  activeTahunAjaran,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'rekap' | 'statistik' | 'laporan'>('rekap');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [sekolahId, setSekolahId] = useState<string>(sekolahList.length > 0 ? sekolahList[0].id : '');
  const [jamMulai, setJamMulai] = useState('14:00');
  const [jamSelesai, setJamSelesai] = useState('17:00');
  const [statusKehadiran, setStatusKehadiran] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Tugas Luar'>('Hadir');
  const [divisiBinaan, setDivisiBinaan] = useState('Battery & Pit Percussion');
  const [kegiatanPendampingan, setKegiatanPendampingan] = useState('');
  const [fotoDokumentasiUrl, setFotoDokumentasiUrl] = useState<string>('');
  const [parafAsistenUrl, setParafAsistenUrl] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Filters
  const [filterSekolah, setFilterSekolah] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBulan, setFilterBulan] = useState<string>(
    new Date().toLocaleString('id-ID', { month: 'long' })
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Months List
  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // List of attendance records for the current assistant coach
  const myAbsenList = useMemo(() => {
    return absenAsistenList.filter(a => a.asistenId === currentUser.id);
  }, [absenAsistenList, currentUser.id]);

  // Filtered List for Table / Cards
  const filteredList = useMemo(() => {
    return myAbsenList.filter(item => {
      // Filter Sekolah
      if (filterSekolah !== 'all' && item.sekolahId !== filterSekolah) return false;
      // Filter Status
      if (filterStatus !== 'all' && item.statusKehadiran !== filterStatus) return false;
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchSekolah = item.sekolahNama.toLowerCase().includes(term);
        const matchKegiatan = (item.kegiatanPendampingan || '').toLowerCase().includes(term);
        const matchDivisi = (item.divisiBinaan || '').toLowerCase().includes(term);
        if (!matchSekolah && !matchKegiatan && !matchDivisi) return false;
      }
      return true;
    });
  }, [myAbsenList, filterSekolah, filterStatus, searchTerm]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = myAbsenList.length;
    const hadir = myAbsenList.filter(a => a.statusKehadiran === 'Hadir').length;
    const izin = myAbsenList.filter(a => a.statusKehadiran === 'Izin').length;
    const sakit = myAbsenList.filter(a => a.statusKehadiran === 'Sakit').length;
    const tugasLuar = myAbsenList.filter(a => a.statusKehadiran === 'Tugas Luar').length;
    const rate = total > 0 ? Math.round(((hadir + tugasLuar) / total) * 100) : 100;

    // Per school distribution
    const schoolCounts: { [schoolName: string]: number } = {};
    myAbsenList.forEach(a => {
      schoolCounts[a.sekolahNama] = (schoolCounts[a.sekolahNama] || 0) + 1;
    });

    // Monthly distribution
    const monthlyCounts: { [monthName: string]: number } = {};
    bulanList.forEach(b => { monthlyCounts[b] = 0; });
    myAbsenList.forEach(a => {
      if (a.tanggal) {
        const d = new Date(a.tanggal);
        const m = bulanList[d.getMonth()];
        if (monthlyCounts[m] !== undefined) {
          monthlyCounts[m]++;
        }
      }
    });

    return { total, hadir, izin, sakit, tugasLuar, rate, schoolCounts, monthlyCounts };
  }, [myAbsenList, bulanList]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawUrl = reader.result as string;
      const compressed = await compressImageDataUrl(rawUrl, 500, 0.65);
      setFotoDokumentasiUrl(compressed);
    };
    reader.readAsDataURL(file);
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    setSekolahId(sekolahList.length > 0 ? sekolahList[0].id : '');
    setJamMulai('14:00');
    setJamSelesai('17:00');
    setStatusKehadiran('Hadir');
    setDivisiBinaan('');
    setKegiatanPendampingan('');
    setFotoDokumentasiUrl('');
    setParafAsistenUrl('');
    setCatatan('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: AbsenAsistenPelatihItem) => {
    setEditingId(item.id);
    setTanggal(item.tanggal);
    setSekolahId(item.sekolahId);
    setJamMulai(item.jamMulai);
    setJamSelesai(item.jamSelesai);
    setStatusKehadiran(item.statusKehadiran);
    setDivisiBinaan(item.divisiBinaan || '');
    setKegiatanPendampingan(item.kegiatanPendampingan);
    setFotoDokumentasiUrl(item.fotoDokumentasiUrl || '');
    setParafAsistenUrl(item.parafAsistenUrl || '');
    setCatatan(item.catatan || '');
    setIsFormOpen(true);
  };

  // Save Attendance
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sekolahId) {
      alert('Pilih sekolah tempat pendampingan latihan!');
      return;
    }

    if (statusKehadiran === 'Hadir' && !kegiatanPendampingan.trim()) {
      alert('Mohon isi uraian kegiatan atau materi pendampingan latihan!');
      return;
    }

    const selectedSchoolObj = sekolahList.find(s => s.id === sekolahId);
    const namaSekolah = selectedSchoolObj ? selectedSchoolObj.namaSekolah : 'Sekolah';

    // Format Hari & Tanggal
    const d = new Date(tanggal);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const formatted = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    // Compress photo & paraf
    const compressedPhoto = fotoDokumentasiUrl
      ? await compressImageDataUrl(fotoDokumentasiUrl, 500, 0.65)
      : '';
    const compressedParaf = parafAsistenUrl
      ? await compressImageDataUrl(parafAsistenUrl, 300, 0.7)
      : '';

    const newRecord: AbsenAsistenPelatihItem = {
      id: editingId || `aba-${Date.now()}`,
      asistenId: currentUser.id,
      asistenName: currentUser.name,
      sekolahId,
      sekolahNama: namaSekolah,
      tahunAjaran: activeTahunAjaran,
      tanggal,
      hariTanggalFormat: formatted,
      jamMulai,
      jamSelesai,
      statusKehadiran,
      kegiatanPendampingan,
      divisiBinaan,
      fotoDokumentasiUrl: compressedPhoto,
      parafAsistenUrl: compressedParaf,
      catatan,
      createdAt: new Date().toISOString()
    };

    StorageService.saveAbsenAsisten(newRecord);
    setIsFormOpen(false);
    onDataChanged();
  };

  // Delete Attendance
  const handleDeleteAttendance = (id: string) => {
    if (confirm('Hapus riwayat absensi asisten pelatih ini?')) {
      StorageService.deleteAbsenAsisten(id);
      onDataChanged();
    }
  };

  // Monthly Report Data
  const monthlyReportData = useMemo(() => {
    return myAbsenList.filter(item => {
      if (!item.tanggal) return false;
      const d = new Date(item.tanggal);
      const m = bulanList[d.getMonth()];
      if (m !== filterBulan) return false;
      if (filterSekolah !== 'all' && item.sekolahId !== filterSekolah) return false;
      return true;
    });
  }, [myAbsenList, filterBulan, filterSekolah, bulanList]);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Hadir':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Hadir
          </span>
        );
      case 'Izin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3" /> Izin
          </span>
        );
      case 'Sakit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3 h-3" /> Sakit
          </span>
        );
      case 'Tugas Luar':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Building2 className="w-3 h-3" /> Tugas Luar
          </span>
        );
      default:
        return null;
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (monthlyReportData.length === 0) {
      alert('Tidak ada data absensi untuk diekspor pada bulan ini.');
      return;
    }

    const headers = ['No', 'Tanggal', 'Sekolah', 'Jam Masuk', 'Jam Pulang', 'Status', 'Divisi Binaan', 'Kegiatan Pendampingan', 'Catatan'];
    const rows = monthlyReportData.map((item, idx) => [
      idx + 1,
      item.hariTanggalFormat || item.tanggal,
      `"${item.sekolahNama.replace(/"/g, '""')}"`,
      item.jamMulai,
      item.jamSelesai,
      item.statusKehadiran,
      `"${(item.divisiBinaan || '').replace(/"/g, '""')}"`,
      `"${(item.kegiatanPendampingan || '').replace(/"/g, '""')}"`,
      `"${(item.catatan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Absensi_Asisten_${currentUser.name.replace(/\s+/g, '_')}_${filterBulan}_${activeTahunAjaran.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Profile & Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Portal Asisten Pelatih
                </span>
                <span className="text-xs font-medium text-slate-300">
                  TA: {activeTahunAjaran}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {currentUser.name}
              </h1>
              <p className="text-xs text-emerald-200/80">
                <span>Peran: <strong className="text-white font-semibold">Asisten Pembina / Pelatih</strong></span>
                {currentUser.phone && ` • HP: ${currentUser.phone}`}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Isi Absensi Latihan</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs gap-1">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'rekap'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Rekap Kehadiran</span>
        </button>

        <button
          onClick={() => setActiveTab('statistik')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'statistik'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistik Kehadiran</span>
        </button>

        <button
          onClick={() => setActiveTab('laporan')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'laporan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Bulanan (PDF/Cetak)</span>
        </button>
      </div>

      {/* ======================= TAB 1: REKAP KEHADIRAN ======================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Absensi</p>
                <p className="text-xl font-black text-slate-900">{stats.total} Sesi</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Hadir</p>
                <p className="text-xl font-black text-emerald-600">{stats.hadir} Kali</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Izin & Sakit</p>
                <p className="text-xl font-black text-amber-600">{stats.izin + stats.sakit} Kali</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Persentase Kehadiran</p>
                <p className="text-xl font-black text-teal-600">{stats.rate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama sekolah, materi pendampingan, atau divisi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Sekolah */}
                <select
                  value={filterSekolah}
                  onChange={(e) => setFilterSekolah(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Sekolah Binaan</option>
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Tugas Luar">Tugas Luar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records List / Cards */}
          {filteredList.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Catatan Absensi</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Klik tombol "Isi Absensi Latihan" di atas untuk mencatat kehadiran pendampingan latihan di sekolah binaan.
              </p>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Isi Absensi Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition p-4 flex flex-col justify-between space-y-3"
                >
                  {/* Top Bar: Date, School, Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                        {item.hariTanggalFormat || item.tanggal}
                      </span>
                      {renderStatusBadge(item.statusKehadiran)}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <School className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="line-clamp-1">{item.sekolahNama}</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.jamMulai} - {item.jamSelesai} WIB
                      </span>
                      {item.divisiBinaan && (
                        <span className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          <Layers className="w-3 h-3" />
                          {item.divisiBinaan}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Activity description */}
                  {item.kegiatanPendampingan && (
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 border border-slate-100">
                      <span className="font-semibold text-slate-900 block mb-0.5 text-[11px]">Uraian Kegiatan / Materi:</span>
                      <p className="line-clamp-2 text-slate-600">{item.kegiatanPendampingan}</p>
                    </div>
                  )}

                  {/* Documentation & Signatures Preview */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {item.fotoDokumentasiUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingPhotoUrl(item.fotoDokumentasiUrl || null)}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Foto Bukti</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Tanpa Foto</span>
                      )}

                      {item.parafAsistenUrl && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Bertanda Tangan</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Absensi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttendance(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Absensi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: STATISTIK KEHADIRAN ======================= */}
      {activeTab === 'statistik' && (
        <div className="space-y-5">
          {/* Main KPI Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-emerald-100">Total Sesi Latihan</span>
              <p className="text-3xl font-black mt-1">{stats.total}</p>
              <span className="text-[10px] text-emerald-200 mt-1 block">Tahun Ajaran {activeTahunAjaran}</span>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-blue-100">Tingkat Kehadiran</span>
              <p className="text-3xl font-black mt-1">{stats.rate}%</p>
              <span className="text-[10px] text-blue-200 mt-1 block">Hadir + Tugas Luar</span>
            </div>

            <div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-700 text-white rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-teal-100">Hadir Mandiri</span>
              <p className="text-3xl font-black mt-1">{stats.hadir}</p>
              <span className="text-[10px] text-teal-200 mt-1 block">Sesi di Lokasi Latihan</span>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-amber-100">Izin / Sakit</span>
              <p className="text-3xl font-black mt-1">{stats.izin + stats.sakit}</p>
              <span className="text-[10px] text-amber-200 mt-1 block">Izin: {stats.izin} | Sakit: {stats.sakit}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kehadiran per Sekolah */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <School className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Aktivitas Latihan per Sekolah</h3>
              </div>

              {Object.keys(stats.schoolCounts).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Belum ada aktivitas di sekolah manapun.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.schoolCounts).map(([schName, countVal]) => {
                    const count = countVal as number;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={schName} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800 line-clamp-1">{schName}</span>
                          <span className="font-bold text-emerald-700 shrink-0">{count} Sesi ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kehadiran per Bulan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">Distribusi Kehadiran Bulanan</h3>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {bulanList.map((m) => {
                  const cnt = stats.monthlyCounts[m] || 0;
                  return (
                    <div
                      key={m}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        cnt > 0
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200/70 text-slate-400 font-medium'
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-wider">{m.slice(0, 3)}</span>
                      <span className="text-base font-black">{cnt}</span>
                      <span className="block text-[9px] text-slate-500">sesi</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: LAPORAN BULANAN (PDF & PRINT) ======================= */}
      {activeTab === 'laporan' && (
        <div className="space-y-4">
          {/* Controls Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-600 font-semibold">Bulan:</span>
                <select
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {bulanList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <School className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-600 font-semibold">Sekolah:</span>
                <select
                  value={filterSekolah}
                  onChange={(e) => setFilterSekolah(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Sekolah Binaan</option>
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV / Excel</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Report Document Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md printable-area space-y-6">
            {/* Header Surat / Kop Resmi */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <TutWuriLogo className="w-14 h-14" />
                <MarchingBandLogo className="w-14 h-14" />
              </div>
              <div className="text-center flex-1 px-4">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  FORUM EKSTRAKURIKULER MARCHING BAND
                </h2>
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-800 uppercase">
                  LEMBAR REKAPITULASI & LAPORAN KEHADIRAN ASISTEN PELATIH
                </h3>
                <p className="text-[11px] text-slate-600">
                  Periode Bulan: <span className="font-bold text-slate-900">{filterBulan}</span> • Tahun Ajaran: <span className="font-bold text-slate-900">{activeTahunAjaran}</span>
                </p>
              </div>
              <div className="w-14 text-right">
                <div className="inline-block p-1.5 bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold rounded border border-emerald-200">
                  ASISTEN
                </div>
              </div>
            </div>

            {/* Asisten Bio Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Nama Asisten Pelatih:</span>
                <span className="font-bold text-slate-900">{currentUser.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">No. Telepon / WhatsApp:</span>
                <span className="font-semibold text-slate-800">{currentUser.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Total Sesi Hadir ({filterBulan}):</span>
                <span className="font-bold text-emerald-700">{monthlyReportData.length} Pertemuan</span>
              </div>
            </div>

            {/* Attendance Table */}
            {monthlyReportData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                Tidak ada data kehadiran yang tercatat untuk bulan {filterBulan}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-r border-slate-300 w-8 text-center">No</th>
                      <th className="p-2.5 border-r border-slate-300 w-32">Hari / Tanggal</th>
                      <th className="p-2.5 border-r border-slate-300">Sekolah Binaan</th>
                      <th className="p-2.5 border-r border-slate-300 w-24 text-center">Waktu (WIB)</th>
                      <th className="p-2.5 border-r border-slate-300 w-20 text-center">Status</th>
                      <th className="p-2.5 border-r border-slate-300">Uraian Pendampingan</th>
                      <th className="p-2.5 border-r border-slate-300 w-20 text-center">Bukti Foto</th>
                      <th className="p-2.5 w-24 text-center">Paraf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyReportData.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="p-2 border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">
                          {row.hariTanggalFormat || row.tanggal}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-medium">
                          {row.sekolahNama}
                          {row.divisiBinaan && (
                            <span className="block text-[10px] text-teal-700 font-semibold mt-0.5">
                              Section: {row.divisiBinaan}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center">
                          {row.jamMulai} - {row.jamSelesai}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.statusKehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {row.statusKehadiran}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-300 text-slate-700 leading-relaxed">
                          {row.kegiatanPendampingan || '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-300 text-center">
                          {row.fotoDokumentasiUrl ? (
                            <img
                              src={row.fotoDokumentasiUrl}
                              alt="Bukti"
                              className="w-12 h-10 object-cover rounded mx-auto border border-slate-200 cursor-pointer"
                              onClick={() => setViewingPhotoUrl(row.fotoDokumentasiUrl || null)}
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-1.5 text-center">
                          {row.parafAsistenUrl ? (
                            <img
                              src={row.parafAsistenUrl}
                              alt="Paraf"
                              className="h-8 max-w-[80px] object-contain mx-auto"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">V</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature Validation Footers */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-slate-800">
              <div className="text-center space-y-12">
                <p className="font-semibold text-slate-700">
                  Mengetahui,<br />
                  <span className="font-bold text-slate-900">Ketua / Administrator Forum</span>
                </p>
                <div className="pt-8 border-t border-slate-400 inline-block min-w-[180px]">
                  <span className="font-bold">( .................................................. )</span>
                </div>
              </div>

              <div className="text-center space-y-12">
                <p className="font-semibold text-slate-700">
                  Kabupaten Bogor, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                  <span className="font-bold text-slate-900">Asisten Pelatih Marching Band</span>
                </p>
                <div className="pt-8 border-t border-slate-400 inline-block min-w-[180px]">
                  <span className="font-bold underline uppercase">{currentUser.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL FORM ISI ABSENSI ======================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    {editingId ? 'Edit Absensi Asisten' : 'Isi Absensi Asisten Pelatih'}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Catat kehadiran & pendampingan latihan di sekolah binaan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveAttendance} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Tanggal & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Latihan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Kehadiran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={statusKehadiran}
                    onChange={(e) => setStatusKehadiran(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                  >
                    <option value="Hadir">Hadir (Di Lokasi Latihan)</option>
                    <option value="Tugas Luar">Tugas Luar / Pendampingan Lomba</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </div>
              </div>

              {/* Pilihan Sekolah (Semua sekolah yang telah diinput pelatih) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilihan Sekolah Binaan <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Daftar seluruh sekolah marching band yang telah didaftarkan oleh pelatih
                </p>
                <select
                  required
                  value={sekolahId}
                  onChange={(e) => setSekolahId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {sekolahList.length === 0 ? (
                    <option value="">Belum ada sekolah terdaftar di sistem</option>
                  ) : (
                    sekolahList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.namaSekolah} {s.kepalaSekolah ? `(Kepsek: ${s.kepalaSekolah})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Jam Mulai, Jam Selesai, Divisi Binaan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Section / Divisi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Battery, Pit, Brass"
                    value={divisiBinaan}
                    onChange={(e) => setDivisiBinaan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Uraian Kegiatan / Materi Pendampingan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uraian Kegiatan / Materi Pendampingan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsikan materi latihan yang didampingi, misal: Pemantapan tempo snare & bass drum, drill marching posisi 1-16, section brass..."
                  value={kegiatanPendampingan}
                  onChange={(e) => setKegiatanPendampingan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Foto Bukti Dokumentasi (Upload & Preview) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Foto Bukti Kehadiran / Dokumentasi Kegiatan
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition text-xs">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Ambil Foto / Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {fotoDokumentasiUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={fotoDokumentasiUrl}
                        alt="Preview"
                        className="w-12 h-10 object-cover rounded-lg border border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setFotoDokumentasiUrl('')}
                        className="text-rose-600 text-[11px] font-semibold hover:underline"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Digital Signature Pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Tanda Tangan Digital Asisten</label>
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(!showSignaturePad)}
                    className="text-emerald-700 hover:underline font-bold text-[11px]"
                  >
                    {showSignaturePad ? 'Sembunyikan Pad' : (parafAsistenUrl ? 'Ubah Tanda Tangan' : 'Buka Pad Tanda Tangan')}
                  </button>
                </div>

                {showSignaturePad ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <SignaturePad
                      onSave={(dataUrl) => {
                        setParafAsistenUrl(dataUrl);
                        setShowSignaturePad(false);
                      }}
                      initialDataUrl={parafAsistenUrl}
                    />
                  </div>
                ) : (
                  parafAsistenUrl && (
                    <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <img
                        src={parafAsistenUrl}
                        alt="Tanda Tangan"
                        className="h-10 max-w-[120px] object-contain"
                      />
                      <span className="text-[11px] text-emerald-800 font-medium">Tanda tangan tersimpan</span>
                    </div>
                  )
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan kendala alat, siswa berhalangan, dsb."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Absensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= PHOTO PREVIEW MODAL ======================= */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Bukti Foto Dokumentasi Kegiatan</span>
              <button
                onClick={() => setViewingPhotoUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <img
                src={viewingPhotoUrl}
                alt="Dokumentasi Full"
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
