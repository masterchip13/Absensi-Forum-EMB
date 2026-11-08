import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Sekolah, Anggota, AbsenSiswaEntry, isSchoolCoach } from '../types';
import { StorageService } from '../data/storage';
import { formatNamaKapital, formatKelasAngka } from '../utils/nameFormatter';
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
  Stamp,
  FileText
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
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
  nilaiAngka: number;
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

  const [sortBy, setSortBy] = useState<'kehadiran' | 'nama' | 'kelas'>('kehadiran');

  // Calculate monthly attendance & grade for each member based purely on accumulated attendance
  const gradedStudents = useMemo((): StudentGradeRow[] => {
    // 1. Gather raw attendance data for each member
    const studentDataList = filteredAnggota.map(anggota => {
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
      const totalPertemuan = records.length;

      records.forEach(r => {
        const st = (r.status || '').toLowerCase();
        if (st === 'hadir') {
          totalHadir++;
          if (monthlyAttendance[r.bulan] !== undefined) {
            monthlyAttendance[r.bulan] += 1;
          }
        }
      });

      return {
        anggota,
        records,
        monthlyAttendance,
        totalHadir,
        totalPertemuan
      };
    });

    // 2. Determine highest accumulated attendance across members or recorded meetings
    const maxAccumulatedAttendance = Math.max(...studentDataList.map(s => s.totalHadir), 0);
    const maxMeetingsRecorded = Math.max(...studentDataList.map(s => s.totalPertemuan), 0);
    const benchmarkKehadiran = Math.max(maxAccumulatedAttendance, maxMeetingsRecorded, 1);
    const hasAnyAttendance = maxAccumulatedAttendance > 0 || maxMeetingsRecorded > 0;

    // 3. Compute score (0-100) and predicate (A, B, C, D) strictly based on accumulated attendance:
    // "Semakin banyak kehadiran semakin bagus predikat nilainya"
    const results: StudentGradeRow[] = studentDataList.map(item => {
      let persentase = 0;
      let nilaiAngka = 80;
      let nilaiHuruf: 'A' | 'B' | 'C' | 'D' = 'B';
      let predikat = 'Baik';
      let keterangan = 'Aktif dan disiplin mengikuti latihan ekstrakurikuler marching band.';

      if (!hasAnyAttendance) {
        // If no attendance records yet in current semester
        persentase = 80;
        nilaiAngka = 80;
        nilaiHuruf = 'B';
        predikat = 'Baik';
        keterangan = 'Presensi semester sedang berlangsung.';
      } else {
        const ratio = item.totalHadir / benchmarkKehadiran;
        persentase = Math.round(ratio * 100);

        if (item.totalHadir === 0) {
          nilaiAngka = 50;
          nilaiHuruf = 'D';
          predikat = 'Kurang';
          keterangan = 'Belum memiliki akumulasi kehadiran latihan, memerlukan pembinaan keaktifan.';
        } else if (ratio >= 0.85) {
          // Akumulasi Tertinggi / Kehadiran Sangat Aktif
          nilaiAngka = Math.min(100, Math.round(86 + (ratio >= 1 ? 14 : ((ratio - 0.85) / 0.15) * 14)));
          nilaiHuruf = 'A';
          predikat = 'Sangat Baik';
          keterangan = 'Akumulasi kehadiran sangat tinggi, sangat aktif dan konsisten dalam setiap latihan.';
        } else if (ratio >= 0.70) {
          // Akumulasi Baik
          nilaiAngka = Math.round(75 + ((ratio - 0.70) / 0.15) * 10);
          nilaiHuruf = 'B';
          predikat = 'Baik';
          keterangan = 'Akumulasi kehadiran baik, aktif dan disiplin mengikuti latihan ekstrakurikuler.';
        } else if (ratio >= 0.50) {
          // Akumulasi Cukup
          nilaiAngka = Math.round(65 + ((ratio - 0.50) / 0.20) * 9);
          nilaiHuruf = 'C';
          predikat = 'Cukup';
          keterangan = 'Akumulasi kehadiran cukup, perlu meningkatkan keaktifan dalam latihan.';
        } else {
          // Akumulasi Kurang
          nilaiAngka = Math.round(52 + (ratio / 0.50) * 12);
          nilaiHuruf = 'D';
          predikat = 'Kurang';
          keterangan = 'Akumulasi kehadiran rendah, jarang mengikuti jadwal latihan ekstrakurikuler.';
        }
      }

      return {
        anggota: item.anggota,
        monthlyAttendance: item.monthlyAttendance,
        totalHadir: item.totalHadir,
        totalPertemuan: item.totalPertemuan,
        persentaseKehadiran: persentase,
        nilaiAngka,
        nilaiHuruf,
        predikat,
        keterangan
      };
    });

    // 4. Sort rows based on user preference
    return results.sort((a, b) => {
      if (sortBy === 'kehadiran') {
        if (b.totalHadir !== a.totalHadir) return b.totalHadir - a.totalHadir;
        if (b.nilaiAngka !== a.nilaiAngka) return b.nilaiAngka - a.nilaiAngka;
        return a.anggota.nama.localeCompare(b.anggota.nama);
      }
      if (sortBy === 'nama') {
        return a.anggota.nama.localeCompare(b.anggota.nama);
      }
      if (sortBy === 'kelas') {
        const classComp = (a.anggota.kelas || '').localeCompare(b.anggota.kelas || '');
        if (classComp !== 0) return classComp;
        return a.anggota.nama.localeCompare(b.anggota.nama);
      }
      return 0;
    });
  }, [filteredAnggota, absenSiswaList, filterSekolahId, filterTahunAjaran, semesterMonths, sortBy]);

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

  // Coach & Headmaster details (prefer logged-in coach if they train this school)
  const pelatihUser = useMemo(() => {
    const users = StorageService.getUsers();
    const currentUser = StorageService.getCurrentUser();
    if (currentUser && selectedSekolah && isSchoolCoach(selectedSekolah, currentUser.id)) {
      return currentUser;
    }
    return users.find(u => u.id === selectedSekolah?.pelatihId) || currentUser;
  }, [selectedSekolah]);

  // Print Window Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export (Strictly 1 Single A4 Portrait Page, High Resolution & Crisp)
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });
      const imgData = canvas.toDataURL('image/png');
      // Strictly fit onto exactly 1 single A4 portrait page
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 6; // 6mm margin
      const maxW = pageWidth - (margin * 2);
      const maxH = pageHeight - (margin * 2);

      const canvasRatio = canvas.width / canvas.height;
      let renderW = maxW;
      let renderH = maxW / canvasRatio;

      if (renderH > maxH) {
        renderH = maxH;
        renderW = maxH * canvasRatio;
      }

      const posX = margin + (maxW - renderW) / 2;
      const posY = margin + (maxH - renderH) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, renderW, renderH, undefined, 'FAST');

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const cleanSchoolName = (selectedSekolah?.namaSekolah || 'Sekolah').replace(/\s+/g, '_');
      const fileName = `Nilai_Ekskul_${cleanSchoolName}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Gagal mengekspor PDF otomatis. Anda dapat menggunakan tombol Cetak Langsung.');
    } finally {
      setIsExporting(false);
    }
  };

  const [isExportingImage, setIsExportingImage] = useState(false);

  // Export Nilai as High-Resolution JPG / PNG Image (Desktop Proportioned & Crisp)
  const handleExportImage = async (format: 'jpeg' | 'png') => {
    if (!printAreaRef.current) return;
    setIsExportingImage(true);
    const formatLabel = format === 'jpeg' ? 'JPG' : 'PNG';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const quality = format === 'jpeg' ? 0.98 : undefined;

    try {
      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        const cleanSchoolName = (selectedSekolah?.namaSekolah || 'Sekolah').replace(/\s+/g, '_');
        const fileName = `Rekap_Nilai_${cleanSchoolName}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.${ext}`;
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      }, mimeType, quality);
    } catch (err) {
      console.error(`Export ${formatLabel} error:`, err);
      alert(`Gagal mengekspor ${formatLabel}. Silakan gunakan tombol Cetak.`);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Native Excel (.xlsx) Export with multi-column grades, clean formatting and signatures
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const headers = [
        'No',
        'Nama Lengkap Anggota',
        'Kelas',
        'Divisi / Alat Musik',
        ...semesterMonths.map(m => `Hadir ${m}`),
        'Total Hadir',
        'Nilai Angka',
        'Nilai Huruf',
        'Predikat',
        'Deskripsi Capaian'
      ];

      const rows: any[][] = [
        ['DAFTAR NILAI & RAPORT EVALUASI EKSTRAKURIKULER MARCHING BAND'],
        [`Satuan Pendidikan: ${selectedSekolah?.namaSekolah || '-'}`],
        [`Alamat: ${selectedSekolah?.alamat || 'Kecamatan Cigombong, Kabupaten Bogor'}`],
        [`Semester: ${filterSemester} | Tahun Pelajaran: ${filterTahunAjaran}`],
        [`Pelatih Pembina: ${pelatihUser?.name || 'Pelatih Ekstrakurikuler'}`],
        ['Dasar Penilaian: Akumulasi Kehadiran Latihan (Semakin banyak kehadiran semakin bagus predikat nilainya)'],
        [],
        headers
      ];

      if (gradedStudents.length === 0) {
        rows.push(['-', 'Belum ada data anggota pada sekolah/semester ini', '-', '-', ...semesterMonths.map(() => '-'), 0, 0, '-', '-', '-']);
      } else {
        gradedStudents.forEach((row, idx) => {
          rows.push([
            idx + 1,
            formatNamaKapital(row.anggota.nama),
            formatKelasAngka(row.anggota.kelas) || '-',
            row.anggota.divisiNama || '-',
            ...semesterMonths.map(m => row.monthlyAttendance[m] || 0),
            row.totalHadir,
            row.nilaiAngka,
            row.nilaiHuruf,
            row.predikat,
            row.keterangan
          ]);
        });
      }

      // Add summary statistics
      rows.push([]);
      rows.push(['REKAPITULASI PREDIKAT AKUMULASI KEHADIRAN']);
      rows.push(['Predikat A (Sangat Baik - Akumulasi >= 85%)', stats.countA, `${stats.pctA}%`]);
      rows.push(['Predikat B (Baik - Akumulasi 70% - 84%)', stats.countB, `${stats.pctB}%`]);
      rows.push(['Predikat C (Cukup - Akumulasi 50% - 69%)', stats.countC, `${stats.pctC}%`]);
      rows.push(['Predikat D (Kurang - Akumulasi < 50%)', stats.countD, `${stats.pctD}%`]);
      rows.push(['Total Peserta Didik Dinilai', gradedStudents.length]);

      // Add official signatures at the bottom
      rows.push([]);
      rows.push([]);
      rows.push([
        '',
        'Mengetahui,',
        '',
        '',
        ...semesterMonths.map(() => ''),
        '',
        `Bogor, ${signatureDate}`,
        '',
        ''
      ]);
      rows.push([
        '',
        `Kepala Sekolah ${selectedSekolah?.namaSekolah || ''}`,
        '',
        '',
        ...semesterMonths.map(() => ''),
        '',
        'Pelatih Ekstrakurikuler',
        '',
        ''
      ]);
      rows.push([]);
      rows.push([]);
      rows.push([
        '',
        selectedSekolah?.kepalaSekolah || 'NITA HERNITA, S.Pd.MM',
        '',
        '',
        ...semesterMonths.map(() => ''),
        '',
        pelatihUser?.name || 'Pelatih Ekstrakurikuler',
        '',
        ''
      ]);
      rows.push([
        '',
        `NIP. ${selectedSekolah?.nipKepalaSekolah || '197310221996032002'}`,
        '',
        '',
        ...semesterMonths.map(() => ''),
        '',
        pelatihUser?.nip ? `NIP. ${pelatihUser.nip}` : 'Pelatih Pembina Marching Band',
        '',
        ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 10 },
        { wch: 22 },
        ...semesterMonths.map(() => ({ wch: 12 })),
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 55 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Nilai Raport Ekskul');
      const cleanSchool = (selectedSekolah?.namaSekolah || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Nilai_Ekskul_${cleanSchool}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('Terjadi kesalahan saat mengekspor Excel.');
    }
  };

  // Microsoft Word (.doc) Export
  const handleExportWord = () => {
    const cleanSchool = (selectedSekolah?.namaSekolah || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Nilai_Ekskul_${cleanSchool}_Semester_${filterSemester}_${filterTahunAjaran.replace('/', '-')}.doc`;

    const htmlHeader = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Daftar Nilai Ekstrakurikuler - ${selectedSekolah?.namaSekolah || ''}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 297mm 210mm; /* Landscape */
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9.5pt;
      color: #000000;
      line-height: 1.25;
    }
    .header-box {
      text-align: center;
      margin-bottom: 14px;
    }
    .header-instansi {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .header-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .header-sub {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .divider-line {
      border-bottom: 2px solid #000;
      margin-top: 6px;
      margin-bottom: 12px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000000;
      padding: 5px 4px;
      text-align: center;
      vertical-align: middle;
    }
    table.data-table th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-transform: uppercase;
    }
    .text-left { text-align: left !important; }
    .rubrik-box {
      border: 1px solid #000;
      padding: 8px 12px;
      margin-top: 15px;
      margin-bottom: 20px;
      font-size: 8.5pt;
      background-color: #fafafa;
    }
    .sig-table {
      width: 100%;
      margin-top: 30px;
      border: none;
      font-size: 9.5pt;
    }
    .sig-table td {
      border: none;
      text-align: center;
      vertical-align: top;
      width: 50%;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="header-instansi">PEMERINTAH DAERAH KABUPATEN BOGOR &bull; DINAS PENDIDIKAN</div>
    <div class="header-title">${(selectedSekolah?.namaSekolah || 'NAMA SEKOLAH').toUpperCase()}</div>
    <div style="font-size: 9pt;">${selectedSekolah?.alamat || 'Kecamatan Cigombong, Kabupaten Bogor - Provinsi Jawa Barat'}</div>
    <div class="divider-line"></div>
    <div class="header-sub">DAFTAR NILAI & LAPORAN EVALUASI EKSTRAKURIKULER MARCHING BAND</div>
    <div style="font-size: 9.5pt; font-weight: bold;">SEMESTER ${filterSemester.toUpperCase()} &bull; TAHUN PELAJARAN ${filterTahunAjaran}</div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">No</th>
        <th style="width: 20%;">Nama Lengkap Anggota</th>
        <th style="width: 8%;">Kelas</th>
        <th style="width: 14%;">Divisi / Alat</th>
        ${semesterMonths.map(m => `<th style="width: 6%;">${m.substring(0, 3)}</th>`).join('')}
        <th style="width: 6%;">Total Hadir</th>
        <th style="width: 7%;">Nilai</th>
        <th style="width: 10%;">Predikat</th>
        <th>Deskripsi Capaian</th>
      </tr>
    </thead>
    <tbody>
      ${gradedStudents.map((row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align: center;"><b>${row.anggota.nama}</b></td>
          <td>${row.anggota.kelas || '-'}</td>
          <td class="text-left">${row.anggota.divisiNama || '-'}</td>
          ${semesterMonths.map(m => `<td>${row.monthlyAttendance[m] || 0}</td>`).join('')}
          <td><b>${row.totalHadir}</b></td>
          <td><b>${row.nilaiAngka} (${row.nilaiHuruf})</b></td>
          <td>${row.predikat}</td>
          <td class="text-left" style="font-size: 8pt;">${row.keterangan}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="rubrik-box">
    <b>PEDOMAN PENILAIAN BERDASARKAN AKUMULASI KEHADIRAN:</b><br/>
    &bull; <b>Nilai A (Sangat Baik)</b>: Akumulasi kehadiran tertinggi (&ge; 85%) &mdash; Sangat aktif, berdedikasi tinggi, dan selalu disiplin dalam setiap latihan.<br/>
    &bull; <b>Nilai B (Baik)</b>: Akumulasi kehadiran baik (70% &ndash; 84%) &mdash; Aktif dan disiplin mengikuti latihan ekstrakurikuler marching band.<br/>
    &bull; <b>Nilai C (Cukup)</b>: Akumulasi kehadiran cukup (50% &ndash; 69%) &mdash; Cukup aktif, perlu ditingkatkan kedisiplinan dan kehadirannya.<br/>
    &bull; <b>Nilai D (Kurang)</b>: Akumulasi kehadiran kurang (&lt; 50%) &mdash; Tingkat kehadiran rendah, memerlukan bimbingan dan peningkatan keaktifan.
  </div>

  <table class="sig-table">
    <tr>
      <td>
        <div>Mengetahui,</div>
        <div><b>Kepala Sekolah</b></div>
        <div style="height: 60px;"></div>
        <div><u><b>${selectedSekolah?.kepalaSekolah || '...........................................'}</b></u></div>
        <div>NIP. ${selectedSekolah?.nipKepalaSekolah || '...........................................'}</div>
      </td>
      <td>
        <div>Bogor, ...........................................</div>
        <div><b>Pelatih Ekstrakurikuler</b></div>
        <div style="height: 60px;"></div>
        <div><u><b>${pelatihUser?.name || '...........................................'}</b></u></div>
        <div>NIP/NUPTK. ${pelatihUser?.nip || '...........................................'}</div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const blob = new Blob(['\ufeff', htmlHeader], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Daftar Nilai & Raport Ekstrakurikuler
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Perhitungan nilai (Predikat A, B, C, D) otomatis dari presensi bulanan lengkap dengan ekspor resmi Excel, Word, dan PDF siap cetak.
            </p>
          </div>

          {/* Action Buttons: 4 Format Downloads */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm border border-slate-700"
              title="Cetak langsung format 1 halaman resmi menggunakan dialog printer browser"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Cetak (1 Halaman)</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting || isExportingImage}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
              title="Unduh rekap nilai ke format PDF resmi (pasti 1 halaman)"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>{isExporting ? 'Memproses PDF...' : 'Unduh PDF (1 Halaman)'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
              title="Unduh rekap nilai ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Unduh Excel</span>
            </button>
            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
              title="Unduh rekap nilai ke format Microsoft Word (.doc)"
            >
              <Download className="w-4 h-4 text-blue-200" />
              <span>Word (.doc)</span>
            </button>
            <button
              onClick={() => handleExportImage('jpeg')}
              disabled={isExporting || isExportingImage}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
              title="Unduh rekap nilai sebagai gambar JPG berkualitas tinggi"
            >
              <ImageIcon className="w-4 h-4 text-amber-200" />
              <span>JPG</span>
            </button>
            <button
              onClick={() => handleExportImage('png')}
              disabled={isExporting || isExportingImage}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
              title="Unduh rekap nilai sebagai gambar PNG resolusi tinggi"
            >
              <ImageIcon className="w-4 h-4 text-indigo-200" />
              <span>{isExportingImage ? 'Memproses PNG...' : 'Unduh PNG'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
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

          {/* Divisi */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Filter Divisi
            </label>
            <select
              value={filterDivisi}
              onChange={e => setFilterDivisi(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Semua Divisi ({gradedStudents.length} Anggota)</option>
              {availableDivisi.map(d => (
                <option key={d} value={d}>
                  Divisi {d}
                </option>
              ))}
            </select>
          </div>

          {/* Urutan Data Berdasarkan Akumulasi Kehadiran */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-500" /> Urutkan Nilai
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="kehadiran">Akumulasi Kehadiran (Tertinggi)</option>
              <option value="nama">Nama Anggota (A-Z)</option>
              <option value="kelas">Tingkat Kelas</option>
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
            <span className="font-semibold">Pedoman Nilai Berdasarkan Akumulasi Kehadiran (Semakin banyak hadir semakin tinggi nilai):</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300">
              A (Sangat Baik): Akumulasi Tertinggi (≥ 85%)
            </span>
            <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-300">
              B (Baik): Akumulasi Baik (70% - 84%)
            </span>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-300">
              C (Cukup): Akumulasi Cukup (50% - 69%)
            </span>
            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-md border border-rose-300">
              D (Kurang): Akumulasi Rendah (&lt; 50%)
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

      {/* Official A4 Sheet Preview & Print Wrapper */}
      <div className="w-full flex flex-col items-center justify-center overflow-x-auto py-2">
        {/* A4 Sheet Dimensions Indicator */}
        <div className="flex items-center justify-between w-full max-w-[210mm] mb-2 px-1 text-xs text-slate-500 font-semibold print:hidden">
          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Format Standar: <b>A4 Portrait (210 × 297 mm)</b></span>
          </span>
          <span className="text-slate-400 text-[11px]">Pas 1 Lembar Cetak & Unduh PDF Resmi</span>
        </div>

        {/* Official Report Document Format (Print / Preview / PDF - Strictly Standard A4 Portrait: 210mm x 297mm) */}
        <div
          id="printable-nilai-single-page"
          ref={printAreaRef}
          className="bg-white w-[210mm] max-w-full min-h-[297mm] p-[8mm] sm:p-[10mm] rounded-xs border border-slate-300 shadow-xl mx-auto text-slate-900 font-sans box-border flex flex-col justify-between transition-all"
          style={{ color: '#0f172a' }}
        >
          {/* Scoped CSS to enforce exact single-page A4 portrait printing */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-nilai-single-page, #printable-nilai-single-page * {
                visibility: visible !important;
              }
              #printable-nilai-single-page {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                max-width: 210mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 7mm 9mm !important;
                border: none !important;
                box-shadow: none !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              .no-print-in-sheet {
                display: none !important;
              }
            }
          `}} />

        {/* 1. Official Kop Surat (Text Only - Formal, Rapi, & Tanpa Gambar) */}
        <div className="text-center pb-1">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-700 uppercase leading-none">
            PEMERINTAH DAERAH KABUPATEN BOGOR • DINAS PENDIDIKAN
          </p>
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-wider uppercase leading-tight mt-1">
            {selectedSekolah?.namaSekolah || 'SATUAN PENDIDIKAN BINAAN'}
          </h1>
          <p className="text-[10px] text-slate-600 font-medium leading-tight mt-0.5">
            {selectedSekolah?.alamat || 'Kecamatan Cigombong, Kabupaten Bogor - Provinsi Jawa Barat'}
          </p>
          <p className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">
            Satuan Pelaksana Kegiatan Ekstrakurikuler Seni & Olahraga Marching Band
          </p>

          {/* Formal Double Border (Tebal - Tipis) */}
          <div className="border-b-2 border-slate-900 mt-2"></div>
          <div className="border-b border-slate-700 mt-[1.5px] mb-2.5"></div>
        </div>

        {/* 2. Official Document Title */}
        <div className="text-center mb-2.5">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-wider uppercase underline underline-offset-4">
            DAFTAR NILAI DAN LAPORAN EVALUASI HASIL BELAJAR EKSTRAKURIKULER
          </h2>
          <h3 className="text-[11px] font-black text-blue-900 uppercase tracking-wide mt-1">
            UNIT KEGIATAN: MARCHING BAND / DRUMBAND
          </h3>
          <p className="text-[10px] font-bold text-slate-700 uppercase mt-0.5">
            SEMESTER {filterSemester.toUpperCase()} ({filterSemester === 'Ganjil' ? 'JULI - DESEMBER' : 'JANUARI - JUNI'}) • TAHUN PELAJARAN {filterTahunAjaran}
          </p>
        </div>

        {/* 3. Formal Two-Column Identity Metadata */}
        <div className="border border-slate-400 bg-slate-50/70 rounded-md p-2 mb-2.5 text-[10px] grid grid-cols-2 gap-x-4 gap-y-0.5 leading-tight">
          <div className="space-y-0.5">
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Satuan Pendidikan</span>
              <span className="font-bold text-slate-900">: {selectedSekolah?.namaSekolah || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Semester / TP</span>
              <span className="font-bold text-slate-900">: {filterSemester} / {filterTahunAjaran}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Divisi / Alat</span>
              <span className="font-bold text-slate-900">: {filterDivisi === 'ALL' ? 'Semua Divisi Musik & Visual' : `Divisi ${filterDivisi}`}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Pelatih Pembina</span>
              <span className="font-bold text-slate-900">: {pelatihUser?.name || 'Pelatih Ekstrakurikuler'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Dasar Penilaian</span>
              <span className="font-bold text-slate-900">: Akumulasi Kehadiran Latihan</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-semibold">Jumlah Anggota</span>
              <span className="font-bold text-slate-900">: {gradedStudents.length} Peserta Didik</span>
            </div>
          </div>
        </div>

        {/* 4. Official Member Grades Table (Compact & Clean) */}
        <div className="overflow-x-auto border border-slate-400 mb-2 rounded-xs">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                <th rowSpan={2} className="py-1 px-1.5 border-r border-slate-400 text-center w-6">No</th>
                <th rowSpan={2} className="py-1 px-2 border-r border-slate-400 text-left">Nama Peserta Didik</th>
                <th rowSpan={2} className="py-1 px-1.5 border-r border-slate-400 text-center w-10">Kelas</th>
                <th rowSpan={2} className="py-1 px-2 border-r border-slate-400 text-left w-24">Divisi</th>
                <th colSpan={semesterMonths.length} className="py-0.5 px-1 border-r border-slate-400 text-center bg-blue-50/70 font-black">
                  Presensi Latihan Bulanan
                </th>
                <th rowSpan={2} className="py-1 px-1.5 border-r border-slate-400 text-center w-11 bg-slate-50 font-black">Total Hadir</th>
                <th rowSpan={2} className="py-1 px-1.5 border-r border-slate-400 text-center w-12 bg-amber-50 font-black">Nilai</th>
                <th rowSpan={2} className="py-1 px-2 border-r border-slate-400 text-center w-18 font-black">Predikat</th>
                <th rowSpan={2} className="py-1 px-2 text-left">Capaian Kompetensi / Keterangan</th>
              </tr>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400 text-[9px]">
                {semesterMonths.map(monthName => (
                  <th
                    key={monthName}
                    className="py-0.5 px-1 border-r border-slate-400 text-center w-8 bg-blue-50/40"
                  >
                    {monthName.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {gradedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6 + semesterMonths.length} className="py-5 text-center text-slate-500 italic">
                    Belum ada data anggota pada sekolah dan divisi yang dipilih.
                  </td>
                </tr>
              ) : (
                gradedStudents.map((row, index) => {
                  const getGradeBadge = (grade: string) => {
                    switch (grade) {
                      case 'A':
                        return 'bg-emerald-100 text-emerald-900 font-black';
                      case 'B':
                        return 'bg-blue-100 text-blue-900 font-black';
                      case 'C':
                        return 'bg-amber-100 text-amber-900 font-black';
                      default:
                        return 'bg-rose-100 text-rose-900 font-black';
                    }
                  };

                  return (
                    <tr key={row.anggota.id} className="hover:bg-slate-50/60 leading-tight">
                      <td className="py-1 px-1.5 border-r border-slate-300 text-center font-semibold text-slate-700">
                        {index + 1}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-300 font-bold text-slate-900">
                        {formatNamaKapital(row.anggota.nama)}
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-300 text-center text-slate-800 font-semibold font-mono">
                        {formatKelasAngka(row.anggota.kelas) || '-'}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-300 text-slate-700">
                        {row.anggota.divisiNama || '-'}
                      </td>
                      {/* Presensi Tiap Bulan */}
                      {semesterMonths.map(monthName => {
                        const count = row.monthlyAttendance[monthName] || 0;
                        return (
                          <td
                            key={monthName}
                            className={`py-1 px-1 border-r border-slate-300 text-center ${
                              count > 0 ? 'text-slate-900 font-bold bg-slate-50/30' : 'text-slate-400'
                            }`}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      {/* Total Hadir */}
                      <td className="py-1 px-1.5 border-r border-slate-300 text-center font-black text-blue-900 bg-blue-50/40">
                        {row.totalHadir}
                      </td>
                      {/* Nilai Angka & Huruf */}
                      <td className="py-1 px-1 border-r border-slate-300 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${getGradeBadge(row.nilaiHuruf)}`}>
                          {row.nilaiAngka} ({row.nilaiHuruf})
                        </span>
                      </td>
                      {/* Predikat */}
                      <td className="py-1 px-2 border-r border-slate-300 text-center font-bold text-slate-800 text-[9.5px]">
                        {row.predikat}
                      </td>
                      {/* Keterangan */}
                      <td className="py-1 px-2 text-slate-700 text-[9px] leading-snug">
                        {row.keterangan}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Formal Compact Legend (Tanpa KKM, Sederhana & Rapi) */}
        <div className="border border-slate-400 p-1.5 bg-slate-50 text-[9px] mb-2.5 rounded-xs flex flex-wrap items-center justify-between gap-1.5 text-slate-800 leading-none">
          <span className="font-bold uppercase tracking-wider text-slate-900">Pedoman Predikat Akumulasi Kehadiran:</span>
          <span><strong className="text-emerald-800">A (Sangat Baik)</strong>: Akumulasi Kehadiran Tertinggi (&ge;85%)</span>
          <span><strong className="text-blue-800">B (Baik)</strong>: Akumulasi Kehadiran Baik (70% - 84%)</span>
          <span><strong className="text-amber-800">C (Cukup)</strong>: Akumulasi Kehadiran Cukup (50% - 69%)</span>
          <span><strong className="text-rose-800">D (Kurang)</strong>: Akumulasi Kehadiran Rendah (&lt;50%)</span>
        </div>

        {/* 6. Official Signatures (Lembar Pengesahan Dua Sisi) */}
        <div className="signature-row grid grid-cols-2 gap-4 text-[10.5px] pt-1.5 border-t border-slate-400 leading-tight">
          {/* Sisi Kiri: Mengetahui Kepala Sekolah */}
          <div className="text-center relative flex flex-col items-center">
            <p className="text-slate-600 font-semibold mb-0.5">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight">
              Kepala Sekolah {selectedSekolah?.namaSekolah}
            </p>

            <div className="relative h-14 w-44 flex items-center justify-center my-0.5">
              {useWetSignature ? (
                <TandaTanganBasahKepalaSekolah />
              ) : (
                <div className="h-12" />
              )}
            </div>

            <p className="font-black text-slate-900 underline uppercase tracking-wide">
              {selectedSekolah?.kepalaSekolah || 'NITA HERNITA, S.Pd.MM'}
            </p>
            <p className="text-[10px] text-slate-600">
              NIP. {selectedSekolah?.nipKepalaSekolah || '197310221996032002'}
            </p>
          </div>

          {/* Sisi Kanan: Pelatih Ekstrakurikuler */}
          <div className="text-center relative flex flex-col items-center">
            <p className="text-slate-600 font-semibold mb-0.5">
              Bogor, {signatureDate}
            </p>
            <p className="font-bold text-slate-900 leading-tight">
              Pelatih Ekstrakurikuler
            </p>

            <div className="relative h-14 w-44 flex items-center justify-center my-0.5">
              {useWetSignature ? (
                <TandaTanganBasahPelatih customSignatureUrl={customCoachSignature} />
              ) : (
                <div className="h-12" />
              )}
            </div>

            <p className="font-black text-slate-900 underline uppercase tracking-wide">
              {pelatihUser?.name || 'Pelatih Ekstrakurikuler'}
            </p>
            <p className="text-[10px] text-slate-600">
              {pelatihUser?.nip ? `NIP. ${pelatihUser.nip}` : 'Pelatih Marching Band'}
            </p>
          </div>
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
