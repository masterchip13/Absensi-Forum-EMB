import React, { useState, useMemo } from 'react';
import { Sekolah, Divisi, Anggota, AbsenSiswaEntry, AbsenPelatihItem } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  School,
  Award,
  Calendar,
  CheckCircle2,
  Layers,
  Building2
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

const PALETTE = [
  '#2563EB', // Blue
  '#D97706', // Amber
  '#059669', // Emerald
  '#7C3AED', // Violet
  '#DC2626', // Red
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#E11D48', // Rose
  '#0D9488', // Teal
  '#D97706'  // Orange
];

const getDivisionColor = (divName: string, index: number): string => {
  const norm = divName.toLowerCase();
  if (norm.includes('brass') || norm.includes('tiup')) return '#2563EB';
  if (norm.includes('battery') || norm.includes('percussion') || norm.includes('perkusi')) return '#D97706';
  if (norm.includes('pit') || norm.includes('pianika')) return '#059669';
  if (norm.includes('guard') || norm.includes('flag')) return '#7C3AED';
  if (norm.includes('commander') || norm.includes('mayoret') || norm.includes('field')) return '#DC2626';
  return PALETTE[index % PALETTE.length];
};

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
  const [chartType, setChartType] = useState<'attendance' | 'count' | 'distribution'>('attendance');
  const [activeViewTab, setActiveViewTab] = useState<'divisi' | 'sekolah'>('divisi');

  // Sync prop if provided
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

  // Filtered members & attendance
  const filteredAnggota = useMemo(() => {
    if (filterSekolahId === 'ALL') return anggotaList;
    return anggotaList.filter((a) => a.sekolahId === filterSekolahId);
  }, [anggotaList, filterSekolahId]);

  const filteredAbsen = useMemo(() => {
    return absenSiswaList.filter((a) => {
      if (filterSekolahId !== 'ALL' && a.sekolahId !== filterSekolahId) return false;
      if (filterBulan !== 'ALL' && a.bulan.toLowerCase() !== filterBulan.toLowerCase()) return false;
      if (filterTahunAjaran !== 'ALL' && a.tahunAjaran && a.tahunAjaran !== filterTahunAjaran) return false;
      return true;
    });
  }, [absenSiswaList, filterSekolahId, filterBulan, filterTahunAjaran]);

  // Determine divisions input by pelatih and present in members
  const relevantDivisions = useMemo(() => {
    const setOfDivisions = new Set<string>();

    // 1. Get divisions input by pelatih (filter by school's pelatih if school selected)
    let pelatihDivs = divisiList;
    if (filterSekolahId !== 'ALL') {
      const activeSchool = sekolahList.find((s) => s.id === filterSekolahId);
      if (activeSchool) {
        pelatihDivs = divisiList.filter((d) => d.pelatihId === activeSchool.pelatihId);
      }
    }

    pelatihDivs.forEach((d) => {
      if (d.namaDivisi && d.namaDivisi.trim()) {
        setOfDivisions.add(d.namaDivisi.trim());
      }
    });

    // 2. Also include any division assigned to members of the selected school/all
    filteredAnggota.forEach((a) => {
      if (a.divisiNama && a.divisiNama.trim()) {
        setOfDivisions.add(a.divisiNama.trim());
      }
    });

    const divList = Array.from(setOfDivisions);
    if (divList.length === 0) {
      return ['Brass', 'Percussion', 'Color Guard'];
    }
    return divList;
  }, [divisiList, filteredAnggota, filterSekolahId, sekolahList]);

  // Aggregate Data by Division (Inputted by Pelatih)
  const divisionStats = useMemo(() => {
    return relevantDivisions.map((divName, idx) => {
      // Find members in this division
      const membersInDiv = filteredAnggota.filter((a) => {
        if (!a.divisiNama) return false;
        const normMemberDiv = a.divisiNama.trim().toLowerCase();
        const normTargetDiv = divName.trim().toLowerCase();
        return normMemberDiv === normTargetDiv || normMemberDiv.includes(normTargetDiv) || normTargetDiv.includes(normMemberDiv);
      });

      const memberIds = new Set(membersInDiv.map((m) => m.id));

      // Attendance logs for these members (Hadir status)
      const logsForDiv = filteredAbsen.filter((abs) => memberIds.has(abs.anggotaId));
      const totalHadir = logsForDiv.filter((l) => l.status === 'Hadir').length;
      const totalRecordedLogs = logsForDiv.length;

      // Rate calculation: Hadir / Total Logs recorded
      const attendanceRate = totalRecordedLogs > 0
        ? Math.round((totalHadir / totalRecordedLogs) * 100)
        : membersInDiv.length > 0 ? 100 : 0;

      const shortName = divName.split('(')[0].trim();
      const color = getDivisionColor(divName, idx);

      return {
        namaDivisi: divName,
        shortName,
        totalMembers: membersInDiv.length,
        hadir: totalHadir,
        totalLogs: totalRecordedLogs,
        ratePercent: attendanceRate,
        color
      };
    });
  }, [relevantDivisions, filteredAnggota, filteredAbsen]);

  // Aggregate Data by School for School-level Attendance Comparison
  const schoolStats = useMemo(() => {
    return sekolahList.map((sch) => {
      const membersInSch = anggotaList.filter((a) => a.sekolahId === sch.id);
      const memberIds = new Set(membersInSch.map((m) => m.id));

      const logsForSch = absenSiswaList.filter((abs) => {
        if (abs.sekolahId !== sch.id) return false;
        if (filterBulan !== 'ALL' && abs.bulan.toLowerCase() !== filterBulan.toLowerCase()) return false;
        if (filterTahunAjaran !== 'ALL' && abs.tahunAjaran && abs.tahunAjaran !== filterTahunAjaran) return false;
        return true;
      });

      const totalHadir = logsForSch.filter((l) => l.status === 'Hadir').length;
      const totalLogs = logsForSch.length;

      const ratePercent = totalLogs > 0
        ? Math.round((totalHadir / totalLogs) * 100)
        : membersInSch.length > 0 ? 100 : 0;

      return {
        sekolahId: sch.id,
        namaSekolah: sch.namaSekolah,
        totalMembers: membersInSch.length,
        hadir: totalHadir,
        totalLogs,
        ratePercent
      };
    });
  }, [sekolahList, anggotaList, absenSiswaList, filterBulan, filterTahunAjaran]);

  // Overall KPI Metrics
  const overallMetrics = useMemo(() => {
    const totalMembers = filteredAnggota.length;
    const totalLogs = filteredAbsen.length;
    const totalHadir = filteredAbsen.filter((a) => a.status === 'Hadir').length;

    const overallRate = totalLogs > 0
      ? Math.round((totalHadir / totalLogs) * 100)
      : totalMembers > 0 ? 100 : 0;

    // Top division by attendance rate
    const sortedDivs = [...divisionStats].sort((a, b) => b.ratePercent - a.ratePercent);
    const topDivision = sortedDivs[0]?.shortName || '-';

    return {
      totalMembers,
      overallRate,
      totalHadir,
      totalLogs,
      topDivision
    };
  }, [filteredAnggota, filteredAbsen, divisionStats]);

  // Pie chart distribution
  const pieDistributionData = useMemo(() => {
    return divisionStats
      .filter((d) => d.totalMembers > 0)
      .map((d) => ({
        name: d.shortName,
        value: d.totalMembers,
        color: d.color
      }));
  }, [divisionStats]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700">
          <p className="font-extrabold text-amber-400 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <strong className="font-mono text-white">{entry.value} {entry.unit || ''}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
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
              Statistik Kehadiran Anggota Marching Band
            </h2>
            <p className="text-xs text-slate-500">
              Analisis persentase dan jumlah presensi hadir berdasarkan divisi pelatih di <b>{activeSchoolName}</b>
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setChartType('attendance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              chartType === 'attendance'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            % Kehadiran
          </button>
          <button
            onClick={() => setChartType('count')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              chartType === 'count'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Siswa Hadir
          </button>
          <button
            onClick={() => setChartType('distribution')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              chartType === 'distribution'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            Proporsi Divisi
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-100">Total Anggota</span>
            <Users className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-2xl font-black">{overallMetrics.totalMembers} <span className="text-xs font-normal">Siswa</span></p>
          <span className="text-[10px] text-blue-200">Terdaftar di {activeSchoolName}</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-100">Tingkat Kehadiran</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black">{overallMetrics.overallRate}%</p>
          <span className="text-[10px] text-emerald-200">Rata-rata Kehadiran Anggota</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-100">Presensi Hadir</span>
            <Calendar className="w-4 h-4 text-indigo-200" />
          </div>
          <p className="text-2xl font-black">{overallMetrics.totalHadir} <span className="text-xs font-normal">Log</span></p>
          <span className="text-[10px] text-indigo-200">Siswa Hadir Latihan</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-100">Divisi Paling Aktif</span>
            <Award className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-lg font-black truncate">{overallMetrics.topDivision}</p>
          <span className="text-[10px] text-amber-200">Tingkat Kehadiran Tertinggi</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* School Selector */}
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={filterSekolahId}
              onChange={(e) => handleSekolahChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🏫 Seluruh Sekolah Binaan ({sekolahList.length})</option>
              {sekolahList.map((s) => (
                <option key={s.id} value={s.id}>
                  🏫 {s.namaSekolah}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <select
              value={filterTahunAjaran}
              onChange={(e) => setFilterTahunAjaran(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🗓️ Semua Tahun Ajaran</option>
              {StorageService.getTahunAjaranList().map((t) => (
                <option key={t} value={t}>
                  🗓️ Th. Ajaran {t}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">📅 Semua Bulan</option>
              <option value="Agustus">Agustus</option>
              <option value="September">September</option>
              <option value="Oktober">Oktober</option>
              <option value="November">November</option>
              <option value="Desember">Desember</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
          Divisi Pelatih: {divisionStats.length} Divisi
        </span>
      </div>

      {/* Graphical Chart Container */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              {chartType === 'attendance' && <BarChart3 className="w-4 h-4 text-blue-600" />}
              {chartType === 'count' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
              {chartType === 'distribution' && <PieChartIcon className="w-4 h-4 text-violet-600" />}
              {chartType === 'attendance' && 'Grafik Persentase Kehadiran (%) Per Divisi Input Pelatih'}
              {chartType === 'count' && 'Grafik Total Siswa Hadir Per Divisi'}
              {chartType === 'distribution' && 'Diagram Proporsi Jumlah Anggota Per Divisi'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeSchoolName} • {filterBulan === 'ALL' ? 'Seluruh Periode Latihan' : `Bulan ${filterBulan}`}
            </p>
          </div>
        </div>

        {/* Dynamic Chart Display based on chartType */}
        <div className="h-72 w-full pt-2">
          {chartType === 'attendance' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar
                  dataKey="ratePercent"
                  name="Tingkat Kehadiran (%)"
                  fill="#2563EB"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                >
                  {divisionStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'count' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar
                  dataKey="hadir"
                  name="Siswa Hadir (Log)"
                  fill="#059669"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                >
                  {divisionStats.map((entry, index) => (
                    <Cell
                      key={`cell-count-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'distribution' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={pieDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* View Sub-Tabs: Per Divisi vs Per Sekolah */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeViewTab === 'divisi' ? <Layers className="w-5 h-5 text-amber-400" /> : <Building2 className="w-5 h-5 text-blue-400" />}
            <h3 className="font-extrabold text-sm">
              {activeViewTab === 'divisi'
                ? `Tabel Rekapitulasi Presensi Per Divisi (${activeSchoolName})`
                : 'Tabel Rekapitulasi Presensi Anggota Per Sekolah'}
            </h3>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveViewTab('divisi')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeViewTab === 'divisi' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Rincian Divisi Pelatih
            </button>
            <button
              onClick={() => setActiveViewTab('sekolah')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeViewTab === 'sekolah' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Statistik Per Sekolah ({sekolahList.length})
            </button>
          </div>
        </div>

        {/* TAB 1: Breakdown Per Divisi Pelatih */}
        {activeViewTab === 'divisi' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Nama Divisi (Input Pelatih)</th>
                  <th className="p-3 text-center">Jumlah Anggota</th>
                  <th className="p-3 text-center text-emerald-700">Siswa Hadir</th>
                  <th className="p-3 text-center">Tingkat Kehadiran (%)</th>
                  <th className="p-3 text-center">Status Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {divisionStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                      Belum ada data divisi yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  divisionStats.map((stat, idx) => {
                    let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let badgeText = 'Sangat Baik (≥85%)';

                    if (stat.ratePercent < 75) {
                      badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                      badgeText = 'Perlu Perhatian (<75%)';
                    } else if (stat.ratePercent < 85) {
                      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                      badgeText = 'Cukup Baik (75-84%)';
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: stat.color }}
                          />
                          <span>{stat.namaDivisi}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{stat.totalMembers} Siswa</td>
                        <td className="p-3 text-center font-mono text-emerald-700 font-bold text-sm">
                          {stat.hadir} <span className="text-[10px] font-normal text-slate-400">Log</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{stat.ratePercent}%</span>
                            <div className="w-20 bg-slate-200 h-2.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  stat.ratePercent >= 85
                                    ? 'bg-emerald-600'
                                    : stat.ratePercent >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-600'
                                }`}
                                style={{ width: `${stat.ratePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                            {badgeText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Breakdown Per Sekolah */}
        {activeViewTab === 'sekolah' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Nama Sekolah Binaan</th>
                  <th className="p-3 text-center">Jumlah Anggota</th>
                  <th className="p-3 text-center text-emerald-700">Siswa Hadir</th>
                  <th className="p-3 text-center">Tingkat Kehadiran (%)</th>
                  <th className="p-3 text-center">Aksi Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {schoolStats.map((sch, idx) => {
                  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  if (sch.ratePercent < 75) {
                    badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                  } else if (sch.ratePercent < 85) {
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                  }

                  const isSelected = sch.sekolahId === filterSekolahId;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <School className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{sch.namaSekolah}</span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{sch.totalMembers} Siswa</td>
                      <td className="p-3 text-center font-mono text-emerald-700 font-bold text-sm">
                        {sch.hadir} <span className="text-[10px] font-normal text-slate-400">Log</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{sch.ratePercent}%</span>
                          <div className="w-20 bg-slate-200 h-2.5 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                sch.ratePercent >= 85
                                  ? 'bg-emerald-600'
                                  : sch.ratePercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-rose-600'
                              }`}
                              style={{ width: `${sch.ratePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            handleSekolahChange(sch.sekolahId);
                            setActiveViewTab('divisi');
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition"
                        >
                          Lihat Divisi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
