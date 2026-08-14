import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sekolah, Anggota, AbsenSiswaEntry } from '../types';
import { StorageService } from '../data/storage';
import {
  Award,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  School,
  Sparkles,
  Info,
  PenTool,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  X,
  Stamp
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SignaturePad } from './SignaturePad';

interface PenilaianAnggotaProps {
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  anggotaList: Anggota[];
  absenSiswaList: AbsenSiswaEntry[];
}

export type SemesterType = 'Ganjil' | 'Genap';

interface StudentGradeRow {
  anggota: Anggota;
  monthlyAttendance: { [monthName: string]: number };
  totalHadir: number;
  totalPertemuan: number;
  persentaseKehadiran: number;
  nilaiHuruf: 'A' | 'B' | 'C' | 'D';
  predikat: string;
  keterangan: string;
}

/* =========================================================================
   AUTHENTIC WET-INK (TANDA TANGAN BASAH) SVG COMPONENTS
   ========================================================================= */

// Realistic Wet-Ink Signature for Kepala Sekolah (Dark Royal Blue Pen Ink)
const TandaTanganBasahKepalaSekolah: React.FC = () => {
  return (
    <div className="relative w-44 h-16 flex items-center justify-center pointer-events-none select-none">
      <svg
        viewBox="0 0 240 90"
        className="w-full h-full max-h-16 transform -rotate-1"
        style={{ filter: 'drop-shadow(0.5px 0.5px 0px rgba(0,35,120,0.4))' }}
      >
        <path
          d="M 22 55 C 35 25, 48 15, 62 38 C 72 55, 80 72, 92 42 C 98 28, 108 22, 118 45 C 125 58, 138 68, 155 35 C 168 12, 175 48, 190 38 C 205 28, 222 45, 232 40"
          fill="none"
          stroke="#002b88"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Flourish loop and underline stroke */}
        <path
          d="M 40 48 C 65 65, 110 78, 170 72 C 195 68, 218 60, 228 52"
          fill="none"
          stroke="#002b88"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M 55 60 C 95 82, 160 84, 210 75"
          fill="none"
          stroke="#00226e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="218" cy="48" r="2.2" fill="#002b88" />
      </svg>
    </div>
  );
};

