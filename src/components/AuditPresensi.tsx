import React, { useState, useMemo } from 'react';
import { Sekolah, Anggota, AbsenSiswaEntry, User } from '../types';
import { formatNamaKapital, formatKelasAngka } from '../utils/nameFormatter';
import { BULAN_OPTIONS, getCurrentMonthName } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  School,
  Download,
  Printer,
  ChevronDown,
  ArrowUpDown,
  UserX,
  UserCheck,
  TrendingDown,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';

interface AuditPresensiProps {
  sekolahList: Sekolah[];
  anggotaList: Anggota[];
  absenSiswaList: AbsenSiswaEntry[];
  usersList: User[];
}

export const AuditPresensi: React.FC<AuditPresensiProps> = ({
  sekolahList,
  anggotaList,
  absenSiswaList,
  usersList
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>('all');
  const [filterBulan, setFilterBulan] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<'all' | 'kritis' | 'perhatian' | 'ada_alfa'>('all');
  const [sortOrder, setSortOrder] = useState<'lowest' | 'highest' | 'alfa' | 'nama'>('lowest');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const bulanOptions = BULAN_OPTIONS;

  // Map school ID to Pelatih info
  const schoolPelatihMap = useMemo(() => {
    const map = new Map<string, string>();
    sekolahList.forEach(s => {
      const pelatih = usersList.find(u => u.id === s.pelatihId);
      map.set(s.id, pelatih ? pelatih.name : 'Belum Ditugaskan');
    });
    return map;
  }, [sekolahList, usersList]);

  // Compute attendance audit metrics for each member
  const auditData = useMemo(() => {
    return anggotaList.map(member => {
      const school = sekolahList.find(s => s.id === member.sekolahId);
      const schoolName = school?.namaSekolah || 'Sekolah Tidak Diketahui';
      const pelatihName = schoolPelatihMap.get(member.sekolahId) || '-';

      // Filter records for this student
      const studentRecords = absenSiswaList.filter(rec => {
        if (rec.anggotaId !== member.id) return false;
        if (filterBulan !== 'all' && rec.bulan && rec.bulan.toLowerCase() !== filterBulan.toLowerCase()) {
          return false;
        }
        return true;
      });

      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alfa = 0;

      studentRecords.forEach(rec => {
        const st = (rec.status || '').toLowerCase();
        if (st === 'hadir') hadir++;
        else if (st === 'izin') izin++;
        else if (st === 'sakit') sakit++;
        else if (st === 'alfa' || st === 'alpa') alfa++;
      });

      const totalTercatat = hadir + izin + sakit + alfa;
      // Calculate attendance rate (standard: Hadir / Total * 100). If no records, 0%.
      const persentaseHadir = totalTercatat > 0 ? Math.round((hadir / totalTercatat) * 100) : 0;

      // Evaluation Status
      let statusEvaluasi: 'kritis' | 'perhatian' | 'cukup' | 'baik';
      if (totalTercatat === 0 || persentaseHadir < 50 || alfa >= 3) {
        statusEvaluasi = 'kritis';
      } else if (persentaseHadir < 75 || alfa >= 1) {
        statusEvaluasi = 'perhatian';
      } else if (persentaseHadir < 85) {
        statusEvaluasi = 'cukup';
      } else {
        statusEvaluasi = 'baik';
      }

      return {
        member,
        schoolName,
        pelatihName,
        hadir,
        izin,
        sakit,
        alfa,
        totalTercatat,
        persentaseHadir,
        statusEvaluasi
      };
    });
  }, [anggotaList, sekolahList, absenSiswaList, filterBulan, schoolPelatihMap]);

  // Filter and Sort Audit Data
  const filteredAndSortedData = useMemo(() => {
    return auditData
      .filter(item => {
        // Filter Sekolah
        if (filterSekolahId !== 'all' && item.member.sekolahId !== filterSekolahId) {
          return false;
        }

        // Filter Kategori Evaluasi
        if (filterKategori === 'kritis' && item.statusEvaluasi !== 'kritis') {
          return false;
        }
        if (filterKategori === 'perhatian' && item.statusEvaluasi !== 'perhatian' && item.statusEvaluasi !== 'kritis') {
          return false;
        }
        if (filterKategori === 'ada_alfa' && item.alfa === 0) {
          return false;
        }

        // Search Term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = item.member.nama.toLowerCase().includes(term);
          const matchSchool = item.schoolName.toLowerCase().includes(term);
          const matchDivisi = (item.member.divisiNama || '').toLowerCase().includes(term);
          const matchKelas = formatKelasAngka(item.member.kelas).toLowerCase().includes(term);
          return matchName || matchSchool || matchDivisi || matchKelas;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'lowest') {
          // Sort by lowest attendance percentage first (0% first)
          if (a.persentaseHadir !== b.persentaseHadir) {
            return a.persentaseHadir - b.persentaseHadir;
          }
          // If tie, sort by most alfa
          return b.alfa - a.alfa;
        }
        if (sortOrder === 'highest') {
          return b.persentaseHadir - a.persentaseHadir;
        }
        if (sortOrder === 'alfa') {
          return b.alfa - a.alfa;
        }
        if (sortOrder === 'nama') {
          return a.member.nama.localeCompare(b.member.nama);
        }
        return 0;
      });
  }, [auditData, filterSekolahId, filterKategori, searchTerm, sortOrder]);

  // Overview Summary Counts
  const summary = useMemo(() => {
    const total = auditData.length;
    const kritisCount = auditData.filter(d => d.statusEvaluasi === 'kritis').length;
    const perhatianCount = auditData.filter(d => d.statusEvaluasi === 'perhatian').length;
    const totalPct = auditData.reduce((acc, curr) => acc + curr.persentaseHadir, 0);
    const avgAttendance = total > 0 ? Math.round(totalPct / total) : 0;

    return { total, kritisCount, perhatianCount, avgAttendance };
  }, [auditData]);

  // Export Audit to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAndSortedData.map((item, idx) => ({
        'Peringkat': idx + 1,
        'Nama Anggota': formatNamaKapital(item.member.nama),
        'Kelas': formatKelasAngka(item.member.kelas),
        'Divisi': item.member.divisiNama || 'Umum',
        'Asal Sekolah': item.schoolName,
        'Pelatih Pembina': item.pelatihName,
        'Hadir': item.hadir,
        'Izin': item.izin,
        'Sakit': item.sakit,
        'Alfa / Alpa': item.alfa,
        'Total Pertemuan': item.totalTercatat,
        'Persentase Hadir (%)': `${item.persentaseHadir}%`,
        'Status Evaluasi': item.statusEvaluasi.toUpperCase()
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Presensi');

      const fileName = `Audit_Presensi_Terendah_${filterBulan}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('Gagal mengekspor data audit.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-rose-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>AUDIT EVALUASI PRESENSI KHUSUS ADMIN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Audit Anggota Kehadiran Paling Rendah
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Memantau daftar anggota ekstrakurikuler marching band dengan tingkat presensi paling rendah di setiap sekolah guna memudahkan evaluasi, tindak lanjut pembinaan, dan koordinasi dengan pelatih.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              title="Unduh seluruh daftar hasil audit ke format Microsoft Excel"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-md transition cursor-pointer"
              title="Cetak tabel evaluasi audit presensi"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Cetak Hasil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Total Anggota</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Seluruh sekolah binaan</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold">Kategori Kritis</span>
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">{summary.kritisCount}</div>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Kehadiran &lt; 50% atau Alfa &ge; 3</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold">Perlu Pembinaan</span>
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800">{summary.perhatianCount}</div>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Kehadiran 50% - 74%</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Rata-Rata Kehadiran</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{summary.avgAttendance}%</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Tingkat kehadiran umum</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Filter & Pengaturan Audit:</span>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Menampilkan <span className="text-rose-600 font-black">{filteredAndSortedData.length}</span> dari {auditData.length} siswa
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Pilih Sekolah */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-blue-600" />
              Sekolah:
            </label>
            <select
              value={filterSekolahId}
              onChange={(e) => setFilterSekolahId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">🏫 Semua Sekolah Binaan</option>
              {sekolahList.map(s => (
                <option key={s.id} value={s.id}>{s.namaSekolah}</option>
              ))}
            </select>
          </div>

          {/* Pilih Bulan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Bulan Laporan:
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">📅 Semua Bulan (Akumulatif)</option>
              {bulanOptions.map(b => (
                <option key={b} value={b}>
                  {b} {b === getCurrentMonthName() ? '★ (Bulan Berjalan)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori Kehadiran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Status Evaluasi:
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Semua Status</option>
              <option value="kritis">🔴 Hanya Kritis (&lt; 50%)</option>
              <option value="perhatian">🟠 Perlu Pembinaan (&lt; 75%)</option>
              <option value="ada_alfa">⚠️ Ada Catatan Alfa</option>
            </select>
          </div>

          {/* Urutan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              Urutkan Berdasarkan:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              <option value="lowest">📉 Kehadiran Paling Rendah (Utama)</option>
              <option value="highest">📈 Kehadiran Paling Tinggi</option>
              <option value="alfa">⚠️ Jumlah Alfa Terbanyak</option>
              <option value="nama">🔤 Nama Anggota (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama anggota, kelas (contoh: 7-1), divisi, atau sekolah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>Daftar Evaluasi Presensi Anggota</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-bold">
              Prioritas Evaluasi
            </span>
          </h3>

          <div className="text-[11px] text-slate-400">
            *Daftar diurutkan mulai dari kehadiran paling minim untuk kemudahan tindakan pembinaan
          </div>
        </div>

        {filteredAndSortedData.length === 0 ? (
          <div className="text-center py-16 bg-slate-50">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Tidak Ada Data Anggota Yang Sesuai Filter</p>
            <p className="text-xs text-slate-500 mt-1">
              Seluruh anggota di sekolah dan kriteria ini memiliki tingkat presensi yang baik.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Nama Anggota</th>
                  <th className="p-3">Sekolah & Pelatih</th>
                  <th className="p-3 text-center">Kelas</th>
                  <th className="p-3">Divisi</th>
                  <th className="p-3 text-center">Rincian Presensi</th>
                  <th className="p-3 text-center w-36">Tingkat Hadir</th>
                  <th className="p-3 text-center">Status Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedData.map((item, idx) => {
                  const isLowestTier = idx < 3 && item.persentaseHadir < 50;

                  return (
                    <tr
                      key={item.member.id}
                      className={`hover:bg-slate-50 transition ${isLowestTier ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="p-3 text-center font-bold">
                        {idx + 1 <= 3 && sortOrder === 'lowest' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-xs">
                            #{idx + 1}
                          </span>
                        ) : (
                          <span className="text-slate-500">{idx + 1}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {formatNamaKapital(item.member.nama)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {item.member.id}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800">{item.schoolName}</div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>Pelatih:</span>
                          <span className="font-semibold text-slate-700">{item.pelatihName}</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 text-xs border border-slate-200">
                          {formatKelasAngka(item.member.kelas) || '-'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-blue-700 bg-blue-50 border border-blue-200 text-[11px]">
                          {item.member.divisiNama || 'Umum'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" title="Hadir">
                            H: {item.hadir}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800" title="Izin">
                            I: {item.izin}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Sakit">
                            S: {item.sakit}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800" title="Alfa / Tanpa Keterangan">
                            A: {item.alfa}
                          </span>
                        </div>
                        <div className="text-[9.5px] text-slate-400 mt-1">
                          Total {item.totalTercatat} Sesi
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-between text-xs font-black mb-1">
                          <span
                            className={
                              item.persentaseHadir < 50
                                ? 'text-rose-600'
                                : item.persentaseHadir < 75
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {item.persentaseHadir}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">kehadiran</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.persentaseHadir < 50
                                ? 'bg-rose-500'
                                : item.persentaseHadir < 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(item.persentaseHadir, 100)}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {item.statusEvaluasi === 'kritis' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            KRITIS
                          </span>
                        )}
                        {item.statusEvaluasi === 'perhatian' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            PERLU PEMBINAAN
                          </span>
                        )}
                        {item.statusEvaluasi === 'cukup' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            CUKUP
                          </span>
                        )}
                        {item.statusEvaluasi === 'baik' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            BAIK
                          </span>
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

      {/* Action Recommendation Guide Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950 mb-0.5">Panduan Tindak Lanjut Audit Presensi:</h4>
          <p className="leading-relaxed text-amber-800">
            Anggota dengan status <b>KRITIS (&lt; 50% kehadiran atau &ge; 3 Alfa)</b> disarankan untuk segera dikoordinasikan dengan pelatih utama dan asisten sekolah terkait guna melakukan verifikasi kendala (jadwal bentrok, izin khusus, atau kendala seragam/alat), serta memberikan surat pemberitahuan ke wali kelas atau orang tua siswa.
          </p>
        </div>
      </div>
    </div>
  );
};
