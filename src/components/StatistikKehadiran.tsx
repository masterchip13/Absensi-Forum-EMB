import React, { useState, useMemo } from 'react';
import { Sekolah, Divisi, Anggota, AbsenSiswaEntry, AbsenPelatihItem } from '../types';
import {
  BarChart3,
  TrendingUp,
  Users,
  School,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  X,
  Sparkles,
  QrCode as QrIcon,
  ChevronRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { StorageService } from '../data/storage';

interface StatistikKehadiranProps {
  sekolahList: Sekolah[];
  divisiList: Divisi[];
  anggotaList: Anggota[];
  absenSiswaList: AbsenSiswaEntry[];
  absenPelatihList?: AbsenPelatihItem[];
  selectedSekolahId?: string;
  onSelectSekolah?: (id: string) => void;
}

export interface StudentAttendanceStat {
  student: Anggota;
  schoolName: string;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalRecorded: number;
  ratePercent: number;
  statusBadge: {
    label: string;
    color: string;
    bg: string;
    border: string;
  };
  logs: AbsenSiswaEntry[];
}

export const StatistikKehadiran: React.FC<StatistikKehadiranProps> = ({
  sekolahList,
  divisiList,
  anggotaList,
  absenSiswaList,
  selectedSekolahId,
  onSelectSekolah
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [filterBulan, setFilterBulan] = useState<string>('ALL');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState<string>(StorageService.getActiveTahunAjaran());
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [filterKelas, setFilterKelas] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rate_desc' | 'rate_asc' | 'nama_asc' | 'hadir_desc' | 'kelas_asc'>('rate_desc');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentAttendanceStat | null>(null);
  const [viewMode, setViewMode] = useState<'ranking_bar' | 'table_list' | 'category_pie'>('table_list');

  // Sync prop when external school changes
  React.useEffect(() => {
    if (selectedSekolahId && selectedSekolahId !== filterSekolahId) {
      setFilterSekolahId(selectedSekolahId);
    }
  }, [selectedSekolahId]);

  const handleSekolahChange = (id: string) => {
    setFilterSekolahId(id);
    if (onSelectSekolah && id !== 'ALL') {
      onSelectSekolah(id);
    }
  };

  // 1. Filtered Base Anggota by school
  const baseAnggotaList = useMemo(() => {
    if (filterSekolahId === 'ALL') return anggotaList;
    return anggotaList.filter((a) => a.sekolahId === filterSekolahId);
  }, [anggotaList, filterSekolahId]);

  // Available division and class options
  const availableDivisions = useMemo(() => {
    const setDiv = new Set<string>();
    baseAnggotaList.forEach((a) => {
      if (a.divisiNama && a.divisiNama.trim()) setDiv.add(a.divisiNama.trim());
    });
    return Array.from(setDiv);
  }, [baseAnggotaList]);

  const availableKelas = useMemo(() => {
    const setKls = new Set<string>();
    baseAnggotaList.forEach((a) => {
      if (a.kelas && a.kelas.trim()) setKls.add(a.kelas.trim());
    });
    return Array.from(setKls).sort();
  }, [baseAnggotaList]);

  // 2. Filtered Absen Logs
  const filteredAbsenLogs = useMemo(() => {
    return absenSiswaList.filter((log) => {
      if (filterSekolahId !== 'ALL' && log.sekolahId !== filterSekolahId) return false;
      if (filterBulan !== 'ALL' && log.bulan.toLowerCase() !== filterBulan.toLowerCase()) return false;
      if (filterTahunAjaran !== 'ALL' && log.tahunAjaran && log.tahunAjaran !== filterTahunAjaran) return false;
      return true;
    });
  }, [absenSiswaList, filterSekolahId, filterBulan, filterTahunAjaran]);

  // 3. Compute Per-Student Statistics
  const studentStats: StudentAttendanceStat[] = useMemo(() => {
    return baseAnggotaList.map((student) => {
      const studentSchool = sekolahList.find((s) => s.id === student.sekolahId)?.namaSekolah || 'Sekolah Binaan';
      const studentLogs = filteredAbsenLogs.filter((l) => l.anggotaId === student.id);

      const totalHadir = studentLogs.filter((l) => l.status === 'Hadir').length;
      const totalSakit = studentLogs.filter((l) => l.status === 'Sakit').length;
      const totalIzin = studentLogs.filter((l) => l.status === 'Izin').length;
      const totalAlpa = studentLogs.filter((l) => l.status === 'Alpa').length;
      const totalRecorded = studentLogs.length;

      // Rate calculation
      let ratePercent = 0;
      if (totalRecorded > 0) {
        ratePercent = Math.round((totalHadir / totalRecorded) * 100);
      } else {
        // If no records logged yet for this period, default to 100% if active, or 0%
        ratePercent = 100;
      }

      // Status Badge
      let statusBadge = {
        label: 'Sempurna (100%)',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200'
      };

      if (ratePercent >= 90 && ratePercent < 100) {
        statusBadge = {
          label: 'Sangat Baik (≥90%)',
          color: 'text-teal-700',
          bg: 'bg-teal-50',
          border: 'border-teal-200'
        };
      } else if (ratePercent >= 75 && ratePercent < 90) {
        statusBadge = {
          label: 'Baik (75-89%)',
          color: 'text-blue-700',
          bg: 'bg-blue-50',
          border: 'border-blue-200'
        };
      } else if (ratePercent >= 60 && ratePercent < 75) {
        statusBadge = {
          label: 'Cukup (60-74%)',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        };
      } else if (ratePercent < 60) {
        statusBadge = {
          label: 'Perlu Perhatian (<60%)',
          color: 'text-rose-700',
          bg: 'bg-rose-50',
          border: 'border-rose-200'
        };
      }

      return {
        student,
        schoolName: studentSchool,
        totalHadir,
        totalSakit,
        totalIzin,
        totalAlpa,
        totalRecorded,
        ratePercent,
        statusBadge,
        logs: studentLogs
      };
    });
  }, [baseAnggotaList, filteredAbsenLogs, sekolahList]);

  // 4. Apply Filters (Division, Class, Search) & Sorting on Per-Student Stats
  const processedStudentStats = useMemo(() => {
    let list = studentStats.filter((item) => {
      if (filterDivisi !== 'ALL' && item.student.divisiNama !== filterDivisi) return false;
      if (filterKelas !== 'ALL' && item.student.kelas !== filterKelas) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.student.nama.toLowerCase().includes(q);
        const matchKelas = item.student.kelas?.toLowerCase().includes(q);
        const matchDiv = item.student.divisiNama?.toLowerCase().includes(q);
        if (!matchName && !matchKelas && !matchDiv) return false;
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'rate_desc') {
        if (b.ratePercent !== a.ratePercent) return b.ratePercent - a.ratePercent;
        return b.totalHadir - a.totalHadir;
      }
      if (sortBy === 'rate_asc') {
        if (a.ratePercent !== b.ratePercent) return a.ratePercent - b.ratePercent;
        return a.totalHadir - b.totalHadir;
      }
      if (sortBy === 'hadir_desc') {
        return b.totalHadir - a.totalHadir;
      }
      if (sortBy === 'nama_asc') {
        return a.student.nama.localeCompare(b.student.nama);
      }
      if (sortBy === 'kelas_asc') {
        return (a.student.kelas || '').localeCompare(b.student.kelas || '');
      }
      return 0;
    });

    return list;
  }, [studentStats, filterDivisi, filterKelas, searchQuery, sortBy]);

  // Overall KPI Metrics for Students
  const overallStudentMetrics = useMemo(() => {
    const totalCount = studentStats.length;
    if (totalCount === 0) {
      return {
        totalStudents: 0,
        averageRate: 0,
        highAttendingCount: 0,
        needAttentionCount: 0,
        totalHadirLogs: 0
      };
    }

    const sumRates = studentStats.reduce((acc, curr) => acc + curr.ratePercent, 0);
    const averageRate = Math.round(sumRates / totalCount);
    const highAttendingCount = studentStats.filter((s) => s.ratePercent >= 85).length;
    const needAttentionCount = studentStats.filter((s) => s.ratePercent < 75).length;
    const totalHadirLogs = studentStats.reduce((acc, curr) => acc + curr.totalHadir, 0);

    return {
      totalStudents: totalCount,
      averageRate,
      highAttendingCount,
      needAttentionCount,
      totalHadirLogs
    };
  }, [studentStats]);

  // Top 5 Students Leaderboard (Most Diligent)
  const topStudents = useMemo(() => {
    return [...studentStats]
      .sort((a, b) => {
        if (b.ratePercent !== a.ratePercent) return b.ratePercent - a.ratePercent;
        return b.totalHadir - a.totalHadir;
      })
      .slice(0, 5);
  }, [studentStats]);

  // Distribution Categories breakdown
  const categoryDistribution = useMemo(() => {
    const categories = [
      { label: 'Sempurna (100%)', count: 0, color: '#059669', bg: 'bg-emerald-500' },
      { label: 'Sangat Baik (90-99%)', count: 0, color: '#0D9488', bg: 'bg-teal-500' },
      { label: 'Baik (75-89%)', count: 0, color: '#2563EB', bg: 'bg-blue-500' },
      { label: 'Cukup (60-74%)', count: 0, color: '#D97706', bg: 'bg-amber-500' },
      { label: 'Perlu Perhatian (<60%)', count: 0, color: '#DC2626', bg: 'bg-rose-500' }
    ];

    studentStats.forEach((s) => {
      if (s.ratePercent === 100) categories[0].count++;
      else if (s.ratePercent >= 90) categories[1].count++;
      else if (s.ratePercent >= 75) categories[2].count++;
      else if (s.ratePercent >= 60) categories[3].count++;
      else categories[4].count++;
    });

    const total = studentStats.length || 1;
    return categories.map((cat) => ({
      ...cat,
      percent: Math.round((cat.count / total) * 100)
    }));
  }, [studentStats]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      'No',
      'Nama Siswa / Anggota',
      'Sekolah',
      'Kelas',
      'Divisi',
      'Total Sesi Pertemuan',
      'Persentase Kehadiran (%)',
      'Kategori Status'
    ];

    const rows = processedStudentStats.map((item, idx) => [
      idx + 1,
      `"${item.student.nama}"`,
      `"${item.schoolName}"`,
      `"${item.student.kelas || '-'}"`,
      `"${item.student.divisiNama || '-'}"`,
      item.totalRecorded,
      `${item.ratePercent}%`,
      `"${item.statusBadge.label}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Statistik_Kehadiran_Siswa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeSchoolName = sekolahList.find((s) => s.id === filterSekolahId)?.namaSekolah || 'Seluruh Sekolah Binaan';

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              Statistik Kehadiran Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Analisis rekapitulasi, persentase kedisiplinan, dan evaluasi presensi per individu siswa di <b>{activeSchoolName}</b>
            </p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setViewMode('table_list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table_list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Daftar Siswa ({processedStudentStats.length})
          </button>
          <button
            onClick={() => setViewMode('ranking_bar')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'ranking_bar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Grafik Peringkat
          </button>
          <button
            onClick={() => setViewMode('category_pie')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'category_pie'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            Distribusi Kedisiplinan
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards Per Siswa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-100">Total Siswa Terdaftar</span>
            <Users className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">{overallStudentMetrics.totalStudents} <span className="text-xs font-normal">Siswa</span></p>
          <span className="text-[10px] text-blue-200">Di {activeSchoolName}</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-100">Rata-Rata Kehadiran</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{overallStudentMetrics.averageRate}%</p>
          <span className="text-[10px] text-emerald-200">Indeks Kedisiplinan Keseluruhan</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-100">Siswa Rajin (≥85%)</span>
            <Award className="w-4 h-4 text-indigo-200" />
          </div>
          <p className="text-2xl font-black">{overallStudentMetrics.highAttendingCount} <span className="text-xs font-normal">Siswa</span></p>
          <span className="text-[10px] text-indigo-200">Tingkat kehadiran tinggi</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-600 to-rose-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-100">Butuh Pembinaan (&lt;75%)</span>
            <AlertCircle className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-2xl font-black">{overallStudentMetrics.needAttentionCount} <span className="text-xs font-normal">Siswa</span></p>
          <span className="text-[10px] text-amber-200">Perlu evaluasi & follow-up</span>
        </div>
      </div>

      {/* Top 5 Most Diligent Students Podium / Leaderboard */}
      {topStudents.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-300">
                Top 5 Siswa Paling Rajin & Disiplin
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Peringkat Kehadiran Terbaik
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {topStudents.map((stat, idx) => {
              const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
              return (
                <div
                  key={stat.student.id}
                  onClick={() => setSelectedStudentDetail(stat)}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-3 flex flex-col justify-between transition cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">{medals[idx]}</span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        {stat.ratePercent}%
                      </span>
                    </div>
                    <h4 className="font-black text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                      {stat.student.nama}
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {stat.student.kelas ? `Kelas ${stat.student.kelas}` : 'Kelas -'} • {stat.student.divisiNama || 'Umum'}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                    <span><b>{stat.totalRecorded}</b> Sesi Pertemuan</span>
                    <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">Detail →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar for Students */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, kelas, divisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* School Selector */}
          <div className="flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={filterSekolahId}
              onChange={(e) => handleSekolahChange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer max-w-[160px]"
            >
              <option value="ALL">🏫 Semua Sekolah ({sekolahList.length})</option>
              {sekolahList.map((s) => (
                <option key={s.id} value={s.id}>
                  🏫 {s.namaSekolah}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              value={filterTahunAjaran}
              onChange={(e) => setFilterTahunAjaran(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🗓️ Semua Tahun Ajaran</option>
              {StorageService.getTahunAjaranList().map((t) => (
                <option key={t} value={t}>
                  🗓️ {t}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">📅 Semua Bulan</option>
              <option value="Agustus">Agustus</option>
              <option value="September">September</option>
              <option value="Oktober">Oktober</option>
              <option value="November">November</option>
              <option value="Desember">Desember</option>
              <option value="Januari">Januari</option>
              <option value="Februari">Februari</option>
              <option value="Maret">Maret</option>
              <option value="April">April</option>
              <option value="Mei">Mei</option>
              <option value="Juni">Juni</option>
            </select>
          </div>

          {/* Division Filter */}
          {availableDivisions.length > 0 && (
            <select
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Divisi ({availableDivisions.length})</option>
              {availableDivisions.map((d) => (
                <option key={d} value={d}>
                  Divisi {d}
                </option>
              ))}
            </select>
          )}

          {/* Class Filter */}
          {availableKelas.length > 0 && (
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {availableKelas.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Sort & Export CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="rate_desc">% Tertinggi (Terdisiplin)</option>
              <option value="rate_asc">% Terendah</option>
              <option value="hadir_desc">Total Hadir Terbanyak</option>
              <option value="nama_asc">Nama (A - Z)</option>
              <option value="kelas_asc">Kelas (Naik)</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Unduh file Excel CSV statistik kehadiran siswa"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE LIST OF STUDENTS (Default primary view) */}
      {viewMode === 'table_list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-black text-sm">
                Rekapitulasi Kehadiran Per Siswa ({processedStudentStats.length} Siswa)
              </h3>
            </div>
            <span className="text-xs text-slate-300">
              {activeSchoolName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Nama Siswa / Anggota</th>
                  <th className="p-3 text-center">Kelas</th>
                  <th className="p-3">Divisi / Alat</th>
                  <th className="p-3 text-center">Total Sesi</th>
                  <th className="p-3 text-center">Tingkat Kehadiran (%)</th>
                  <th className="p-3 text-center">Evaluasi</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {processedStudentStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Tidak ada data siswa yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  processedStudentStats.map((item, idx) => {
                    return (
                      <tr
                        key={item.student.id}
                        className="hover:bg-blue-50/40 transition group cursor-pointer"
                        onClick={() => setSelectedStudentDetail(item)}
                      >
                        <td className="p-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {item.student.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-xs leading-tight group-hover:text-blue-700 transition-colors">
                                {item.student.nama}
                              </p>
                              <p className="text-[10px] text-slate-400 font-normal">
                                {item.schoolName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {item.student.kelas || '-'}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                            {item.student.divisiNama || 'Umum'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {item.totalRecorded} Sesi
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-black text-xs text-slate-900 w-10 text-right">
                              {item.ratePercent}%
                            </span>
                            <div className="w-16 bg-slate-200 h-2.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.ratePercent >= 85
                                    ? 'bg-emerald-600'
                                    : item.ratePercent >= 75
                                    ? 'bg-blue-600'
                                    : item.ratePercent >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-rose-600'
                                }`}
                                style={{ width: `${item.ratePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.statusBadge.bg} ${item.statusBadge.color} ${item.statusBadge.border}`}
                          >
                            {item.statusBadge.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentDetail(item);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200 transition"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: RANKING HORIZONTAL BAR CHART PER SISWA */}
      {viewMode === 'ranking_bar' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Grafik Batang Persentase Kehadiran Per Siswa
              </h3>
              <p className="text-xs text-slate-500">
                Peringkat kedisiplinan dan absensi siswa marching band di {activeSchoolName}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              {processedStudentStats.length} Siswa
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {processedStudentStats.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">
                Tidak ada data siswa.
              </p>
            ) : (
              processedStudentStats.map((item, idx) => {
                let barBg = 'bg-emerald-500';
                if (item.ratePercent < 60) barBg = 'bg-rose-500';
                else if (item.ratePercent < 75) barBg = 'bg-amber-500';
                else if (item.ratePercent < 90) barBg = 'bg-blue-500';

                return (
                  <div
                    key={item.student.id}
                    onClick={() => setSelectedStudentDetail(item)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center font-bold text-slate-400 text-[11px]">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {item.student.nama}
                        </h4>
                        <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Kelas {item.student.kelas || '-'} • {item.student.divisiNama || 'Umum'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500">
                          {item.totalRecorded} Sesi Pertemuan
                        </span>
                        <span className="font-black text-xs text-slate-900 font-mono w-12 text-right">
                          {item.ratePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Bar visualization */}
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                        style={{ width: `${Math.max(item.ratePercent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: DISCIPLINE CATEGORY DISTRIBUTION */}
      {viewMode === 'category_pie' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-violet-600" />
                Distribusi Kategori Kedisiplinan Siswa
              </h3>
              <p className="text-xs text-slate-500">
                Segmentasi tingkat kehadiran siswa pada periode {filterBulan === 'ALL' ? 'Semua Bulan' : `Bulan ${filterBulan}`} ({activeSchoolName})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            {/* Category Cards */}
            <div className="space-y-2.5">
              {categoryDistribution.map((cat, idx) => (
                <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-900 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${cat.bg}`} />
                      {cat.label}
                    </span>
                    <span className="font-bold text-slate-800">
                      {cat.count} Siswa <span className="text-slate-400 font-normal">({cat.percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cat.bg}`}
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluation Guidance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Pedoman Penilaian Kehadiran Siswa:
              </h4>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><b>Sempurna (100%):</b> Sangat disiplin, hadir setiap jadwal latihan tanpa absen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <span><b>Sangat Baik (≥90%):</b> Konsisten berlatih, predikat nilai raport A.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span><b>Baik (75-89%):</b> Memenuhi standar kehadiran ekstrakurikuler, predikat B.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span><b>Cukup (60-74%):</b> Memerlukan motivasi tambahan agar tidak tertinggal materi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span><b>Perlu Perhatian (&lt;60%):</b> Pelatih perlu koordinasi dengan wali kelas / pembina sekolah.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow">
                  {selectedStudentDetail.student.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight text-white">
                    {selectedStudentDetail.student.nama}
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    {selectedStudentDetail.schoolName} • Kelas {selectedStudentDetail.student.kelas || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 block">Persentase</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedStudentDetail.ratePercent}%
                  </p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${selectedStudentDetail.statusBadge.bg} ${selectedStudentDetail.statusBadge.color}`}>
                    {selectedStudentDetail.statusBadge.label}
                  </span>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="text-[10px] font-semibold text-blue-700 block">Total Sesi Tercatat</span>
                  <p className="text-xl font-black text-blue-800 mt-0.5">
                    {selectedStudentDetail.totalRecorded} <span className="text-xs font-normal">Sesi</span>
                  </p>
                  <span className="text-[9px] text-blue-600 font-medium">Log Presensi</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 block">Divisi Instrumen</span>
                  <p className="text-sm font-black text-slate-900 mt-1 truncate">
                    {selectedStudentDetail.student.divisiNama || 'Umum'}
                  </p>
                  <span className="text-[9px] text-slate-400">Marching Band</span>
                </div>
              </div>

              {/* Riwayat Absensi Terinci */}
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 mb-2">
                  Riwayat Pertemuan & Presensi Terdata ({selectedStudentDetail.logs.length}):
                </h4>

                {selectedStudentDetail.logs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-xl">
                    Belum ada log presensi tersimpan untuk siswa ini pada filter periode terpilih.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedStudentDetail.logs.map((log, lIdx) => {
                      return (
                        <div
                          key={log.id || lIdx}
                          className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              Pertemuan {log.kolomMinggu || 1} • {log.bulan} {log.tahunAjaran ? `(${log.tahunAjaran})` : ''}
                            </span>
                            {log.keterangan && (
                              <p className="text-[10px] text-slate-400">{log.keterangan}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Terkonfirmasi
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 text-right border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