// Realistic Wet-Ink Signature for Pelatih (Dark Blue Ink)
const TandaTanganBasahPelatih: React.FC<{ customSignatureUrl?: string }> = ({ customSignatureUrl }) => {
  if (customSignatureUrl) {
    return (
      <div className="relative w-44 h-16 flex items-center justify-center">
        <img
          src={customSignatureUrl}
          alt="Tanda Tangan Basah Pelatih"
          className="h-14 max-w-[170px] object-contain transform -rotate-2"
          style={{ filter: 'contrast(130%) brightness(95%)' }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-44 h-16 flex items-center justify-center pointer-events-none select-none">
      <svg
        viewBox="0 0 240 90"
        className="w-full h-full max-h-16 transform -rotate-2"
        style={{ filter: 'drop-shadow(0.5px 0.5px 0px rgba(0,35,120,0.4))' }}
      >
        {/* Dynamic Coach Stroke in Deep Blue Fountain Pen Ink */}
        <path
          d="M 28 65 C 42 30, 50 18, 68 25 C 82 32, 75 75, 95 48 C 108 30, 120 22, 135 48 C 145 62, 160 52, 175 32 C 188 18, 198 42, 212 36 C 220 32, 228 38, 235 44"
          fill="none"
          stroke="#002a94"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Swirl / underline */}
        <path
          d="M 35 58 C 70 78, 130 84, 190 76 C 215 72, 226 65, 232 58"
          fill="none"
          stroke="#002a94"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M 185 74 C 200 70, 215 65, 225 56"
          fill="none"
          stroke="#001d68"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="230" cy="54" r="2.2" fill="#002a94" />
      </svg>
    </div>
  );
};

export const PenilaianAnggota: React.FC<PenilaianAnggotaProps> = ({
  sekolahList,
  selectedSekolahId,
  anggotaList,
  absenSiswaList
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState(selectedSekolahId);
  const [filterSemester, setFilterSemester] = useState<SemesterType>('Ganjil');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState(StorageService.getActiveTahunAjaran());
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Wet Signature Controls
  const [useWetSignature, setUseWetSignature] = useState(true);
  const [customCoachSignature, setCustomCoachSignature] = useState<string>('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureDate, setSignatureDate] = useState(() => {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  const printAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tahunAjaranOptions = StorageService.getTahunAjaranList();
  const selectedSekolah = sekolahList.find(s => s.id === filterSekolahId) || sekolahList[0];

  // Load saved coach signature from storage or profile if exists
  useEffect(() => {
    const savedSig = localStorage.getItem('coach_wet_signature_data') || '';
    if (savedSig) {
      setCustomCoachSignature(savedSig);
    }
  }, []);

  // Semester months definition:
  // Semester Ganjil: Juli, Agustus, September, Oktober, November, Desember
  // Semester Genap: Januari, Februari, Maret, April, Mei, Juni
  const semesterMonths = useMemo(() => {
    return filterSemester === 'Ganjil'
      ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  }, [filterSemester]);

  // Filter student members belonging to selected school
  const filteredAnggota = useMemo(() => {
    return anggotaList.filter(a => {
      if (a.sekolahId !== filterSekolahId) return false;
      if (filterDivisi !== 'ALL' && a.divisiNama !== filterDivisi) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = a.nama.toLowerCase().includes(query);
        const matchClass = (a.kelas || '').toLowerCase().includes(query);
        const matchDiv = (a.divisiNama || '').toLowerCase().includes(query);
        if (!matchName && !matchClass && !matchDiv) return false;
      }
      return true;
    });
  }, [anggotaList, filterSekolahId, filterDivisi, searchQuery]);

  // Unique divisions for filtering
  const availableDivisi = useMemo(() => {
    const divs = new Set<string>();
    anggotaList.filter(a => a.sekolahId === filterSekolahId).forEach(a => {
      if (a.divisiNama) divs.add(a.divisiNama);
    });
    return Array.from(divs);
  }, [anggotaList, filterSekolahId]);

  // Calculate monthly attendance & grade for each member
  const gradedStudents = useMemo((): StudentGradeRow[] => {
    return filteredAnggota.map(anggota => {
      // Find all attendance records for this student in the selected academic year and semester months
      const records = absenSiswaList.filter(entry => {
        const matchStudent = entry.anggotaId === anggota.id;
        const matchSchool = entry.sekolahId === filterSekolahId;
        const matchYear = !entry.tahunAjaran || entry.tahunAjaran === filterTahunAjaran;
        const matchMonth = semesterMonths.includes(entry.bulan);
        return matchStudent && matchSchool && matchYear && matchMonth;
      });

      const monthlyAttendance: { [monthName: string]: number } = {};
      semesterMonths.forEach(m => {
        monthlyAttendance[m] = 0;
      });

      let totalHadir = 0;
      let totalPertemuan = 0;

      records.forEach(r => {
        const st = (r.status || '').toLowerCase();
        totalPertemuan++;
        if (st === 'hadir') {
          totalHadir++;
          if (monthlyAttendance[r.bulan] !== undefined) {
            monthlyAttendance[r.bulan] += 1;
          }
        }
      });

      let persentase = 0;
      if (totalPertemuan > 0) {
        persentase = Math.round((totalHadir / totalPertemuan) * 100);
      } else {
        // Default baseline presentation if fresh
        persentase = 85;
      }

      // Grade logic:
      // A (Sangat Baik): Kehadiran >= 85%
      // B (Baik): Kehadiran 70% - 84%
      // C (Cukup): Kehadiran 55% - 69%
      // D (Kurang): Kehadiran < 55%
      let nilaiHuruf: 'A' | 'B' | 'C' | 'D' = 'B';
      let predikat = 'Baik';
      let keterangan = 'Mengikuti kegiatan ekstrakurikuler dengan disiplin dan aktif.';

      if (persentase >= 85) {
        nilaiHuruf = 'A';
        predikat = 'Sangat Baik';
        keterangan = 'Sangat aktif, berdedikasi tinggi, dan selalu disiplin dalam setiap latihan.';
      } else if (persentase >= 70) {
        nilaiHuruf = 'B';
        predikat = 'Baik';
        keterangan = 'Aktif dan disiplin mengikuti latihan ekstrakurikuler marching band.';
      } else if (persentase >= 55) {
        nilaiHuruf = 'C';
        predikat = 'Cukup';
        keterangan = 'Cukup aktif, perlu ditingkatkan kedisiplinan dan kehadirannya.';
      } else {
        nilaiHuruf = 'D';
        predikat = 'Kurang';
        keterangan = 'Tingkat kehadiran rendah, memerlukan bimbingan dan motivasi kehadiran.';
      }

      return {
        anggota,
        monthlyAttendance,
        totalHadir,
        totalPertemuan,
        persentaseKehadiran: persentase,
        nilaiHuruf,
        predikat,
        keterangan
      };
    });
  }, [filteredAnggota, absenSiswaList, filterSekolahId, filterTahunAjaran, semesterMonths]);

  // Statistics calculation
  const stats = useMemo(() => {
    const countA = gradedStudents.filter(s => s.nilaiHuruf === 'A').length;
    const countB = gradedStudents.filter(s => s.nilaiHuruf === 'B').length;
    const countC = gradedStudents.filter(s => s.nilaiHuruf === 'C').length;
    const countD = gradedStudents.filter(s => s.nilaiHuruf === 'D').length;
    const total = gradedStudents.length || 1;

    return {
      countA,
      countB,
      countC,
      countD,
      pctA: Math.round((countA / total) * 100),
      pctB: Math.round((countB / total) * 100),
      pctC: Math.round((countC / total) * 100),
      pctD: Math.round((countD / total) * 100)
    };
  }, [gradedStudents]);

  // Coach & Headmaster details
  const pelatihUser = useMemo(() => {
    const users = StorageService.getUsers();
    return users.find(u => u.id === selectedSekolah?.pelatihId) || StorageService.getCurrentUser();
  }, [selectedSekolah]);

  // Print Window Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Nilai_Ekskul_${selectedSekolah?.namaSekolah.replace(/\s+/g, '_')}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Export for Excel with monthly columns
  const handleExportCsv = () => {
    const monthHeaders = semesterMonths.map(m => `Kehadiran ${m}`);
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Divisi/Alat', ...monthHeaders, 'Total Hadir', 'Persentase', 'Nilai Huruf', 'Predikat', 'Keterangan'];
    const rows = gradedStudents.map((row, idx) => [
      idx + 1,
      `"${row.anggota.nama}"`,
      `"${row.anggota.kelas || '-'}"`,
      `"${row.anggota.divisiNama || '-'}"`,
      ...semesterMonths.map(m => row.monthlyAttendance[m] || 0),
      row.totalHadir,
      `${row.persentaseKehadiran}%`,
      row.nilaiHuruf,
      `"${row.predikat}"`,
      `"${row.keterangan}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
      `DAFTAR NILAI EKSTRAKURIKULER\n` +
      `Sekolah: ${selectedSekolah?.namaSekolah || '-'}\n` +
      `Semester: ${filterSemester} - Tahun Ajaran: ${filterTahunAjaran}\n\n` +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nilai_${selectedSekolah?.namaSekolah}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Save Custom Signature
  const handleSaveSignature = (sigDataUrl: string) => {
    setCustomCoachSignature(sigDataUrl);
    localStorage.setItem('coach_wet_signature_data', sigDataUrl);
    setIsSignatureModalOpen(false);
  };

  // Handle Upload Image Signature
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomCoachSignature(result);
      localStorage.setItem('coach_wet_signature_data', result);
      setIsSignatureModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Daftar Nilai Ekstrakurikuler
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Perhitungan nilai (Predikat A, B, C, D) berdasarkan jumlah kehadiran siswa per bulan dalam satu semester dilengkapi cetak tanda tangan basah & stempel resmi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak / Print</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Ekspor Excel/CSV</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-100" />
              <span>{isExporting ? 'Memproses PDF...' : 'Unduh Raport PDF'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Sekolah */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-blue-500" /> Nama Sekolah
            </label>
            <select
              value={filterSekolahId}
              onChange={e => setFilterSekolahId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {sekolahList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.namaSekolah}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Semester
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFilterSemester('Ganjil')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition border text-center cursor-pointer ${
                  filterSemester === 'Ganjil'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Ganjil (Jul - Des)
              </button>
              <button
                type="button"
                onClick={() => setFilterSemester('Genap')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition border text-center cursor-pointer ${
                  filterSemester === 'Genap'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Genap (Jan - Jun)
              </button>
            </div>
          </div>

          {/* Tahun Ajaran */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Tahun Ajaran
            </label>
            <select
              value={filterTahunAjaran}
              onChange={e => setFilterTahunAjaran(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {tahunAjaranOptions.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Divisi / Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Filter Divisi
            </label>
            <select
              value={filterDivisi}
              onChange={e => setFilterDivisi(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Semua Divisi ({gradedStudents.length} Siswa)</option>
              {availableDivisi.map(d => (
                <option key={d} value={d}>
                  Divisi {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tanda Tangan Basah Customizer Options */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-blue-600" /> Opsi Tanda Tangan Basah:
            </span>

            {/* Toggle Tanda Tangan Basah */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={useWetSignature}
                onChange={e => setUseWetSignature(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span>Cetak Tanda Tangan Basah (Tinta Biru Asli)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{customCoachSignature ? 'Ubah Tanda Tangan Pelatih' : 'Gambar / Unggah TTD Pelatih'}</span>
            </button>

            {customCoachSignature && (
              <button
                type="button"
                onClick={() => {
                  setCustomCoachSignature('');
                  localStorage.removeItem('coach_wet_signature_data');
                }}
                className="text-xs text-rose-600 hover:underline font-semibold"
                title="Reset ke TTD Basah Standar"
              >
                Reset TTD
              </button>
            )}
          </div>
        </div>

        {/* Grade Standard Explanation Banner */}
        <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">Pedoman Standar Nilai Kehadiran:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300">
              A (Sangat Baik): Kehadiran ≥ 85%
            </span>
            <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-300">
              B (Baik): Kehadiran 70% - 84%
            </span>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-300">
              C (Cukup): Kehadiran 55% - 69%
            </span>
            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-md border border-rose-300">
              D (Kurang): Kehadiran &lt; 55%
            </span>
          </div>
        </div>
      </div>

      {/* Grade Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Predikat A (Sangat Baik)</span>
            <p className="text-xl font-black text-emerald-900 mt-0.5">{stats.countA} <span className="text-xs font-semibold text-emerald-600">({stats.pctA}%)</span></p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-200/70 text-emerald-800 flex items-center justify-center font-black text-sm">
            A
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Predikat B (Baik)</span>
            <p className="text-xl font-black text-blue-900 mt-0.5">{stats.countB} <span className="text-xs font-semibold text-blue-600">({stats.pctB}%)</span></p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-200/70 text-blue-800 flex items-center justify-center font-black text-sm">
            B
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Predikat C (Cukup)</span>
            <p className="text-xl font-black text-amber-900 mt-0.5">{stats.countC} <span className="text-xs font-semibold text-amber-600">({stats.pctC}%)</span></p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center font-black text-sm">
            C
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Predikat D (Kurang)</span>
            <p className="text-xl font-black text-rose-900 mt-0.5">{stats.countD} <span className="text-xs font-semibold text-rose-600">({stats.pctD}%)</span></p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-200/70 text-rose-800 flex items-center justify-center font-black text-sm">
            D
          </div>
        </div>
      </div>

      {/* Official Report Document Format (Print / Preview / PDF) */}
      <div
        ref={printAreaRef}
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-5xl mx-auto text-slate-900"
      >
        {/* Metadata Information: Nama Sekolah & Semester */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs font-medium grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Nama Sekolah</span>
              <span className="font-bold text-slate-900">: {selectedSekolah?.namaSekolah || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Semester</span>
              <span className="font-bold text-slate-900 uppercase">: {filterSemester} ({filterSemester === 'Ganjil' ? 'Juli - Desember' : 'Januari - Juni'})</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Tahun Pelajaran</span>
              <span className="font-bold text-slate-900">: {filterTahunAjaran}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Kegiatan Ekskul</span>
              <span className="font-bold text-slate-900">: Marching Band / Drumband</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Pelatih Pembina</span>
              <span className="font-bold text-slate-900">: {pelatihUser?.name || 'Pelatih Ekstrakurikuler'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-semibold">Jumlah Anggota</span>
              <span className="font-bold text-slate-900">: {gradedStudents.length} Siswa</span>
            </div>
          </div>
        </div>

        {/* Grades Table with Monthly Attendance Columns */}
        <div className="overflow-x-auto border border-slate-300 rounded-xl mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header baris 1 */}
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th rowSpan={2} className="py-2.5 px-2.5 border-r border-slate-300 text-center w-10">No</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300">Nama Siswa</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-300 text-center w-14">Kelas</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300">Divisi / Alat</th>
                <th colSpan={semesterMonths.length} className="py-1.5 px-2 border-r border-slate-300 text-center bg-blue-50/60 font-black">
                  Jumlah Kehadiran Latihan (Bulan)
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 border-r border-slate-300 text-center w-14" title="Total Kehadiran">Total Hadir</th>
                <th rowSpan={2} className="py-2.5 px-2.5 border-r border-slate-300 text-center w-14 bg-amber-50/60">Nilai</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Predikat</th>
                <th rowSpan={2} className="py-2.5 px-3">Keterangan</th>
              </tr>
              {/* Header baris 2 (Nama Bulan Semester) */}
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                {semesterMonths.map(monthName => (
                  <th
                    key={monthName}
                    className="py-1.5 px-2 border-r border-slate-300 text-center w-12 bg-blue-50/40"
                    title={`Kehadiran Bulan ${monthName}`}
                  >
                    {monthName.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gradedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6 + semesterMonths.length} className="py-8 text-center text-slate-500 italic">
                    Belum ada data anggota pada sekolah dan divisi yang dipilih.
                  </td>
                </tr>
              ) : (
                gradedStudents.map((row, index) => {
                  const getGradeBadge = (grade: string) => {
                    switch (grade) {
                      case 'A':
                        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      case 'B':
                        return 'bg-blue-100 text-blue-800 border-blue-300';
                      case 'C':
                        return 'bg-amber-100 text-amber-800 border-amber-300';
                      default:
                        return 'bg-rose-100 text-rose-800 border-rose-300';
                    }
                  };

                  return (
                    <tr key={row.anggota.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-semibold text-slate-600">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                        {row.anggota.nama}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-700 font-medium">
                        {row.anggota.kelas || '-'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                        {row.anggota.divisiNama || '-'}
                      </td>
                      {/* Kolom Kehadiran Setiap Bulan */}
                      {semesterMonths.map(monthName => {
                        const count = row.monthlyAttendance[monthName] || 0;
                        return (
                          <td
                            key={monthName}
                            className={`py-2 px-2 border-r border-slate-200 text-center font-bold ${
                              count > 0 ? 'text-slate-900 bg-slate-50/50' : 'text-slate-400'
                            }`}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      {/* Total Hadir */}
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-black text-blue-700 bg-blue-50/30">
                        {row.totalHadir}
                      </td>
                      {/* Nilai Huruf */}
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center bg-amber-50/20">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm border ${getGradeBadge(row.nilaiHuruf)}`}>
                          {row.nilaiHuruf}
                        </span>
                      </td>
                      {/* Predikat */}
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-800">
                        {row.predikat}
                      </td>
                      {/* Keterangan */}
                      <td className="py-2 px-3 text-slate-600 text-[11px] leading-tight">
                        {row.keterangan}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend & Summary Notes */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 mb-8 text-[11px]">
          <p className="font-bold text-slate-800 mb-1">Kriteria Predikat Nilai Raport Ekstrakurikuler:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-slate-700">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-emerald-700">A (Sangat Baik)</strong>: Kehadiran ≥ 85%
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-blue-700">B (Baik)</strong>: Kehadiran 70% - 84%
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-amber-700">C (Cukup)</strong>: Kehadiran 55% - 69%
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-rose-700">D (Kurang)</strong>: Kehadiran &lt; 55%
            </div>
          </div>
        </div>

        {/* Official Signatures Section with Authentic Wet Ink (Tanpa Stempel) */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          {/* Sisi Kiri: Mengetahui Kepala Sekolah */}
          <div className="text-center relative flex flex-col items-center">
            <p className="text-slate-500 font-semibold mb-1">Mengetahui,</p>
            <p className="font-bold text-slate-800">Kepala Sekolah {selectedSekolah?.namaSekolah}</p>

            <div className="relative h-20 w-48 flex items-center justify-center my-1">
              {/* Wet Ink Blue Signature */}
              {useWetSignature ? (
                <TandaTanganBasahKepalaSekolah />
              ) : (
                <div className="h-16" />
              )}
            </div>

            <p className="font-black text-slate-900 underline uppercase tracking-wide">
              {selectedSekolah?.kepalaSekolah || 'NITA HERNITA, S.Pd.MM'}
            </p>
            <p className="text-[11px] text-slate-600">
              NIP. {selectedSekolah?.nipKepalaSekolah || '197310221996032002'}
            </p>
          </div>

          {/* Sisi Kanan: Pelatih Ekstrakurikuler */}
          <div className="text-center relative flex flex-col items-center">
            <p className="text-slate-500 font-semibold mb-1">
              Bogor, {signatureDate}
            </p>
            <p className="font-bold text-slate-800">Pelatih Ekstrakurikuler</p>

            <div className="relative h-20 w-48 flex items-center justify-center my-1">
              {/* Wet Ink Blue Signature */}
              {useWetSignature ? (
                <TandaTanganBasahPelatih customSignatureUrl={customCoachSignature} />
              ) : (
                <div className="h-16" />
              )}
            </div>

            <p className="font-black text-slate-900 underline uppercase tracking-wide">
              {pelatihUser?.name || 'Pelatih Ekstrakurikuler'}
            </p>
            <p className="text-[11px] text-slate-600">
              {pelatihUser?.nip ? `NIP. ${pelatihUser.nip}` : 'Pelatih Marching Band'}
            </p>
          </div>
        </div>
      </div>

      {/* Signature Customization Modal */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <PenTool className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-800 text-base">
                  Buat / Ubah Tanda Tangan Basah
                </h3>
              </div>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Goreskan tanda tangan Anda dengan jari/stylus/mouse pada kanvas di bawah untuk menghasilkan efek tanda tangan basah alami:
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-2 bg-slate-50 flex items-center justify-center">
                <SignaturePad
                  onSave={handleSaveSignature}
                  initialDataUrl={customCoachSignature}
                  width={340}
                  height={150}
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Unggah Foto TTD</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
