import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Sekolah, AbsenPelatihItem, Anggota, AbsenSiswaEntry, EventLog, isSchoolCoach } from '../types';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { FileText, Download, Printer, Filter, Sparkles, School, Calendar, CheckCircle2, UserCheck, Users, PenTool, X, RotateCcw, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { StorageService } from '../data/storage';
import { StudentWetSignature, getStudentSignatureDataUrl } from '../utils/studentSignature';
import { formatNamaKapital, formatKelasAngka } from '../utils/nameFormatter';
import { SignaturePad } from './SignaturePad';

interface RekapPdfProps {
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  absenPelatihList: AbsenPelatihItem[];
  anggotaList: Anggota[];
  absenSiswaList: AbsenSiswaEntry[];
  eventsList: EventLog[];
}

import { BULAN_OPTIONS, MONTH_SHORT_MAP, getCurrentMonthName } from '../utils/dateUtils';

export type TemplateType = 'AUTO' | 'SMPN2_CIGOMBONG' | 'SDN_SUKAHARJA_01' | 'SDN_SUKAHARJA_03' | 'STANDARD';

export const RekapPdf: React.FC<RekapPdfProps> = ({
  sekolahList,
  selectedSekolahId,
  absenPelatihList,
  anggotaList,
  absenSiswaList,
  eventsList
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState(selectedSekolahId);
  // Default to current ongoing month
  const [filterBulan, setFilterBulan] = useState(getCurrentMonthName());
  const [filterTahunAjaran, setFilterTahunAjaran] = useState(StorageService.getActiveTahunAjaran());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('AUTO');
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | 'ALL'>('ALL');
  const [namaEkskul, setNamaEkskul] = useState('MARCHING BAND');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sortAnggotaBy, setSortAnggotaBy] = useState<'nama_asc' | 'nama_desc' | 'kelas_asc' | 'kelas_desc' | 'divisi'>('nama_asc');
  const [orientasiKertas, setOrientasiKertas] = useState<'portrait' | 'landscape'>('portrait');
  // User requirement: "Masukan absen sesuai dengan nama anggota yang hadir kedalam laporan, jika tidak hadir tidak perlu dimasukan"
  const [filterHanyaHadir, setFilterHanyaHadir] = useState<boolean>(true);

  useEffect(() => {
    if (selectedSekolahId) {
      setFilterSekolahId(selectedSekolahId);
    }
  }, [selectedSekolahId]);

  const tahunAjaranOptions = StorageService.getTahunAjaranList();
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const selectedSekolah = sekolahList.find(s => s.id === filterSekolahId) || sekolahList[0];
  const namaSekolahFormatted = selectedSekolah?.namaSekolah ? selectedSekolah.namaSekolah.toUpperCase() : 'NAMA SEKOLAH';

  // Determine active template based on auto detection or manual override
  const resolvedTemplate = useMemo((): 'SMPN2_CIGOMBONG' | 'SDN_SUKAHARJA_01' | 'SDN_SUKAHARJA_03' | 'STANDARD' => {
    if (selectedTemplate !== 'AUTO') return selectedTemplate;

    const schoolNameLower = (selectedSekolah?.namaSekolah || '').toLowerCase();
    if (schoolNameLower.includes('cigombong') || schoolNameLower.includes('smpn 2') || schoolNameLower.includes('smp negeri 2')) {
      return 'SMPN2_CIGOMBONG';
    }
    if (schoolNameLower.includes('sukaharja 03') || schoolNameLower.includes('sukaharja 3')) {
      return 'SDN_SUKAHARJA_03';
    }
    if (schoolNameLower.includes('sukaharja 01') || schoolNameLower.includes('sukaharja 1') || schoolNameLower.includes('sukaharja')) {
      return 'SDN_SUKAHARJA_01';
    }
    return 'STANDARD';
  }, [selectedTemplate, selectedSekolah]);

  // Adjust default namaEkskul based on template
  useEffect(() => {
    if (resolvedTemplate === 'SDN_SUKAHARJA_01' || resolvedTemplate === 'SDN_SUKAHARJA_03') {
      setNamaEkskul('DRUMBAND');
    } else {
      setNamaEkskul('MARCHING BAND');
    }
  }, [resolvedTemplate]);

  // Get coach info (prefer logged-in coach if they are lead or collaborator for this school)
  const pelatihUser = useMemo(() => {
    const users = StorageService.getUsers();
    const currentUser = StorageService.getCurrentUser();
    if (currentUser && selectedSekolah && isSchoolCoach(selectedSekolah, currentUser.id)) {
      return currentUser;
    }
    return users.find(u => u.id === selectedSekolah?.pelatihId) || currentUser;
  }, [selectedSekolah]);

  const pelatihName = pelatihUser?.name || 'Pelatih Ekstrakurikuler';
  const pelatihNip = pelatihUser?.nip || '';

  // Get headmaster & NIP info for the school
  const kepalaSekolahInfo = useMemo(() => {
    if (resolvedTemplate === 'SDN_SUKAHARJA_01') {
      return {
        nama: selectedSekolah?.kepalaSekolah || 'NITA HERNITA, S.Pd.MM',
        nip: selectedSekolah?.nipKepalaSekolah || '197310221996032002'
      };
    }
    if (resolvedTemplate === 'SDN_SUKAHARJA_03') {
      return {
        nama: selectedSekolah?.kepalaSekolah || 'HJ YENI SUMARNI, S.Pd.MM',
        nip: selectedSekolah?.nipKepalaSekolah || '196612031988032005'
      };
    }
    return {
      nama: selectedSekolah?.kepalaSekolah || '',
      nip: selectedSekolah?.nipKepalaSekolah || ''
    };
  }, [resolvedTemplate, selectedSekolah]);

  // Helper: Cek apakah anggota tercatat HADIR pada bulan dan sekolah yang dipilih
  const isStudentPresentInMonth = (studentId: string): boolean => {
    return absenSiswaList.some(
      a => a.anggotaId === studentId &&
           a.sekolahId === filterSekolahId &&
           (!a.bulan || a.bulan.toLowerCase() === filterBulan.toLowerCase()) &&
           a.status === 'Hadir'
    );
  };

  // Filter & sort school members based on attendance and selected sorting criteria
  // User requirement: "Masukan absen sesuai dengan nama anggota yang hadir kedalam laporan, jika tidak hadir tidak perlu dimasukan"
  const schoolAnggota = useMemo(() => {
    let list = anggotaList.filter(a => a.sekolahId === filterSekolahId);

    // Jika filterHanyaHadir aktif (default): Hanya sertakan anggota yang hadir di bulan aktif
    if (filterHanyaHadir) {
      list = list.filter(student => isStudentPresentInMonth(student.id));
    }

    return [...list].sort((a, b) => {
      if (sortAnggotaBy === 'nama_asc') {
        return (a.nama || '').localeCompare(b.nama || '', 'id-ID');
      }
      if (sortAnggotaBy === 'nama_desc') {
        return (b.nama || '').localeCompare(a.nama || '', 'id-ID');
      }
      if (sortAnggotaBy === 'kelas_asc') {
        const kA = formatKelasAngka(a.kelas || '');
        const kB = formatKelasAngka(b.kelas || '');
        return kA.localeCompare(kB, undefined, { numeric: true }) || (a.nama || '').localeCompare(b.nama || '', 'id-ID');
      }
      if (sortAnggotaBy === 'kelas_desc') {
        const kA = formatKelasAngka(a.kelas || '');
        const kB = formatKelasAngka(b.kelas || '');
        return kB.localeCompare(kA, undefined, { numeric: true }) || (a.nama || '').localeCompare(b.nama || '', 'id-ID');
      }
      if (sortAnggotaBy === 'divisi') {
        return (a.divisiNama || '').localeCompare(b.divisiNama || '', 'id-ID') || (a.nama || '').localeCompare(b.nama || '', 'id-ID');
      }
      return 0;
    });
  }, [anggotaList, filterSekolahId, sortAnggotaBy, filterHanyaHadir, filterBulan, absenSiswaList]);

  // Total terdaftar vs total hadir untuk indikator visual
  const totalRegisteredInSchool = useMemo(() => {
    return anggotaList.filter(a => a.sekolahId === filterSekolahId).length;
  }, [anggotaList, filterSekolahId]);

  const totalHadirInSchoolMonth = useMemo(() => {
    return anggotaList.filter(a => a.sekolahId === filterSekolahId && isStudentPresentInMonth(a.id)).length;
  }, [anggotaList, filterSekolahId, filterBulan, absenSiswaList]);

  // Filter Absen Pelatih by selected school, year, and month
  const selectedMonthShort = MONTH_SHORT_MAP[filterBulan] || filterBulan.substring(0, 3);
  const schoolAbsenPelatih = absenPelatihList.filter(a => {
    if (a.sekolahId !== filterSekolahId) return false;
    if (a.tahunAjaran && filterTahunAjaran && a.tahunAjaran !== filterTahunAjaran) return false;
    if (filterBulan) {
      const formattedMatch = a.hariTanggalFormat ? a.hariTanggalFormat.toLowerCase().includes(selectedMonthShort.toLowerCase()) : true;
      const dateMatch = a.tanggal ? (
        new Date(a.tanggal).getMonth() === BULAN_OPTIONS.indexOf(filterBulan)
      ) : true;
      return formattedMatch || dateMatch;
    }
    return true;
  });

  const documentationItems = schoolAbsenPelatih.filter(a => !!a.fotoDokumentasiUrl);
  const schoolEvents = eventsList.filter(e => {
    if (e.sekolahId !== filterSekolahId) return false;
    if (e.tahunAjaran && filterTahunAjaran && e.tahunAjaran !== filterTahunAjaran) return false;
    return true;
  });

  // Filter events matching active selected month
  const eventPhotosForMonth = schoolEvents.filter(e => {
    if (!e.fotoUrl) return false;
    if (!filterBulan) return true;
    if (!e.tanggal) return true;
    const m = new Date(e.tanggal).getMonth();
    if (isNaN(m)) return true;
    return m === BULAN_OPTIONS.indexOf(filterBulan);
  });
  const allSchoolEventPhotos = schoolEvents.filter(e => !!e.fotoUrl);
  // Prioritize active month event photos, fallback to all school event photos if none in selected month
  const activeEventPhotos = eventPhotosForMonth.length > 0 ? eventPhotosForMonth : allSchoolEventPhotos;

  // DYNAMIC PAGINATION: Automatically include ALL registered members without cut-off!
  // For Cigombong & Standard Format: 30 members per sheet
  const anggotaPages = useMemo(() => {
    if (schoolAnggota.length === 0) {
      return [{
        members: Array.from({ length: 30 }, () => null),
        pageIndex: 0,
        startNo: 1,
        totalInPage: 0
      }];
    }
    const pages = [];
    const pageSize = 30;
    for (let i = 0; i < schoolAnggota.length; i += pageSize) {
      const slice = schoolAnggota.slice(i, i + pageSize);
      // Pad to 30 rows with null to maintain exact standard paper layout
      const members = Array.from({ length: 30 }, (_, idx) => slice[idx] || null);
      pages.push({
        members,
        pageIndex: Math.floor(i / pageSize),
        startNo: i + 1,
        totalInPage: slice.length
      });
    }
    return pages;
  }, [schoolAnggota]);

  // For Sukaharja 01 & 03: 60 members per sheet (30 left column, 30 right column)
  const sukaharjaAnggotaPages = useMemo(() => {
    if (schoolAnggota.length === 0) {
      return [{
        left: Array.from({ length: 30 }, () => null),
        right: Array.from({ length: 30 }, () => null),
        pageIndex: 0,
        startNo: 1
      }];
    }
    const pages = [];
    const pageSize = 60;
    for (let i = 0; i < schoolAnggota.length; i += pageSize) {
      const slice = schoolAnggota.slice(i, i + pageSize);
      const leftSlice = slice.slice(0, 30);
      const rightSlice = slice.slice(30, 60);
      const left = Array.from({ length: 30 }, (_, idx) => leftSlice[idx] || null);
      const right = Array.from({ length: 30 }, (_, idx) => rightSlice[idx] || null);
      pages.push({
        left,
        right,
        pageIndex: Math.floor(i / pageSize),
        startNo: i + 1
      });
    }
    return pages;
  }, [schoolAnggota]);

  // Backward-compatible fallback references
  const page1to30Anggota = schoolAnggota.slice(0, 30);
  const page31to60Anggota = schoolAnggota.slice(30, 60);
  const paddedPage1to30Rows = Array.from({ length: 30 }, (_, i) => page1to30Anggota[i] || null);
  const paddedPage31to60Rows = Array.from({ length: 30 }, (_, i) => page31to60Anggota[i] || null);

  // Pad agendas table to 5 or 7 rows
  const padded5AgendaRows = Array.from({ length: 5 }, (_, i) => schoolAbsenPelatih[i] || null);
  const padded7AgendaRows = Array.from({ length: 7 }, (_, i) => schoolAbsenPelatih[i] || null);

  // Helper to determine if a student was present for a column (1 to 5) and retrieve signature info
  const getStudentAttendanceStatus = (student: Anggota | null, kolomIndex: number): { isPresent: boolean; label: string; customSig: string | null } => {
    if (!student) return { isPresent: false, label: '', customSig: null };
    const record = absenSiswaList.find(
      a => a.anggotaId === student.id &&
           a.sekolahId === filterSekolahId &&
           (!a.bulan || a.bulan.toLowerCase() === filterBulan.toLowerCase()) &&
           (a.kolomIndex === kolomIndex || (a.kolomIndex === undefined && kolomIndex === 1))
    );
    if (record) {
      if (record.status === 'Izin' || record.status === 'Sakit' || record.status === 'Alfa' || record.status === 'Alpa') {
        return { isPresent: false, label: '', customSig: null };
      }
      if (record.status === 'Hadir') {
        return { isPresent: true, label: '', customSig: record.signatureUrl || student.signatureUrl || null };
      }
    }
    // Strict adherence: ONLY mark present if there is an actual attendance record; never auto-fill 5 columns
    return { isPresent: false, label: '', customSig: null };
  };

  // Function to get student signature for a column (1 to 5) or meeting index
  const getStudentSignatureForColumn = (anggotaId: string, kolomIndex: number): string | null => {
    const student = schoolAnggota.find(s => s.id === anggotaId);
    if (!student) return null;
    const status = getStudentAttendanceStatus(student, kolomIndex);
    if (status.isPresent) {
      return status.customSig || getStudentSignatureDataUrl(student.nama, kolomIndex);
    }
    return status.label || null;
  };

  // Get student signature for a specific meeting
  const getStudentSignatureForMeeting = (student: Anggota | null, meetingIdx: number): string | null => {
    if (!student) return null;
    const status = getStudentAttendanceStatus(student, meetingIdx + 1);
    if (status.isPresent) {
      return status.customSig || getStudentSignatureDataUrl(student.nama, meetingIdx + 1);
    }
    return status.label || null;
  };

  // Get coach signature for a meeting or general
  const coachSignatureUrl = useMemo(() => {
    const sessionWithSig = schoolAbsenPelatih.find(a => !!a.parafPelatihUrl);
    return sessionWithSig?.parafPelatihUrl || '';
  }, [schoolAbsenPelatih]);

  // Assistant Coach States & Detection
  const [includeAsistenPelatih, setIncludeAsistenPelatih] = useState(false);
  const [asistenName, setAsistenName] = useState('Rian Hidayat, S.Pd');
  const [asistenNip, setAsistenNip] = useState('199508142022011003');
  const [customAsistenSig, setCustomAsistenSig] = useState<string | null>(null);
  const [isDrawingAsistenSig, setIsDrawingAsistenSig] = useState(false);

  // Registered assistant users from database
  const registeredAssistants = useMemo(() => {
    const users = StorageService.getUsers();
    return users.filter(u => u.role === 'asisten_pelatih');
  }, []);

  // Check if assistant coach has attendance logs in the selected school
  const detectedAsistenLog = useMemo(() => {
    const absenAsisten = StorageService.getAbsenAsisten();
    return absenAsisten.find(a => a.sekolahId === filterSekolahId) || null;
  }, [filterSekolahId]);

  // Set default assistant info when switching school or list updates
  useEffect(() => {
    if (detectedAsistenLog?.asistenName) {
      setAsistenName(detectedAsistenLog.asistenName);
    } else if (registeredAssistants.length > 0) {
      setAsistenName(registeredAssistants[0].name);
      setAsistenNip(registeredAssistants[0].nip || '');
    } else {
      setAsistenName('Rian Hidayat, S.Pd');
      setAsistenNip('199508142022011003');
    }
  }, [detectedAsistenLog, registeredAssistants, filterSekolahId]);

  // Assistant coach signature URL
  const asistenSignatureUrl = useMemo(() => {
    if (customAsistenSig) return customAsistenSig;
    if (detectedAsistenLog?.parafAsistenUrl) return detectedAsistenLog.parafAsistenUrl;
    return getStudentSignatureDataUrl(asistenName || 'Asisten Pelatih', 77);
  }, [customAsistenSig, detectedAsistenLog, asistenName]);

  const timesNewRomanFont = {
    fontFamily: '"Times New Roman", Times, "Liberation Serif", serif'
  };

  const getPdfPageClass = (extraPadding = 'p-[14mm]') => {
    const isLandscape = orientasiKertas === 'landscape';
    const dims = isLandscape ? 'w-[297mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]';
    const pageClass = isLandscape ? 'pdf-landscape' : 'pdf-portrait';
    return `pdf-page ${pageClass} bg-white ${dims} ${extraPadding} shadow-xl text-black box-border flex flex-col justify-between mx-auto relative transition-all`;
  };

  const exportPdf = async () => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const container = pdfContainerRef.current;
      const isLandscape = orientasiKertas === 'landscape';
      const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
      const pages = container.querySelectorAll<HTMLElement>('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#FFFFFF'
        });

        // Use JPEG 0.92 to reduce memory footprint by 85% and prevent corrupted large files on mobile/desktop
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgWidth = isLandscape ? 297 : 210; // A4 width in mm
        const pageHeight = isLandscape ? 210 : 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage('a4', isLandscape ? 'l' : 'p');
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      }

      // Safe Blob download to prevent corruption or popup blocker issues
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `Laporan-Ekstrakurikuler-${namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_')}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}-${isLandscape ? 'Landscape' : 'Portrait'}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Gagal mengekspor PDF otomatis. Anda dapat menggunakan tombol Cetak Langsung Browser.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgressText, setImageProgressText] = useState('');

  // Export every page of the report as high-resolution JPG / PNG image
  const exportImage = async (format: 'jpeg' | 'png') => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingImage(true);
    const formatLabel = format === 'jpeg' ? 'JPG' : 'PNG';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const quality = format === 'jpeg' ? 0.95 : undefined;

    try {
      const container = pdfContainerRef.current;
      const pages = container.querySelectorAll<HTMLElement>('.pdf-page');

      if (pages.length === 0) {
        alert('Tidak ada halaman laporan untuk diekspor ke gambar.');
        return;
      }

      for (let i = 0; i < pages.length; i++) {
        setImageProgressText(`Memproses ${formatLabel} Hal ${i + 1}/${pages.length}...`);
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#FFFFFF'
        });

        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve();
              return;
            }
            const blobUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = `Laporan-${namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_')}-Hal-${i + 1}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.${ext}`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
            resolve();
          }, mimeType, quality);
        });

        if (pages.length > 1 && i < pages.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (err) {
      console.error('Image Export failed:', err);
      alert(`Gagal mengekspor berkas ${formatLabel}.`);
    } finally {
      setIsGeneratingImage(false);
      setImageProgressText('');
    }
  };

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Agenda & Jurnal Latihan
      const agendaData: any[][] = [
        ['LAPORAN AGENDA & JURNAL LATIHAN EKSTRAKURIKULER'],
        [`Sekolah: ${selectedSekolah?.namaSekolah || '-'}`],
        [`Bulan: ${filterBulan} | Tahun Pelajaran: ${filterTahunAjaran}`],
        [`Pelatih: ${pelatihName}${pelatihNip ? ` (NIP: ${pelatihNip})` : ''}`],
        [],
        ['No', 'Hari & Tanggal', 'Waktu Latihan', 'Materi Pokok / Kegiatan', 'Pencapaian (%)', 'Status Pengesahan', 'Catatan / Evaluasi']
      ];

      if (schoolAbsenPelatih.length === 0) {
        agendaData.push(['-', 'Belum ada catatan jurnal latihan pada periode ini', '-', '-', '-', '-', '-']);
      } else {
        schoolAbsenPelatih.forEach((item, idx) => {
          agendaData.push([
            idx + 1,
            item.hariTanggalFormat || item.tanggal || '-',
            `${item.jamMulai || '-'} s/d ${item.jamSelesai || '-'}`,
            item.materiPokok || '-',
            `${item.pencapaianPercent || 0}%`,
            item.statusKepalaSekolah || 'Mengetahui',
            item.catatan || '-'
          ]);
        });
      }

      const wsAgenda = XLSX.utils.aoa_to_sheet(agendaData);
      wsAgenda['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 18 },
        { wch: 38 },
        { wch: 16 },
        { wch: 18 },
        { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsAgenda, 'Agenda Latihan');

      // Sheet 2: Daftar Hadir Anggota
      const attendanceData: any[][] = [
        ['DAFTAR PRESENSI KEHADIRAN ANGGOTA MARCHING BAND'],
        [`Sekolah: ${selectedSekolah?.namaSekolah || '-'}`],
        [`Bulan: ${filterBulan} | Tahun Pelajaran: ${filterTahunAjaran}`],
        [],
        ['No', 'Nama Anggota', 'Kelas', 'Divisi / Alat', 'Pertemuan 1', 'Pertemuan 2', 'Pertemuan 3', 'Pertemuan 4', 'Pertemuan 5', 'Total Hadir', 'Persentase (%)']
      ];

      if (schoolAnggota.length === 0) {
        attendanceData.push(['-', 'Belum ada anggota terdaftar di sekolah ini', '-', '-', '-', '-', '-', '-', '-', 0, '0%']);
      } else {
        schoolAnggota.forEach((student, idx) => {
          let totalHadir = 0;
          const cols = [1, 2, 3, 4, 5].map(col => {
            const status = getStudentAttendanceStatus(student, col);
            if (status.isPresent) {
              totalHadir++;
              return 'Hadir';
            }
            return status.label || 'Alfa';
          });
          const pct = Math.round((totalHadir / 5) * 100);

          attendanceData.push([
            idx + 1,
            formatNamaKapital(student.nama),
            formatKelasAngka(student.kelas) || '-',
            student.divisiNama || '-',
            cols[0],
            cols[1],
            cols[2],
            cols[3],
            cols[4],
            totalHadir,
            `${pct}%`
          ]);
        });
      }

      const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
      wsAttendance['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 10 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Presensi Anggota');

      // Sheet 3: Event & Dokumentasi
      if (schoolEvents.length > 0) {
        const eventData: any[][] = [
          ['LAPORAN EVENT & KEGIATAN UNGGULAN MARCHING BAND'],
          [`Sekolah: ${selectedSekolah?.namaSekolah || '-'}`],
          [`Tahun Pelajaran: ${filterTahunAjaran}`],
          [],
          ['No', 'Nama Event / Kegiatan', 'Tanggal', 'Lokasi', 'Prestasi / Penghargaan', 'Keterangan']
        ];

        schoolEvents.forEach((evt, idx) => {
          eventData.push([
            idx + 1,
            evt.namaEvent || '-',
            evt.tanggal || '-',
            evt.lokasi || '-',
            evt.prestasi || '-',
            evt.keterangan || '-'
          ]);
        });

        const wsEvent = XLSX.utils.aoa_to_sheet(eventData);
        wsEvent['!cols'] = [
          { wch: 6 },
          { wch: 30 },
          { wch: 16 },
          { wch: 22 },
          { wch: 24 },
          { wch: 32 }
        ];
        XLSX.utils.book_append_sheet(wb, wsEvent, 'Event & Prestasi');
      }

      const cleanSchoolName = namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Laporan-Ekstrakurikuler-${cleanSchoolName}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('Terjadi kesalahan saat mengekspor Excel.');
    }
  };

  const exportWord = () => {
    const cleanSchoolName = namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Laporan-Ekstrakurikuler-${cleanSchoolName}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.doc`;

    const htmlHeader = `
<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Laporan Ekstrakurikuler - ${namaSekolahFormatted}</title>
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
      size: 210mm 297mm;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #000000;
      line-height: 1.3;
    }
    .header-box {
      text-align: center;
      margin-bottom: 16px;
    }
    .header-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }
    .header-subtitle {
      font-size: 11pt;
      font-weight: bold;
      margin: 2px 0;
      text-transform: uppercase;
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
    .page-break {
      page-break-before: always;
      mso-break-type: page;
    }
    .materi-box {
      border: 1px solid #000000;
      min-height: 80px;
      padding: 8px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
`;

    let bodyContent = '';

    if (resolvedTemplate === 'SMPN2_CIGOMBONG') {
      const agendaRows = padded5AgendaRows.map((row, idx) => `
        <tr style="height: 50px;">
          <td><b>${idx + 1}</b></td>
          <td>${row?.hariTanggalFormat || row?.tanggal || ''}</td>
          <td class="text-left">${row?.materiPokok || ''}</td>
          <td>${row?.parafPelatihUrl ? `<img src="${row.parafPelatihUrl}" height="32" />` : ''}</td>
        </tr>
      `).join('');

      // Include all registered school members in the Word export table, or at least padded to 30 rows if empty/small
      const allMembersToExport = schoolAnggota.length > 0 ? schoolAnggota : paddedPage1to30Rows;
      const studentsRows = allMembersToExport.map((student, idx) => {
        const sigCols = [1, 2, 3, 4, 5].map(col => {
          if (!student) return '';
          const status = getStudentAttendanceStatus(student, col);
          if (status.isPresent) {
            const sigUrl = status.customSig || getStudentSignatureDataUrl(student.nama, col);
            return `<img src="${sigUrl}" height="24" style="max-height: 24px; object-contain: contain;" />`;
          }
          return status.label || '';
        });
        const capitalizedName = formatNamaKapital(student?.nama);
        return `
          <tr style="height: 28px;">
            <td>${student ? idx + 1 : ''}</td>
            <td style="text-align: center;">${capitalizedName || ''}</td>
            <td>${student?.kelas ? formatKelasAngka(student.kelas) : ''}</td>
            <td>${sigCols[0]}</td>
            <td>${sigCols[1]}</td>
            <td>${sigCols[2]}</td>
            <td>${sigCols[3]}</td>
            <td>${sigCols[4]}</td>
          </tr>
        `;
      }).join('');

      const cigombongSignatureHtml = includeAsistenPelatih ? `
        <div style="margin-top: 35px; text-align: right;">
          <div style="margin-bottom: 8px; font-size: 9pt;">Cigombong, ................................</div>
          <div style="display: inline-block; text-align: center;">
            <div style="font-weight: bold; margin-bottom: 8px;">TIM PELATIH EKSTRAKURIKULER</div>
            <table style="border: none; text-align: center; font-size: 9.5pt; width: auto; margin-left: auto;">
              <tr>
                <td style="width: 160px; vertical-align: top; border: none; padding-right: 25px;">
                  <div><b>Pelatih Utama</b></div>
                  <div style="height: 55px;"></div>
                  <div><b>(${pelatihName})</b></div>
                  ${pelatihNip ? `<div style="font-size: 8.5pt;">NIP/NUPTK. ${pelatihNip}</div>` : ''}
                </td>
                <td style="width: 160px; vertical-align: top; border: none; padding-left: 25px;">
                  <div><b>Asisten Pelatih</b></div>
                  <div style="height: 55px;"></div>
                  <div><b>(${asistenName})</b></div>
                  ${asistenNip ? `<div style="font-size: 8.5pt;">NIP/NUPTK. ${asistenNip}</div>` : ''}
                </td>
              </tr>
            </table>
          </div>
        </div>
      ` : `
        <div style="text-align: right; margin-top: 40px; font-size: 9.5pt;">
          <div>Cigombong, ................................</div>
          <div>Pelatih Ekstrakurikuler</div>
          <div style="height: 50px;"></div>
          <div><b>${pelatihName}</b></div>
          ${pelatihNip ? `<div>NIP/NUPTK. ${pelatihNip}</div>` : ''}
        </div>
      `;

      bodyContent = `
        <div class="header-box">
          <div class="header-title">LAPORAN KEGIATAN EKSTRAKURIKULER</div>
          <div class="header-subtitle">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</div>
          <div class="header-subtitle">TAHUN PELAJARAN ${filterTahunAjaran}</div>
        </div>
        <div style="font-weight: bold; margin-bottom: 10px;">NAMA EKSTRAKURIKULER : ${namaEkskul}</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 15%;">Minggu Ke-</th>
              <th style="width: 25%;">Tanggal</th>
              <th>Materi Kegiatan</th>
              <th style="width: 20%;">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>${agendaRows}</tbody>
        </table>
        ${cigombongSignatureHtml}

        <div class="page-break"></div>

        <div class="header-box">
          <div class="header-title">DAFTAR HADIR PESERTA EKSTRAKURIKULER</div>
          <div class="header-subtitle">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</div>
          <div class="header-subtitle">TAHUN PELAJARAN ${filterTahunAjaran}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold;">
          <span>Bulan : ${filterBulan}</span>
          <span style="text-align: right;">Nama Ekstrakurikuler : ${namaEkskul}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">No.</th>
              <th rowspan="2" style="width: 40%;">Nama Anggota</th>
              <th rowspan="2" style="width: 15%;">Kelas</th>
              <th colspan="5">Tanggal/Tanda Tangan</th>
            </tr>
            <tr>
              <th style="width: 8%;">1</th>
              <th style="width: 8%;">2</th>
              <th style="width: 8%;">3</th>
              <th style="width: 8%;">4</th>
              <th style="width: 8%;">5</th>
            </tr>
          </thead>
          <tbody>${studentsRows}</tbody>
        </table>
        ${cigombongSignatureHtml}
      `;
    } else if (resolvedTemplate === 'SDN_SUKAHARJA_01' || resolvedTemplate === 'SDN_SUKAHARJA_03') {
      const schoolTitle = resolvedTemplate === 'SDN_SUKAHARJA_01' ? 'SDN SUKAHARJA 01' : 'SDN SUKAHARJA 03';
      const meeting = schoolAbsenPelatih[0];

      const leftRows = paddedPage1to30Rows.map((student, idx) => {
        let ttdHtml = '';
        if (student) {
          const status = getStudentAttendanceStatus(student, 1);
          if (status.isPresent) {
            const sigUrl = status.customSig || getStudentSignatureDataUrl(student.nama, 1);
            ttdHtml = `<img src="${sigUrl}" height="22" style="max-height: 22px; object-contain: contain;" />`;
          } else {
            ttdHtml = status.label || '';
          }
        }
        return `
          <tr style="height: 24px;">
            <td style="text-align: center; font-size: 8.5pt;">${student ? idx + 1 : ''}</td>
            <td style="text-align: center; font-size: 8.5pt;">${student ? (formatNamaKapital(student.nama) || '') : ''}</td>
            <td style="text-align: center; font-size: 8.5pt;">${ttdHtml}</td>
          </tr>
        `;
      }).join('') + `
        <tr style="height: 20px; font-weight: bold;">
          <td style="text-align: center; font-size: 8.5pt;">NO</td>
          <td style="text-align: center; font-size: 8.5pt;">NAMA</td>
          <td style="text-align: center; font-size: 8.5pt;">TTD</td>
        </tr>
      `;

      const rightRows = paddedPage31to60Rows.map((student, idx) => {
        let ttdHtml = '';
        if (student) {
          const status = getStudentAttendanceStatus(student, 1);
          if (status.isPresent) {
            const sigUrl = status.customSig || getStudentSignatureDataUrl(student.nama, 1);
            ttdHtml = `<img src="${sigUrl}" height="22" style="max-height: 22px; object-contain: contain;" />`;
          } else {
            ttdHtml = status.label || '';
          }
        }
        return `
          <tr style="height: 24px;">
            <td style="text-align: center; font-size: 8.5pt;">${student ? idx + 31 : ''}</td>
            <td style="text-align: center; font-size: 8.5pt;">${student ? (formatNamaKapital(student.nama) || '') : ''}</td>
            <td style="text-align: center; font-size: 8.5pt;">${ttdHtml}</td>
          </tr>
        `;
      }).join('') + `
        <tr style="height: 18px;">
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr style="height: 18px;">
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;

      const sukaharjaSignatureHtml = includeAsistenPelatih ? `
        <table style="width: 100%; margin-top: 18px; text-align: left; font-size: 9pt; border: none;">
          <tr>
            <td style="width: 45%; vertical-align: top; border: none;">
              <div>MENGETAHUI,</div>
              <div>KEPALA ${schoolTitle}</div>
              <div style="height: 50px;"></div>
              <div><u><b>${kepalaSekolahInfo.nama}</b></u></div>
              <div>NIP. ${kepalaSekolahInfo.nip || '................................................'}</div>
            </td>
            <td style="width: 55%; vertical-align: top; border: none; text-align: center;">
              <div><b>TIM PELATIH / PEMBIMBING</b></div>
              <table style="width: 100%; border: none; margin-top: 4px;">
                <tr>
                  <td style="width: 50%; border: none; text-align: center; vertical-align: top;">
                    <div style="font-size: 8.5pt; font-weight: bold;">Pelatih Utama</div>
                    <div style="height: 44px;"></div>
                    <div><b>(${pelatihName})</b></div>
                    <div style="margin-top: 2px; font-size: 8pt;">NIP/NUPTK. ${pelatihNip || '....................'}</div>
                  </td>
                  <td style="width: 50%; border: none; text-align: center; vertical-align: top;">
                    <div style="font-size: 8.5pt; font-weight: bold;">Asisten Pelatih</div>
                    <div style="height: 44px;"></div>
                    <div><b>(${asistenName})</b></div>
                    <div style="margin-top: 2px; font-size: 8pt;">NIP/NUPTK. ${asistenNip || '....................'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      ` : `
        <table style="width: 100%; margin-top: 18px; text-align: left; font-size: 9pt; border: none;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-left: 2px; border: none;">
              <div>MENGETAHUI,</div>
              <div>KEPALA ${schoolTitle}</div>
              <div style="height: 50px;"></div>
              <div><u><b>${kepalaSekolahInfo.nama}</b></u></div>
              <div>NIP. ${kepalaSekolahInfo.nip || '................................................'}</div>
            </td>
            <td style="width: 45%; vertical-align: top; border: none;">
              <div>PEMBIMBING</div>
              <div style="height: 50px;"></div>
              <div>.........................................................................</div>
              <div style="margin-top: 2px;">NIP/NUPTK. ${pelatihNip || ''}</div>
            </td>
          </tr>
        </table>
      `;

      bodyContent = `
        <div class="header-box" style="text-align: center; margin-bottom: 14px;">
          <div style="font-size: 11pt; font-weight: bold;">DAFTAR HADIR KEGIATAN EKSTRAKURIKULER DRUMBAND</div>
          <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">${schoolTitle}</div>
          <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">TAHUN PELAJARAN ${filterTahunAjaran}</div>
        </div>
        <div style="text-align: right; font-size: 9pt; margin-bottom: 8px; font-weight: normal;">
          <div>HARI / TANGGAL &nbsp;&nbsp;: ......... / ......... / ................</div>
          <div>WAKTU &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ................ S/D .................</div>
        </div>
        <div class="materi-box" style="border: 1px solid #000; padding: 6px 8px; margin-bottom: 10px; min-height: 120px;">
          <div style="font-weight: normal; font-size: 9pt;">MATERI:</div>
          <div style="font-size: 9pt; margin-top: 4px;">${meeting?.materiPokok || ''}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 49%; vertical-align: top;">
              <table class="data-table" style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
                <thead><tr style="height: 20px; font-weight: bold;"><th style="width: 12%; border: 1px solid #000;">NO</th><th style="border: 1px solid #000;">NAMA</th><th style="width: 24%; border: 1px solid #000;">TTD</th></tr></thead>
                <tbody>${leftRows}</tbody>
              </table>
            </td>
            <td style="width: 2%;"></td>
            <td style="width: 49%; vertical-align: top;">
              <table class="data-table" style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
                <tbody>${rightRows}</tbody>
              </table>
            </td>
          </tr>
        </table>
        ${sukaharjaSignatureHtml}
      `;
    } else {
      // Standard template export
      bodyContent = `<div class="header-box"><div class="header-title">LAPORAN RESMI MARCHING BAND</div><div class="header-subtitle">${namaSekolahFormatted}</div></div>`;
    }

    const eventPhotosWordHtml = activeEventPhotos.length > 0 ? `
      <div style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; font-size: 11pt; border-bottom: 2px solid #000; padding-bottom: 4px;">
        A. DOKUMENTASI FOTO LAPORAN EVENT & KEGIATAN UNGGULAN
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        ${activeEventPhotos.map((evt, idx) => `
          <tr>
            <td style="width: 100%; padding: 10px; vertical-align: top; border: 1px solid #000; background-color: #fafafa; margin-bottom: 10px;">
              <div style="text-align: center; margin-bottom: 8px;">
                <img src="${evt.fotoUrl}" width="380" style="max-height: 240px; object-fit: contain; border: 1px solid #ccc;" />
              </div>
              <div style="font-weight: bold; font-size: 10.5pt; color: #1e293b;">${idx + 1}. ${evt.namaEvent}</div>
              <div style="font-size: 9pt; color: #475569; margin-top: 2px;">
                <b>Tanggal:</b> ${evt.tanggal} ${evt.lokasi ? ` | <b>Lokasi:</b> ${evt.lokasi}` : ''}
              </div>
              ${evt.prestasi ? `<div style="font-size: 9.5pt; font-weight: bold; color: #b45309; margin-top: 4px; background: #fef3c7; padding: 4px 8px; border: 1px solid #fde68a;">🏆 Prestasi: ${evt.prestasi}</div>` : ''}
              ${evt.keterangan ? `<div style="font-size: 9pt; font-style: italic; color: #334155; margin-top: 4px;"><b>Keterangan:</b> ${evt.keterangan}</div>` : ''}
            </td>
          </tr>
        `).join('')}
      </table>
    ` : '';

    const trainingPhotosWordHtml = documentationItems.length > 0 ? `
      <div style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; font-size: 11pt; border-bottom: 2px solid #000; padding-bottom: 4px;">
        B. DOKUMENTASI FOTO KEGIATAN LATIHAN REGULER
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        ${documentationItems.map((item, idx) => `
          <tr>
            <td style="width: 100%; padding: 10px; vertical-align: top; border: 1px solid #000; background-color: #fafafa; margin-bottom: 10px;">
              <div style="text-align: center; margin-bottom: 8px;">
                <img src="${item.fotoDokumentasiUrl}" width="380" style="max-height: 240px; object-fit: contain; border: 1px solid #ccc;" />
              </div>
              <div style="font-weight: bold; font-size: 10pt; color: #1e293b;">${idx + 1}. Pertemuan ${item.hariTanggalFormat || item.tanggal} (${item.jamMulai} - ${item.jamSelesai})</div>
              <div style="font-size: 9pt; margin-top: 2px;"><b>Materi Pokok:</b> ${item.materiPokok}</div>
              <div style="font-size: 9pt; margin-top: 2px;"><b>Tingkat Pencapaian:</b> ${item.pencapaianPercent}%</div>
              ${item.catatan ? `<div style="font-size: 8.5pt; font-style: italic; color: #475569; margin-top: 2px;"><b>Catatan:</b> "${item.catatan}"</div>` : ''}
            </td>
          </tr>
        `).join('')}
      </table>
    ` : '';

    const lampiranWordContent = (activeEventPhotos.length > 0 || documentationItems.length > 0) ? `
      <div class="page-break"></div>
      <div class="header-box">
        <div class="header-title">LAMPIRAN FOTO DOKUMENTASI KEGIATAN & EVENT</div>
        <div class="header-subtitle">${namaSekolahFormatted}</div>
        <div class="header-subtitle">BULAN ${filterBulan.toUpperCase()} — TAHUN PELAJARAN ${filterTahunAjaran}</div>
      </div>
      ${eventPhotosWordHtml}
      ${trainingPhotosWordHtml}
    ` : '';

    const fullHtml = htmlHeader + bodyContent + lampiranWordContent + '</body></html>';
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  // Render meetings to display for Sukaharja templates
  const sukaharjaMeetings = useMemo(() => {
    if (schoolAbsenPelatih.length === 0) {
      return [{ id: 'blank-1', hariTanggalFormat: '', jamMulai: '', jamSelesai: '', materiPokok: '', index: 0 }];
    }
    if (selectedMeetingIndex === 'ALL') {
      return schoolAbsenPelatih.map((m, idx) => ({ ...m, index: idx }));
    }
    const single = schoolAbsenPelatih[selectedMeetingIndex];
    return single ? [{ ...single, index: selectedMeetingIndex }] : [{ id: 'blank-1', hariTanggalFormat: '', jamMulai: '', jamSelesai: '', materiPokok: '', index: 0 }];
  }, [schoolAbsenPelatih, selectedMeetingIndex]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Laporan Cetak & Berkas Resmi
            </span>
          </div>
          <h2 className="text-xl font-black">Format Laporan Ekstrakurikuler</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Laporan resmi dengan format khusus untuk <b>SMPN 2 Cigombong</b>, <b>SDN Sukaharja 01</b>, dan <b>SDN Sukaharja 03</b>, siap cetak atau ekspor PDF/Word.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Cetak langsung menggunakan dialog printer browser"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak</span>
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition cursor-pointer"
            title="Ekspor laporan kegiatan & presensi ke Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button
            onClick={exportWord}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition cursor-pointer"
            title="Ekspor ke dokumen Microsoft Word (.doc)"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Unduh Word (.doc)</span>
          </button>

          <button
            onClick={exportPdf}
            disabled={isGeneratingPdf || isGeneratingImage}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            title="Ekspor laporan ke file PDF"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh PDF'}</span>
          </button>

          <button
            onClick={() => exportImage('jpeg')}
            disabled={isGeneratingPdf || isGeneratingImage}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            title="Ekspor setiap lembar laporan menjadi gambar JPG berkualitas tinggi"
          >
            <ImageIcon className="w-4 h-4 text-amber-200" />
            <span>{isGeneratingImage ? (imageProgressText || 'Memproses JPG...') : 'Unduh JPG'}</span>
          </button>

          <button
            onClick={() => exportImage('png')}
            disabled={isGeneratingPdf || isGeneratingImage}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            title="Ekspor setiap lembar laporan menjadi gambar PNG resolusi tinggi"
          >
            <ImageIcon className="w-4 h-4 text-indigo-200" />
            <span>{isGeneratingImage ? (imageProgressText || 'Memproses PNG...') : 'Unduh PNG'}</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Pengaturan & Filter Laporan:</span>
          </div>

          {/* Active Template Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Format Aktif:</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              {resolvedTemplate === 'SMPN2_CIGOMBONG' && 'Format SMPN 2 Cigombong (2 Halaman)'}
              {resolvedTemplate === 'SDN_SUKAHARJA_01' && 'Format SDN Sukaharja 01 (Daftar Hadir Drumband)'}
              {resolvedTemplate === 'SDN_SUKAHARJA_03' && 'Format SDN Sukaharja 03 (Daftar Hadir Drumband)'}
              {resolvedTemplate === 'STANDARD' && 'Format Standar Forum Marching Band'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Pilih Sekolah */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-blue-600" />
              Sekolah Binaan:
            </label>
            <select
              value={filterSekolahId}
              onChange={(e) => setFilterSekolahId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
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
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {BULAN_OPTIONS.map(b => (
                <option key={b} value={b}>
                  {b} {b === getCurrentMonthName() ? '★ (Bulan Berjalan)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Tahun Ajaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Tahun Ajaran:
            </label>
            <select
              value={filterTahunAjaran}
              onChange={(e) => setFilterTahunAjaran(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {tahunAjaranOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Template Format Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pilihan Desain Template:
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="AUTO">✨ Otomatis Sesuai Sekolah</option>
              <option value="SMPN2_CIGOMBONG">Format SMPN 2 Cigombong</option>
              <option value="SDN_SUKAHARJA_01">Format SDN Sukaharja 01</option>
              <option value="SDN_SUKAHARJA_03">Format SDN Sukaharja 03</option>
              <option value="STANDARD">Format Standar Forum</option>
            </select>
          </div>
        </div>

        {/* Orientasi Cetak, Filter Kehadiran, & Urutan Anggota Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Opsi Orientasi Cetak (Portrait / Landscape) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Orientasi Cetak PDF:
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {orientasiKertas === 'landscape' ? 'Landscape' : 'Portrait'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientasiKertas('portrait')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    orientasiKertas === 'portrait'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>📄 Portrait (Tegak)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientasiKertas('landscape')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    orientasiKertas === 'landscape'
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>📑 Landscape</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              ✨ <strong className="text-slate-700">Rekomendasi Landscape:</strong> Bidang melebar membuat ttd pelatih & asisten berdampingan rapi.
            </p>
          </div>

          {/* Opsi Filter Kehadiran Anggota (Hanya Hadir vs Semua) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Filter Kehadiran di Laporan:
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {totalHadirInSchoolMonth} Hadir ({totalRegisteredInSchool} Total)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterHanyaHadir(true)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    filterHanyaHadir
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Hanya masukkan anggota yang tercatat hadir (scan QR / absensi) pada bulan ini"
                >
                  <span>✓ Hanya Yang Hadir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterHanyaHadir(false)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    !filterHanyaHadir
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Tampilkan semua anggota yang terdaftar di sekolah ini"
                >
                  <span>👥 Tampilkan Semua</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              📌 <strong className="text-slate-700">Sesuai Peraturan:</strong> Anggota yang tidak hadir di bulan {filterBulan} tidak dimasukkan ke dalam tabel laporan.
            </p>
          </div>

          {/* Opsi Urutkan Anggota dalam Laporan */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Urutkan Anggota di Laporan:
                </label>
                <span className="text-[10px] font-semibold text-slate-500">
                  {schoolAnggota.length} Siswa di Berkas
                </span>
              </div>
              <select
                value={sortAnggotaBy}
                onChange={(e) => setSortAnggotaBy(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="nama_asc">🔤 Nama Anggota (A - Z)</option>
                <option value="nama_desc">🔤 Nama Anggota (Z - A)</option>
                <option value="kelas_asc">🔢 Kelas (7-1, 7-2... Terkecil)</option>
                <option value="kelas_desc">🔢 Kelas (9-3, 9-2... Terbesar)</option>
                <option value="divisi">🎺 Divisi Musik (Brass, Perc...)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              📋 Diterapkan pada PDF, Word, Excel, dan ekspor gambar.
            </p>
          </div>
        </div>

        {/* Assistant Coach Toggle & Customization Bar */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAsistenPelatih}
                onChange={(e) => setIncludeAsistenPelatih(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Tambahkan Tanda Tangan Asisten Pelatih (Dua Tanda Tangan: Pelatih & Asisten)
              </span>
            </label>

            {includeAsistenPelatih ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dua Tanda Tangan Aktif pada Berkas
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 italic">
                *Centang jika ingin mencetak dua tanda tangan (Pelatih & Asisten)
              </span>
            )}
          </div>

          {includeAsistenPelatih && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Asisten Pelatih:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={asistenName}
                    onChange={(e) => setAsistenName(e.target.value)}
                    placeholder="Nama Lengkap & Gelar"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                  {registeredAssistants.length > 0 && (
                    <select
                      onChange={(e) => {
                        const found = registeredAssistants.find(a => a.name === e.target.value);
                        if (found) {
                          setAsistenName(found.name);
                          if (found.nip) setAsistenNip(found.nip);
                        }
                      }}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600"
                      title="Pilih dari asisten terdaftar"
                    >
                      <option value="">Pilih</option>
                      {registeredAssistants.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  NIP / NUPTK Asisten Pelatih:
                </label>
                <input
                  type="text"
                  value={asistenNip}
                  onChange={(e) => setAsistenNip(e.target.value)}
                  placeholder="NIP / NUPTK (Opsional)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanda Tangan Asisten:
                </label>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shadow-2xs">
                    <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawingAsistenSig(true)}
                    className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                  >
                    <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Gambar</span>
                  </button>
                  {customAsistenSig && (
                    <button
                      type="button"
                      onClick={() => setCustomAsistenSig(null)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      title="Kembalikan ke tanda tangan otomatis"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Extra controls for Sukaharja meeting picker */}
        {(resolvedTemplate === 'SDN_SUKAHARJA_01' || resolvedTemplate === 'SDN_SUKAHARJA_03') && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Pilih Lembar Sesi Latihan:</span>
              <select
                value={selectedMeetingIndex === 'ALL' ? 'ALL' : selectedMeetingIndex.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMeetingIndex(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <option value="ALL">Semua Sesi ({schoolAbsenPelatih.length} Sesi Pertemuan Bulan Ini)</option>
                {schoolAbsenPelatih.map((m, idx) => (
                  <option key={m.id} value={idx}>
                    Sesi {idx + 1}: {m.hariTanggalFormat || m.tanggal} ({m.jamMulai}-{m.jamSelesai})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              *Kepala Sekolah: {kepalaSekolahInfo.nama} (NIP. {kepalaSekolahInfo.nip})
            </div>
          </div>
        )}
      </div>

      {/* PDF Document Live Preview Canvas Container */}
      <div className="overflow-x-auto p-2 sm:p-4 bg-slate-200/80 rounded-2xl border border-slate-300 flex flex-col items-center gap-6">
        {filterHanyaHadir && totalHadirInSchoolMonth === 0 && (
          <div className="w-full max-w-3xl bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center text-amber-900 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left text-xs">
              <span className="font-bold block text-sm">ℹ️ Belum Ada Anggota Tercatat HADIR di Bulan {filterBulan}</span>
              <span className="text-amber-800">Sesuai peraturan, hanya anggota yang hadir yang dimasukkan ke berkas laporan. Anda dapat melakukan scan presensi QR atau klik tombol untuk melihat seluruh anggota terdaftar.</span>
            </div>
            <button
              type="button"
              onClick={() => setFilterHanyaHadir(false)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer"
            >
              Tampilkan Semua Anggota ({totalRegisteredInSchool})
            </button>
          </div>
        )}

        {/* A4 Sheet Dimensions Indicator */}
        <div className={`flex items-center justify-between w-full ${orientasiKertas === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'} mb-2 px-1 text-xs text-slate-500 font-semibold print:hidden`}>
          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Format Standar: <b>A4 {orientasiKertas === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}</b></span>
          </span>
          <span className="text-slate-400 text-[11px]">Setiap Halaman Pas Standar Lembar Kertas A4</span>
        </div>

        {/* Scoped CSS to enforce exact A4 printing in chosen orientation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 ${orientasiKertas};
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
            #printable-pdf-area, #printable-pdf-area * {
              visibility: visible !important;
            }
            #printable-pdf-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .pdf-page {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              width: ${orientasiKertas === 'landscape' ? '297mm' : '210mm'} !important;
              height: ${orientasiKertas === 'landscape' ? '210mm' : '297mm'} !important;
              min-height: ${orientasiKertas === 'landscape' ? '210mm' : '297mm'} !important;
              max-height: ${orientasiKertas === 'landscape' ? '210mm' : '297mm'} !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
          }
        `}} />

        <div id="printable-pdf-area" ref={pdfContainerRef} className={`space-y-8 w-full ${orientasiKertas === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'}`}>

          {/* =========================================================================
              TEMPLATE 1: SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR
             ========================================================================= */}
          {resolvedTemplate === 'SMPN2_CIGOMBONG' && (
            <>
              {/* PAGE 1: LAPORAN KEGIATAN EKSTRAKURIKULER */}
              <div
                style={timesNewRomanFont}
                className={getPdfPageClass('p-[16mm]')}
              >
                <div>
                  {/* Header Title */}
                  <div className="text-center font-bold leading-tight mb-8">
                    <h1 className="text-base tracking-wide uppercase">LAPORAN KEGIATAN EKSTRAKURIKULER</h1>
                    <h2 className="text-base tracking-wide uppercase">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</h2>
                    <h3 className="text-base tracking-wide uppercase">TAHUN PELAJARAN {filterTahunAjaran}</h3>
                  </div>

                  {/* Nama Ekstrakurikuler */}
                  <div className="mb-6 text-xs font-bold tracking-wide">
                    NAMA EKSTRAKURIKULER : {namaEkskul}
                  </div>

                  {/* Table: Minggu Ke-, Tanggal, Materi Kegiatan, Tanda Tangan */}
                  <table className="w-full border-collapse border border-black text-xs text-center">
                    <thead>
                      <tr className="font-bold border-b border-black">
                        <th className="border border-black p-2.5 w-24">Minggu Ke-</th>
                        <th className="border border-black p-2.5 w-32">Tanggal</th>
                        <th className="border border-black p-2.5">Materi Kegiatan</th>
                        <th className="border border-black p-2.5 w-36">Tanda Tangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {padded5AgendaRows.map((row, idx) => {
                        const weekNum = idx + 1;
                        return (
                          <tr key={idx} className="h-16 border-b border-black">
                            <td className="border border-black p-2 font-bold align-middle text-sm">
                              {weekNum}
                            </td>
                            <td className="border border-black p-2 align-middle text-xs font-medium">
                              {row?.hariTanggalFormat || row?.tanggal || ''}
                            </td>
                            <td className="border border-black p-2.5 text-left align-middle text-xs leading-relaxed">
                              {row?.materiPokok || ''}
                            </td>
                            <td className="border border-black p-1.5 align-middle">
                              {row?.parafPelatihUrl ? (
                                <img
                                  src={row.parafPelatihUrl}
                                  alt="Tanda Tangan"
                                  className="h-10 max-w-[90px] mx-auto object-contain"
                                />
                              ) : coachSignatureUrl && row ? (
                                <img
                                  src={coachSignatureUrl}
                                  alt="Tanda Tangan"
                                  className="h-10 max-w-[90px] mx-auto object-contain"
                                />
                              ) : (
                                ''
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-end mt-10 mb-4 text-xs">
                  <div className="text-center">
                    <div className="text-right mb-2 font-normal">Cigombong, ................................</div>
                    <div className="font-bold mb-1">
                      {includeAsistenPelatih ? 'TIM PELATIH EKSTRAKURIKULER' : 'Pelatih Ekstrakurikuler'}
                    </div>

                    {includeAsistenPelatih ? (
                      <div className="signature-row flex items-start gap-8 mt-2">
                        {/* Pelatih Utama */}
                        <div className="min-w-[130px] text-center">
                          <div className="font-bold text-[11px]">Pelatih Utama</div>
                          <div className="h-16 flex items-center justify-center my-1">
                            {coachSignatureUrl && (
                              <img src={coachSignatureUrl} alt="TTD Pelatih Utama" className="h-14 max-w-[120px] object-contain" />
                            )}
                          </div>
                          <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                          <div className="font-bold mt-1">({pelatihName})</div>
                          {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                        </div>

                        {/* Asisten Pelatih */}
                        <div className="min-w-[130px] text-center">
                          <div className="font-bold text-[11px]">Asisten Pelatih</div>
                          <div className="h-16 flex items-center justify-center my-1">
                            {asistenSignatureUrl && (
                              <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-14 max-w-[120px] object-contain" />
                            )}
                          </div>
                          <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                          <div className="font-bold mt-1">({asistenName})</div>
                          {asistenNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {asistenNip}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 text-center">
                        <div className="h-16 flex items-center justify-center my-1">
                          {coachSignatureUrl && (
                            <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-14 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-48 mx-auto"></div>
                        <div className="font-bold mt-1">({pelatihName})</div>
                        {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* PAGES 2+: DAFTAR HADIR PESERTA EKSTRAKURIKULER (DYNAMIC CONSECUTIVE SHEETS FOR ALL MEMBERS) */}
              {anggotaPages.map((page, pIdx) => {
                const startNum = page.startNo;
                const endNum = page.startNo + 29;
                return (
                  <div
                    key={`cigombong-page-${pIdx}`}
                    style={timesNewRomanFont}
                    className={getPdfPageClass('p-[16mm]')}
                  >
                    <div>
                      {/* Header Title */}
                      <div className="text-center font-bold leading-tight mb-6">
                        <h1 className="text-base tracking-wide uppercase">DAFTAR HADIR PESERTA EKSTRAKURIKULER</h1>
                        <h2 className="text-base tracking-wide uppercase">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</h2>
                        <h3 className="text-base tracking-wide uppercase">TAHUN PELAJARAN {filterTahunAjaran}</h3>
                        {anggotaPages.length > 1 && (
                          <div className="text-xs font-normal text-slate-700 mt-1">
                            (Lembar {pIdx + 1} dari {anggotaPages.length} — Nomor Urut {startNum} s/d {endNum})
                          </div>
                        )}
                      </div>

                      {/* Subheader: Bulan & Nama Ekstrakurikuler */}
                      <div className="flex items-center justify-between text-xs font-bold mb-3">
                        <div>Bulan : {filterBulan}</div>
                        <div>Nama Ekstrakurikuler : {namaEkskul}</div>
                      </div>

                      {/* Table: No., Nama Anggota (Centered), Kelas, Tanggal/Tanda Tangan (1-5) */}
                      <table className="w-full border-collapse border border-black text-[9.5px] text-center">
                        <thead>
                          <tr className="font-bold border-b border-black">
                            <th rowSpan={2} className="border border-black p-1 w-8 align-middle">No.</th>
                            <th rowSpan={2} className="border border-black p-1 text-center align-middle">Nama Anggota</th>
                            <th rowSpan={2} className="border border-black p-1 w-16 align-middle">Kelas</th>
                            <th colSpan={5} className="border border-black p-1">Tanggal/Tanda Tangan</th>
                          </tr>
                          <tr className="font-bold border-b border-black">
                            <th className="border border-black p-0.5 w-10">1</th>
                            <th className="border border-black p-0.5 w-10">2</th>
                            <th className="border border-black p-0.5 w-10">3</th>
                            <th className="border border-black p-0.5 w-10">4</th>
                            <th className="border border-black p-0.5 w-10">5</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.members.map((student, idx) => {
                            const no = page.startNo + idx;
                            return (
                              <tr key={idx} className="h-7 border-b border-black">
                                <td className="border border-black p-0.5 font-bold align-middle">{student ? no : ''}</td>
                                <td className="border border-black p-0.5 text-center align-middle font-medium truncate max-w-[170px]">
                                  {student ? (formatNamaKapital(student.nama) || '') : ''}
                                </td>
                                <td className="border border-black p-0.5 align-middle">{student?.kelas ? formatKelasAngka(student.kelas) : ''}</td>

                                {/* 5 Attendance signature/check marks */}
                                {[1, 2, 3, 4, 5].map((col) => {
                                  const status = student ? getStudentAttendanceStatus(student, col) : null;
                                  return (
                                    <td key={col} className="border border-black px-0.5 py-0 align-middle h-7">
                                      {status?.isPresent && student ? (
                                        <StudentWetSignature
                                          studentName={formatNamaKapital(student.nama)}
                                          columnIndex={col}
                                          customSignatureUrl={status.customSig || student.signatureUrl}
                                          height="24px"
                                          maxWidth="100%"
                                        />
                                      ) : (
                                        <span className="font-bold text-black text-[9px]">{status?.label || ''}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Signature: Pelatih Utama & Asisten Pelatih disatukan */}
                    <div className="flex justify-end mt-6 mb-2 text-xs">
                      <div className="text-center">
                        <div className="text-right mb-2 font-normal">Cigombong, ......................................</div>
                        <div className="font-bold mb-1">
                          {includeAsistenPelatih ? 'TIM PELATIH EKSTRAKURIKULER' : 'Pelatih Ekstrakurikuler'}
                        </div>

                        {includeAsistenPelatih ? (
                          <div className="signature-row flex items-start gap-8 mt-2">
                            {/* Pelatih Utama */}
                            <div className="min-w-[130px] text-center">
                              <div className="font-bold text-[11px]">Pelatih Utama</div>
                              <div className="h-14 flex items-center justify-center my-1">
                                {coachSignatureUrl && (
                                  <img src={coachSignatureUrl} alt="TTD Pelatih Utama" className="h-12 max-w-[120px] object-contain" />
                                )}
                              </div>
                              <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                              <div className="font-bold mt-1">({pelatihName})</div>
                              {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                            </div>

                            {/* Asisten Pelatih */}
                            <div className="min-w-[130px] text-center">
                              <div className="font-bold text-[11px]">Asisten Pelatih</div>
                              <div className="h-14 flex items-center justify-center my-1">
                                {asistenSignatureUrl && (
                                  <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-12 max-w-[120px] object-contain" />
                                )}
                              </div>
                              <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                              <div className="font-bold mt-1">({asistenName})</div>
                              {asistenNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {asistenNip}</div>}
                            </div>
                          </div>
                        ) : (
                          <div className="w-56 text-center">
                            <div className="h-14 flex items-center justify-center my-1">
                              {coachSignatureUrl && (
                                <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-12 max-w-[120px] object-contain" />
                              )}
                            </div>
                            <div className="border-b border-dotted border-black w-48 mx-auto"></div>
                            <div className="font-bold mt-1">({pelatihName})</div>
                            {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* PAGE 3: LAMPIRAN FOTO DOKUMENTASI KEGIATAN & EVENT (SMPN 2 CIGOMBONG) */}
              {(activeEventPhotos.length > 0 || documentationItems.length > 0) && (
                <div
                  style={timesNewRomanFont}
                  className={getPdfPageClass('p-[14mm]')}
                >
                  <div>
                    <div className="text-center font-bold leading-tight mb-4">
                      <h1 className="text-sm sm:text-base tracking-wide uppercase font-bold">
                        LAMPIRAN FOTO DOKUMENTASI KEGIATAN & EVENT
                      </h1>
                      <h2 className="text-sm sm:text-base tracking-wide uppercase font-bold mt-0.5">
                        SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR
                      </h2>
                      <h3 className="text-xs sm:text-sm tracking-wide uppercase font-bold mt-0.5">
                        TAHUN PELAJARAN {filterTahunAjaran}
                      </h3>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold mb-3 border-b-2 border-black pb-1.5">
                      <span>Bulan : {filterBulan}</span>
                      <span>Nama Ekstrakurikuler : {namaEkskul}</span>
                    </div>

                    {/* Event Photos Section */}
                    {activeEventPhotos.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-bold uppercase mb-2 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                          <span>A. FOTO DOKUMENTASI EVENT & PERLOMBAAN / PENAMPILAN</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                            {activeEventPhotos.length} Event
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {activeEventPhotos.slice(0, 2).map((evt) => (
                            <div key={evt.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                              <div className="mb-1 border-b border-slate-300 pb-1">
                                <div className="flex items-center justify-between text-[8.5px] font-bold">
                                  <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-300">🏆 FOTO EVENT</span>
                                  <span className="text-slate-700">{evt.tanggal}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-900 mt-1 line-clamp-1">
                                  {evt.namaEvent}
                                </div>
                                {evt.lokasi && (
                                  <div className="text-[8.5px] text-slate-600">
                                    Lokasi: {evt.lokasi}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                                <img src={evt.fotoUrl} alt={evt.namaEvent} className="w-full h-full object-cover" />
                              </div>

                              <div className="mt-1 pt-1 border-t border-slate-300 text-[8.5px]">
                                {evt.prestasi && (
                                  <div className="font-bold text-amber-800 line-clamp-1">
                                    Prestasi: {evt.prestasi}
                                  </div>
                                )}
                                {evt.keterangan && (
                                  <div className="text-slate-600 italic line-clamp-1">
                                    {evt.keterangan}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Training Photos Section */}
                    {documentationItems.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase mb-2 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                          <span>B. FOTO DOKUMENTASI KEGIATAN LATIHAN REGULER</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                            {documentationItems.length} Sesi Latihan
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {documentationItems.slice(0, activeEventPhotos.length > 0 ? 2 : 4).map((item) => (
                            <div key={item.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                              <div className="mb-1 border-b border-slate-300 pb-1">
                                <div className="flex items-center justify-between text-[8.5px] font-bold">
                                  <span className="bg-slate-200 px-1.5 py-0.5 rounded">{item.hariTanggalFormat || item.tanggal}</span>
                                  <span className="text-blue-700 font-bold">{item.jamMulai} - {item.jamSelesai}</span>
                                </div>
                                <div className="text-[9.5px] font-bold text-slate-900 mt-1 line-clamp-1">
                                  {item.materiPokok}
                                </div>
                              </div>

                              <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                                <img src={item.fotoDokumentasiUrl} alt={item.materiPokok} className="w-full h-full object-cover" />
                              </div>

                              <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px]">
                                <div>
                                  <span className="text-slate-600 font-medium">Pencapaian: </span>
                                  <span className="font-bold text-emerald-700">{item.pencapaianPercent}%</span>
                                </div>
                                {item.parafPelatihUrl && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[7.5px] text-slate-500">Paraf:</span>
                                    <img src={item.parafPelatihUrl} alt="Paraf" className="h-4 max-w-[35px] object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                    Lampiran Foto Dokumentasi Kegiatan & Event — SMP Negeri 2 Cigombong
                  </div>
                </div>
              )}
            </>
          )}


          {/* =========================================================================
              TEMPLATE 2 & 3: SDN SUKAHARJA 01 & SDN SUKAHARJA 03
             ========================================================================= */}
          {(resolvedTemplate === 'SDN_SUKAHARJA_01' || resolvedTemplate === 'SDN_SUKAHARJA_03') && (
            <>
              {sukaharjaMeetings.map((meeting, mIdx) => {
                const schoolTitle = resolvedTemplate === 'SDN_SUKAHARJA_01' ? 'SDN SUKAHARJA 01' : 'SDN SUKAHARJA 03';

                return sukaharjaAnggotaPages.map((sheet, sheetIdx) => {
                  return (
                    <div
                      key={`${meeting.id || mIdx}-sheet-${sheetIdx}`}
                      style={timesNewRomanFont}
                      className={getPdfPageClass('p-[14mm]')}
                    >
                      <div>
                        {/* Header Title */}
                        <div className="text-center font-bold leading-tight mb-4">
                          <h1 className="text-sm sm:text-base tracking-wide uppercase font-bold">
                            DAFTAR HADIR KEGIATAN EKSTRAKURIKULER DRUMBAND
                          </h1>
                          <h2 className="text-sm sm:text-base tracking-wide uppercase font-bold mt-0.5">
                            {schoolTitle}
                          </h2>
                          <h3 className="text-sm sm:text-base tracking-wide uppercase font-bold mt-0.5">
                            TAHUN PELAJARAN {filterTahunAjaran}
                          </h3>
                          {sukaharjaAnggotaPages.length > 1 && (
                            <div className="text-xs font-normal text-slate-700 mt-1">
                              (Lembar Presensi {sheetIdx + 1} dari {sukaharjaAnggotaPages.length} — Nomor Urut {sheet.startNo} s/d {sheet.startNo + 59})
                            </div>
                          )}
                        </div>

                        {/* Top Right Meta info with clean alignment */}
                        <div className="flex justify-end text-[11px] font-normal mb-3">
                          <table className="border-collapse text-left">
                            <tbody>
                              <tr>
                                <td className="pr-3 py-0.5 font-normal">HARI / TANGGAL</td>
                                <td className="pr-1.5">:</td>
                                <td>{meeting.hariTanggalFormat || '......... / ......... / ................'}</td>
                              </tr>
                              <tr>
                                <td className="pr-3 py-0.5 font-normal">WAKTU</td>
                                <td className="pr-1.5">:</td>
                                <td>{meeting.jamMulai ? `${meeting.jamMulai} S/D ${meeting.jamSelesai}` : '................ S/D .................'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* MATERI Box */}
                        <div className="border border-black p-3 rounded-none mb-3.5 min-h-[110px]">
                          <div className="font-normal text-xs mb-1">MATERI:</div>
                          <div className="text-xs leading-relaxed min-h-[70px]">
                            {meeting.materiPokok || ''}
                          </div>
                        </div>

                        {/* Two Column Parallel Attendance Table (Left: 30, Right: 30) */}
                        <div className="grid grid-cols-2 gap-3.5">
                          {/* Left Column Table with Top & Bottom Header */}
                          <div>
                            <table className="w-full border-collapse border border-black text-[9px] text-center">
                              <thead>
                                <tr className="font-bold border-b border-black h-4.5">
                                  <th className="border border-black p-0.5 w-8 font-bold">NO</th>
                                  <th className="border border-black p-0.5 text-center font-bold">NAMA</th>
                                  <th className="border border-black p-0.5 w-16 font-bold">TTD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sheet.left.map((student, idx) => {
                                  const no = sheet.startNo + idx;
                                  const meetingCol = (meeting.index !== undefined ? meeting.index : mIdx) + 1;
                                  const status = student ? getStudentAttendanceStatus(student, meetingCol) : null;
                                  return (
                                    <tr key={idx} className="h-6 border-b border-black">
                                      <td className="border border-black p-0.5 font-normal align-middle text-[8.5px]">{student ? no : ''}</td>
                                      <td className="border border-black p-0.5 text-center align-middle truncate max-w-[130px] font-normal text-[8.5px]">
                                        {student ? (formatNamaKapital(student.nama) || '') : ''}
                                      </td>
                                      <td className="border border-black px-0.5 py-0 align-middle h-6">
                                        {status?.isPresent && student ? (
                                          <StudentWetSignature
                                            studentName={formatNamaKapital(student.nama)}
                                            columnIndex={meetingCol}
                                            customSignatureUrl={status.customSig || student.signatureUrl}
                                            height="22px"
                                            maxWidth="100%"
                                          />
                                        ) : (
                                          <span className="font-normal text-[8.5px]">{status?.label || ''}</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Bottom header row matching original form */}
                                <tr className="font-bold border-t border-black h-4.5">
                                  <td className="border border-black p-0.5 font-bold text-[8.5px]">NO</td>
                                  <td className="border border-black p-0.5 text-center font-bold text-[8.5px]">NAMA</td>
                                  <td className="border border-black p-0.5 font-bold text-[8.5px]">TTD</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Right Column Table (Starts directly at startNo + 30, no top header) */}
                          <div>
                            <table className="w-full border-collapse border border-black text-[9px] text-center">
                              <tbody>
                                {sheet.right.map((student, idx) => {
                                  const no = sheet.startNo + 30 + idx;
                                  const meetingCol = (meeting.index !== undefined ? meeting.index : mIdx) + 1;
                                  const status = student ? getStudentAttendanceStatus(student, meetingCol) : null;
                                  return (
                                    <tr key={idx} className="h-6 border-b border-black">
                                      <td className="border border-black p-0.5 w-8 font-normal align-middle text-[8.5px]">{student ? no : ''}</td>
                                      <td className="border border-black p-0.5 text-center align-middle truncate max-w-[130px] font-normal text-[8.5px]">
                                        {student ? (formatNamaKapital(student.nama) || '') : ''}
                                      </td>
                                      <td className="border border-black px-0.5 py-0 w-16 align-middle h-6">
                                        {status?.isPresent && student ? (
                                          <StudentWetSignature
                                            studentName={formatNamaKapital(student.nama)}
                                            columnIndex={meetingCol}
                                            customSignatureUrl={status.customSig || student.signatureUrl}
                                            height="22px"
                                            maxWidth="100%"
                                          />
                                        ) : (
                                          <span className="font-normal text-[8.5px]">{status?.label || ''}</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Empty spacer rows on right side to balance bottom left row */}
                                <tr className="border-t border-black h-4">
                                  <td className="border border-black p-0.5 w-8"></td>
                                  <td className="border border-black p-0.5"></td>
                                  <td className="border border-black p-0.5 w-16"></td>
                                </tr>
                                <tr className="border-t border-black h-4.5">
                                  <td className="border border-black p-0.5 w-8"></td>
                                  <td className="border border-black p-0.5"></td>
                                  <td className="border border-black p-0.5 w-16"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                    {/* Footer: Mengetahui Kepala Sekolah & Tim Pelatih (Pelatih Utama & Asisten Pelatih Bersatu) */}
                    <div className="signature-row flex justify-between items-start mt-6 text-xs text-left">
                      {/* Left: Kepala Sekolah */}
                      <div className="pl-1 min-w-[180px]">
                        <div className="font-normal">MENGETAHUI,</div>
                        <div className="uppercase font-normal">KEPALA {schoolTitle}</div>

                        <div className="h-14 flex items-center">
                          {/* Signature space */}
                        </div>

                        <div className="font-bold text-xs uppercase tracking-wide underline">
                          {kepalaSekolahInfo.nama}
                        </div>
                        <div className="font-normal text-[10.5px] mt-0.5">
                          NIP. {kepalaSekolahInfo.nip || '................................................'}
                        </div>
                      </div>

                      {/* Right: Tim Pelatih / Pembimbing */}
                      <div className="text-center">
                        <div className="font-normal mb-1">
                          {includeAsistenPelatih ? 'TIM PELATIH / PEMBIMBING' : 'PEMBIMBING'}
                        </div>

                        {includeAsistenPelatih ? (
                          <div className="signature-grid flex items-start gap-6">
                            {/* Pelatih Utama */}
                            <div className="text-center min-w-[130px]">
                              <div className="font-semibold text-[11px]">Pelatih Utama</div>
                              <div className="h-14 flex items-center justify-center">
                                {coachSignatureUrl && (
                                  <img src={coachSignatureUrl} alt="TTD Pelatih Utama" className="h-11 max-w-[110px] object-contain" />
                                )}
                              </div>
                              <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                              <div className="font-bold text-xs mt-1">({pelatihName})</div>
                              <div className="font-normal text-[10px] mt-0.5">
                                NIP/NUPTK. {pelatihNip || '....................'}
                              </div>
                            </div>

                            {/* Asisten Pelatih */}
                            <div className="text-center min-w-[130px]">
                              <div className="font-semibold text-[11px]">Asisten Pelatih</div>
                              <div className="h-14 flex items-center justify-center">
                                {asistenSignatureUrl && (
                                  <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-11 max-w-[110px] object-contain" />
                                )}
                              </div>
                              <div className="border-b border-dotted border-black w-36 mx-auto"></div>
                              <div className="font-bold text-xs mt-1">({asistenName})</div>
                              <div className="font-normal text-[10px] mt-0.5">
                                NIP/NUPTK. {asistenNip || '....................'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-[180px] text-center">
                            <div className="h-14 flex items-center justify-center">
                              {coachSignatureUrl && (
                                <img src={coachSignatureUrl} alt="TTD Pembimbing" className="h-11 max-w-[120px] object-contain" />
                              )}
                            </div>
                            <div className="border-b border-dotted border-black w-full max-w-[200px] mx-auto"></div>
                            <div className="font-bold text-xs mt-1">({pelatihName})</div>
                            <div className="font-normal text-[10.5px] mt-0.5">
                              NIP/NUPTK. {pelatihNip || '....................'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })}

              {/* LAMPIRAN DOKUMENTASI FOTO KEGIATAN & EVENT (SDN SUKAHARJA 01 / 03) */}
              {(activeEventPhotos.length > 0 || documentationItems.length > 0) && (
                <div
                  style={timesNewRomanFont}
                  className={getPdfPageClass('p-[14mm]')}
                >
                  <div>
                    <div className="text-center font-bold leading-tight mb-4">
                      <h1 className="text-sm sm:text-base tracking-wide uppercase font-bold">
                        LAMPIRAN FOTO DOKUMENTASI KEGIATAN & EVENT
                      </h1>
                      <h2 className="text-sm sm:text-base tracking-wide uppercase font-bold mt-0.5">
                        {resolvedTemplate === 'SDN_SUKAHARJA_01' ? 'SDN SUKAHARJA 01 KECAMATAN CIJERUK' : 'SDN SUKAHARJA 03 KECAMATAN CIJERUK'}
                      </h2>
                      <h3 className="text-xs sm:text-sm tracking-wide uppercase font-bold mt-0.5">
                        TAHUN PELAJARAN {filterTahunAjaran}
                      </h3>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold mb-3 border-b-2 border-black pb-1.5">
                      <span>Bulan : {filterBulan}</span>
                      <span>Nama Ekstrakurikuler : {namaEkskul}</span>
                    </div>

                    {/* Event Photos Section */}
                    {activeEventPhotos.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-bold uppercase mb-2 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                          <span>A. FOTO DOKUMENTASI EVENT & PERLOMBAAN / PENAMPILAN</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                            {activeEventPhotos.length} Event
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {activeEventPhotos.slice(0, 2).map((evt) => (
                            <div key={evt.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                              <div className="mb-1 border-b border-slate-300 pb-1">
                                <div className="flex items-center justify-between text-[8.5px] font-bold">
                                  <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-300">🏆 FOTO EVENT</span>
                                  <span className="text-slate-700">{evt.tanggal}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-900 mt-1 line-clamp-1">
                                  {evt.namaEvent}
                                </div>
                                {evt.lokasi && (
                                  <div className="text-[8.5px] text-slate-600">
                                    Lokasi: {evt.lokasi}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                                <img src={evt.fotoUrl} alt={evt.namaEvent} className="w-full h-full object-cover" />
                              </div>

                              <div className="mt-1 pt-1 border-t border-slate-300 text-[8.5px]">
                                {evt.prestasi && (
                                  <div className="font-bold text-amber-800 line-clamp-1">
                                    Prestasi: {evt.prestasi}
                                  </div>
                                )}
                                {evt.keterangan && (
                                  <div className="text-slate-600 italic line-clamp-1">
                                    {evt.keterangan}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Training Photos Section */}
                    {documentationItems.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase mb-2 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                          <span>B. FOTO DOKUMENTASI KEGIATAN LATIHAN REGULER</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                            {documentationItems.length} Sesi Latihan
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {documentationItems.slice(0, activeEventPhotos.length > 0 ? 2 : 4).map((item) => (
                            <div key={item.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                              <div className="mb-1 border-b border-slate-300 pb-1">
                                <div className="flex items-center justify-between text-[8.5px] font-bold">
                                  <span className="bg-slate-200 px-1.5 py-0.5 rounded">{item.hariTanggalFormat || item.tanggal}</span>
                                  <span className="text-blue-700 font-bold">{item.jamMulai} - {item.jamSelesai}</span>
                                </div>
                                <div className="text-[9.5px] font-bold text-slate-900 mt-1 line-clamp-1">
                                  {item.materiPokok}
                                </div>
                              </div>

                              <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                                <img src={item.fotoDokumentasiUrl} alt={item.materiPokok} className="w-full h-full object-cover" />
                              </div>

                              <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px]">
                                <div>
                                  <span className="text-slate-600 font-medium">Pencapaian: </span>
                                  <span className="font-bold text-emerald-700">{item.pencapaianPercent}%</span>
                                </div>
                                {item.parafPelatihUrl && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[7.5px] text-slate-500">Paraf:</span>
                                    <img src={item.parafPelatihUrl} alt="Paraf" className="h-4 max-w-[35px] object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                    Lampiran Foto Dokumentasi Kegiatan & Event — {resolvedTemplate === 'SDN_SUKAHARJA_01' ? 'SDN Sukaharja 01' : 'SDN Sukaharja 03'}
                  </div>
                </div>
              )}
            </>
          )}


          {/* =========================================================================
              TEMPLATE 4: STANDARD FORUM MARCHING BAND (4 PAGES)
             ========================================================================= */}
          {resolvedTemplate === 'STANDARD' && (
            <>
              {/* PAGE 1: Agenda Kegiatan Regular */}
              <div
                style={timesNewRomanFont}
                className={getPdfPageClass('p-[12mm]')}
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TutWuriLogo className="w-14 h-14" />
                    </div>
                    <div className="text-center font-bold leading-tight">
                      <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                      <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND</h2>
                      <h3 className="text-xs tracking-wide uppercase">({namaSekolahFormatted})</h3>
                      <h4 className="text-xs tracking-wide font-normal">({filterTahunAjaran})</h4>
                    </div>
                    <div className="w-16 h-16 flex items-center justify-center">
                      <MarchingBandLogo className="w-14 h-14" />
                    </div>
                  </div>

                  <div className="mb-3 text-xs font-bold uppercase tracking-wider">
                    BULAN : {filterBulan.toUpperCase()}
                  </div>

                  <table className="w-full border-collapse border border-black text-[9.5px] text-center mb-6">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-black">
                        <th className="border border-black p-1.5 w-24">HARI,<br/>TANGGAL</th>
                        <th className="border border-black p-1.5 w-20">WAKTU</th>
                        <th className="border border-black p-1.5">MATERI POKOK</th>
                        <th className="border border-black p-1.5 w-16">PENCAPAIAN<br/>%</th>
                        <th className="border border-black p-1.5 w-20">PARAF<br/>PELATIH</th>
                        <th className="border border-black p-1.5 w-24">MENGETAHUI<br/>KEPALA SEKOLAH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {padded7AgendaRows.map((row, idx) => (
                        <tr key={idx} className="h-12 border-b border-black">
                          <td className="border border-black p-1 font-semibold align-middle text-[9px]">
                            {row?.hariTanggalFormat || ''}
                          </td>
                          <td className="border border-black p-1 align-middle text-[8.5px]">
                            {row ? `${row.jamMulai} S/D ${row.jamSelesai}` : 'S/D'}
                          </td>
                          <td className="border border-black p-1 text-left align-middle font-medium text-[9px]">
                            {row?.materiPokok || ''}
                          </td>
                          <td className="border border-black p-1 align-middle font-bold text-[9px]">
                            {row ? `${row.pencapaianPercent}%` : ''}
                          </td>
                          <td className="border border-black p-1 align-middle">
                            {row?.parafPelatihUrl ? (
                              <img src={row.parafPelatihUrl} alt="Paraf" className="h-7 max-w-[55px] mx-auto object-contain" />
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="border border-black p-1 align-middle text-[8.5px]">
                            {/* Dikosongkan agar bersih atau untuk paraf manual */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-6">
                    <div className="font-bold text-[10.5px] mb-1 uppercase tracking-wide">AGENDA EVENT & KEGIATAN UNGGULAN SEKOLAH:</div>
                    <table className="w-full border-collapse border border-black text-[9.5px] text-center">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <th className="border border-black p-1.5 w-36">HARI TANGGAL</th>
                          <th className="border border-black p-1.5">NAMA EVENT / KEGIATAN & LOKASI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolEvents.length === 0 ? (
                          Array.from({ length: 2 }).map((_, i) => (
                            <tr key={i} className="h-8 border-b border-black">
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                            </tr>
                          ))
                        ) : (
                          schoolEvents.map((evt) => (
                            <tr key={evt.id} className="h-9 border-b border-black">
                              <td className="border border-black p-1 font-semibold align-middle text-[9px]">{evt.tanggal}</td>
                              <td className="border border-black p-1 text-left align-middle font-medium text-[9px]">
                                <div className="font-bold text-slate-900">{evt.namaEvent}</div>
                                {evt.lokasi && <div className="text-[8px] text-slate-600">Lokasi: {evt.lokasi}</div>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                  Halaman 1 / 4 — Laporan Resmi Ekstrakurikuler Marching Band {namaSekolahFormatted}
                </div>
              </div>

              {/* PAGES 2+: Presensi Anggota (Dynamic Chunks of 30 Members) */}
              {anggotaPages.map((page, pIdx) => {
                const startNo = page.startNo;
                const endNo = page.startNo + 29;
                const totalPages = 1 + anggotaPages.length + (activeEventPhotos.length > 0 || documentationItems.length > 0 ? 1 : 0);
                return (
                  <div
                    key={`standard-presensi-page-${pIdx}`}
                    style={timesNewRomanFont}
                    className={getPdfPageClass('p-[12mm]')}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                        <div className="w-16 h-16 flex items-center justify-center">
                          <TutWuriLogo className="w-14 h-14" />
                        </div>
                        <div className="text-center font-bold leading-tight">
                          <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                          <h2 className="text-xs tracking-wide uppercase">
                            EKSTRAKURIKULER MARCHING BAND — PRESENSI ANGGOTA (NO {startNo} - {endNo})
                          </h2>
                          <h3 className="text-xs tracking-wide uppercase">({namaSekolahFormatted})</h3>
                          <h4 className="text-xs tracking-wide font-normal">({filterTahunAjaran})</h4>
                        </div>
                        <div className="w-16 h-16 flex items-center justify-center">
                          <MarchingBandLogo className="w-14 h-14" />
                        </div>
                      </div>

                      <table className="w-full border-collapse border border-black text-[8.5px] text-center">
                        <thead>
                          <tr className="bg-slate-100 font-bold border-b border-black">
                            <th className="border border-black p-1 w-6">NO</th>
                            <th className="border border-black p-1 text-center">NAMA ANGGOTA</th>
                            <th className="border border-black p-1 w-16">KELAS</th>
                            <th className="border border-black p-1 w-24">DIVISI</th>
                            <th className="border border-black p-1 w-8">1</th>
                            <th className="border border-black p-1 w-8">2</th>
                            <th className="border border-black p-1 w-8">3</th>
                            <th className="border border-black p-1 w-8">4</th>
                            <th className="border border-black p-1 w-8">5</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.members.map((student, idx) => {
                            const no = page.startNo + idx;
                            return (
                              <tr key={idx} className="h-7 border-b border-black">
                                <td className="border border-black p-0.5 font-bold align-middle">{student ? no : ''}</td>
                                <td className="border border-black p-0.5 text-center align-middle font-medium truncate max-w-[140px]">
                                  {student ? (formatNamaKapital(student.nama) || '') : ''}
                                </td>
                                <td className="border border-black p-0.5 align-middle">{student?.kelas ? formatKelasAngka(student.kelas) : ''}</td>
                                <td className="border border-black p-0.5 text-left align-middle truncate max-w-[100px]">
                                  {student?.divisiNama || ''}
                                </td>
                                {[1, 2, 3, 4, 5].map((col) => {
                                  const status = student ? getStudentAttendanceStatus(student, col) : null;
                                  return (
                                    <td key={col} className="border border-black px-0.5 py-0 align-middle h-7 bg-slate-50/20">
                                      {status?.isPresent && student ? (
                                        <StudentWetSignature
                                          studentName={formatNamaKapital(student.nama)}
                                          columnIndex={col}
                                          customSignatureUrl={status.customSig || student.signatureUrl}
                                          height="24px"
                                          maxWidth="100%"
                                        />
                                      ) : (
                                        <span className="font-bold text-slate-700 text-[9px]">{status?.label || ''}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                      Halaman {pIdx + 2} / {totalPages} — Presensi Anggota (No {startNo}-{endNo}) — {namaSekolahFormatted}
                    </div>
                  </div>
                );
              })}

              {/* PAGE 4: Lampiran Foto Dokumentasi Kegiatan & Event */}
              <div
                style={timesNewRomanFont}
                className={getPdfPageClass('p-[12mm]')}
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TutWuriLogo className="w-14 h-14" />
                    </div>
                    <div className="text-center font-bold leading-tight">
                      <h1 className="text-xs sm:text-sm tracking-wide uppercase">LAMPIRAN FOTO DOKUMENTASI KEGIATAN & EVENT</h1>
                      <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND</h2>
                      <h3 className="text-xs tracking-wide uppercase">({namaSekolahFormatted})</h3>
                      <h4 className="text-xs tracking-wide font-normal">({filterTahunAjaran})</h4>
                    </div>
                    <div className="w-16 h-16 flex items-center justify-center">
                      <MarchingBandLogo className="w-14 h-14" />
                    </div>
                  </div>

                  <div className="mb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-black pb-1">
                    <span>BULAN : {filterBulan.toUpperCase()}</span>
                    <span>
                      DOKUMENTASI FOTO: {activeEventPhotos.length} EVENT / {documentationItems.length} LATIHAN
                    </span>
                  </div>

                  {/* Event Photos Section if any */}
                  {activeEventPhotos.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-bold uppercase mb-1.5 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                        <span>A. FOTO LAPORAN EVENT & PERLOMBAAN / PENAMPILAN</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                          {activeEventPhotos.length} Event
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {activeEventPhotos.slice(0, 2).map((evt) => (
                          <div key={evt.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                            <div className="mb-1 border-b border-slate-300 pb-1">
                              <div className="flex items-center justify-between text-[8.5px] font-bold">
                                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-300">🏆 FOTO EVENT</span>
                                <span className="text-slate-700">{evt.tanggal}</span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-900 mt-1 line-clamp-1">
                                {evt.namaEvent}
                              </div>
                              {evt.lokasi && (
                                <div className="text-[8.5px] text-slate-600">
                                  Lokasi: {evt.lokasi}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                              <img src={evt.fotoUrl} alt={evt.namaEvent} className="w-full h-full object-cover" />
                            </div>

                            <div className="mt-1 pt-1 border-t border-slate-300 text-[8.5px]">
                              {evt.prestasi && (
                                <div className="font-bold text-amber-800 line-clamp-1">
                                  Prestasi: {evt.prestasi}
                                </div>
                              )}
                              {evt.keterangan && (
                                <div className="text-slate-600 italic line-clamp-1">
                                  {evt.keterangan}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Training Photos Section */}
                  {documentationItems.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase mb-1.5 bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                        <span>{activeEventPhotos.length > 0 ? 'B. FOTO DOKUMENTASI KEGIATAN LATIHAN REGULER' : 'FOTO DOKUMENTASI KEGIATAN LATIHAN REGULER'}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                          {documentationItems.length} Sesi Latihan
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {documentationItems.slice(0, activeEventPhotos.length > 0 ? 2 : 4).map((item) => (
                          <div key={item.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between min-h-[85mm] box-border">
                            <div className="mb-1 border-b border-slate-300 pb-1">
                              <div className="flex items-center justify-between text-[8.5px] font-bold text-black">
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded">{item.hariTanggalFormat || item.tanggal}</span>
                                <span className="text-blue-700 font-bold">{item.jamMulai} - {item.jamSelesai}</span>
                              </div>
                              <div className="text-[9.5px] font-bold text-slate-900 mt-1 line-clamp-1">
                                {item.materiPokok}
                              </div>
                            </div>

                            <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[52mm]">
                              {item.fotoDokumentasiUrl ? (
                                <img
                                  src={item.fotoDokumentasiUrl}
                                  alt={`Dokumentasi ${item.hariTanggalFormat || item.tanggal}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400">Tidak ada foto</span>
                              )}
                            </div>

                            <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px]">
                              <div>
                                <span className="text-slate-600 font-medium">Pencapaian: </span>
                                <span className="font-bold text-emerald-700">{item.pencapaianPercent}%</span>
                              </div>
                              {item.parafPelatihUrl && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[7.5px] text-slate-500">Paraf:</span>
                                  <img src={item.parafPelatihUrl} alt="Paraf" className="h-4 max-w-[35px] object-contain" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeEventPhotos.length === 0 && documentationItems.length === 0 && (
                    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500 my-12">
                      <p className="text-xs font-semibold">Belum ada foto dokumentasi kegiatan latihan atau foto event yang diunggah untuk bulan {filterBulan}.</p>
                    </div>
                  )}
                </div>

                <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                  Halaman 4 / 4 — Lampiran Foto Dokumentasi Kegiatan & Event — {namaSekolahFormatted}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Assistant Signature Drawing Modal */}
      {isDrawingAsistenSig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Tanda Tangan Asisten Pelatih</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawingAsistenSig(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Goreskan tanda tangan atau paraf asisten pelatih pada kanvas di bawah ini:
            </p>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex justify-center">
              <SignaturePad
                onSave={(dataUrl) => {
                  setCustomAsistenSig(dataUrl);
                  setIsDrawingAsistenSig(false);
                }}
                initialDataUrl={customAsistenSig || undefined}
                width={300}
                height={140}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
