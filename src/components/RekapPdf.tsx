import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Sekolah, AbsenPelatihItem, Anggota, AbsenSiswaEntry, EventLog } from '../types';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { FileText, Download, Printer, Filter, Sparkles, School, Calendar, CheckCircle2, UserCheck, Users, PenTool, X, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { StorageService } from '../data/storage';
import { StudentWetSignature, getStudentSignatureDataUrl } from '../utils/studentSignature';
import { SignaturePad } from './SignaturePad';

interface RekapPdfProps {
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  absenPelatihList: AbsenPelatihItem[];
  anggotaList: Anggota[];
  absenSiswaList: AbsenSiswaEntry[];
  eventsList: EventLog[];
}

const BULAN_OPTIONS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_MAP: { [key: string]: string } = {
  'Januari': 'Jan', 'Februari': 'Feb', 'Maret': 'Mar', 'April': 'Apr',
  'Mei': 'Mei', 'Juni': 'Jun', 'Juli': 'Jul', 'Agustus': 'Ags',
  'September': 'Sep', 'Okt': 'Okt', 'November': 'Nov', 'Desember': 'Des'
};

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
  const [filterBulan, setFilterBulan] = useState('Agustus');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState(StorageService.getActiveTahunAjaran());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('AUTO');
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | 'ALL'>('ALL');
  const [namaEkskul, setNamaEkskul] = useState('MARCHING BAND');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  // Get coach info
  const pelatihUser = useMemo(() => {
    const users = StorageService.getUsers();
    return users.find(u => u.id === selectedSekolah?.pelatihId) || StorageService.getCurrentUser();
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

  const schoolAnggota = anggotaList.filter(a => a.sekolahId === filterSekolahId);

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
  const schoolEvents = eventsList.filter(e => e.sekolahId === filterSekolahId);

  // Pagination for members
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

  const exportPdf = async () => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const container = pdfContainerRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = container.querySelectorAll<HTMLElement>('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      }

      pdf.save(`Laporan-Ekstrakurikuler-${namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_')}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.pdf`);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Gagal mengekspor PDF otomatis. Anda dapat menggunakan tombol Cetak Langsung Browser.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
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

      const studentsRows = paddedPage1to30Rows.map((student, idx) => {
        const sigCols = [1, 2, 3, 4, 5].map(col => {
          if (!student) return '';
          const status = getStudentAttendanceStatus(student, col);
          if (status.isPresent) {
            const sigUrl = status.customSig || getStudentSignatureDataUrl(student.nama, col);
            return `<img src="${sigUrl}" height="16" style="max-height: 16px; object-contain: contain;" />`;
          }
          return status.label || '';
        });
        return `
          <tr style="height: 22px;">
            <td>${idx + 1}</td>
            <td class="text-left">${student?.nama || ''}</td>
            <td>${student?.kelas || ''}</td>
            <td>${sigCols[0]}</td>
            <td>${sigCols[1]}</td>
            <td>${sigCols[2]}</td>
            <td>${sigCols[3]}</td>
            <td>${sigCols[4]}</td>
          </tr>
        `;
      }).join('');

      const cigombongSignatureHtml = includeAsistenPelatih ? `
        <div style="margin-top: 35px;">
          <div style="text-align: right; margin-bottom: 12px; font-size: 9pt;">Cigombong, ................................</div>
          <table style="width: 100%; border: none; text-align: center; font-size: 9.5pt;">
            <tr>
              <td style="width: 50%; vertical-align: top; border: none;">
                <div><b>Pelatih Ekstrakurikuler</b></div>
                <div style="height: 55px;"></div>
                <div><b>(${pelatihName})</b></div>
                ${pelatihNip ? `<div style="font-size: 8.5pt;">NIP/NUPTK. ${pelatihNip}</div>` : ''}
              </td>
              <td style="width: 50%; vertical-align: top; border: none;">
                <div><b>Asisten Pelatih</b></div>
                <div style="height: 55px;"></div>
                <div><b>(${asistenName})</b></div>
                ${asistenNip ? `<div style="font-size: 8.5pt;">NIP/NUPTK. ${asistenNip}</div>` : ''}
              </td>
            </tr>
          </table>
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
            ttdHtml = `<img src="${sigUrl}" height="16" style="max-height: 16px; object-contain: contain;" />`;
          } else {
            ttdHtml = status.label || '';
          }
        }
        return `
          <tr style="height: 18px;">
            <td style="text-align: center; font-size: 8.5pt;">${idx + 1}</td>
            <td class="text-left" style="font-size: 8.5pt; padding-left: 6px;">${student?.nama || ''}</td>
            <td style="text-align: center; font-size: 8.5pt;">${ttdHtml}</td>
          </tr>
        `;
      }).join('') + `
        <tr style="height: 18px; font-weight: bold;">
          <td style="text-align: center; font-size: 8.5pt;">NO</td>
          <td class="text-left" style="font-size: 8.5pt; padding-left: 6px;">NAMA</td>
          <td style="text-align: center; font-size: 8.5pt;">TTD</td>
        </tr>
      `;

      const rightRows = paddedPage31to60Rows.map((student, idx) => {
        let ttdHtml = '';
        if (student) {
          const status = getStudentAttendanceStatus(student, 1);
          if (status.isPresent) {
            const sigUrl = status.customSig || getStudentSignatureDataUrl(student.nama, 1);
            ttdHtml = `<img src="${sigUrl}" height="16" style="max-height: 16px; object-contain: contain;" />`;
          } else {
            ttdHtml = status.label || '';
          }
        }
        return `
          <tr style="height: 18px;">
            <td style="text-align: center; font-size: 8.5pt;">${idx + 31}</td>
            <td class="text-left" style="font-size: 8.5pt; padding-left: 6px;">${student?.nama || ''}</td>
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
            <td style="width: 38%; vertical-align: top; border: none;">
              <div>MENGETAHUI,</div>
              <div>KEPALA ${schoolTitle}</div>
              <div style="height: 50px;"></div>
              <div><u><b>${kepalaSekolahInfo.nama}</b></u></div>
              <div>NIP. ${kepalaSekolahInfo.nip || '................................................'}</div>
            </td>
            <td style="width: 31%; vertical-align: top; border: none; text-align: center;">
              <div>PELATIH UTAMA</div>
              <div style="height: 50px;"></div>
              <div><b>(${pelatihName})</b></div>
              <div style="margin-top: 2px; font-size: 8pt;">NIP/NUPTK. ${pelatihNip || '....................'}</div>
            </td>
            <td style="width: 31%; vertical-align: top; border: none; text-align: center;">
              <div>ASISTEN PELATIH</div>
              <div style="height: 50px;"></div>
              <div><b>(${asistenName})</b></div>
              <div style="margin-top: 2px; font-size: 8pt;">NIP/NUPTK. ${asistenNip || '....................'}</div>
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

    const fullHtml = htmlHeader + bodyContent + '</body></html>';
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
            title="Cetak langsung menggunakan dialog printer browser"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak Browser</span>
          </button>

          <button
            onClick={exportWord}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
            title="Ekspor ke dokumen Microsoft Word (.doc)"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Unduh Word (.doc)</span>
          </button>

          <button
            onClick={exportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
            title="Ekspor laporan ke file PDF"
          >
            <Download className="w-4 h-4 text-yellow-300" />
            <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh File PDF'}</span>
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
                <option key={b} value={b}>{b}</option>
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
        <div id="printable-pdf-area" ref={pdfContainerRef} className="space-y-8 w-full max-w-[210mm]">

          {/* =========================================================================
              TEMPLATE 1: SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR
             ========================================================================= */}
          {resolvedTemplate === 'SMPN2_CIGOMBONG' && (
            <>
              {/* PAGE 1: LAPORAN KEGIATAN EKSTRAKURIKULER */}
              <div
                style={timesNewRomanFont}
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto relative"
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
                {includeAsistenPelatih ? (
                  <div className="mt-10 mb-4 text-xs">
                    <div className="text-right mb-2 font-normal">Cigombong, ................................</div>
                    <div className="grid grid-cols-2 gap-8 text-center">
                      <div>
                        <div className="font-bold">Pelatih Ekstrakurikuler</div>
                        <div className="h-16 flex items-center justify-center my-1">
                          {coachSignatureUrl && (
                            <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-14 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                        <div className="font-bold mt-1">({pelatihName})</div>
                        {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                      </div>

                      <div>
                        <div className="font-bold">Asisten Pelatih</div>
                        <div className="h-16 flex items-center justify-center my-1">
                          {asistenSignatureUrl && (
                            <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-14 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                        <div className="font-bold mt-1">({asistenName})</div>
                        {asistenNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {asistenNip}</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end mt-12 mb-4 text-xs">
                    <div className="w-64 text-center">
                      <div>Cigombong, ................................</div>
                      <div className="mt-1">Pelatih Ekstrakurikuler</div>

                      <div className="h-16 flex items-center justify-center my-1">
                        {coachSignatureUrl && (
                          <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-14 max-w-[120px] object-contain" />
                        )}
                      </div>

                      <div className="border-b border-dotted border-black w-48 mx-auto"></div>
                      <div className="font-bold mt-1">({pelatihName})</div>
                    </div>
                  </div>
                )}
              </div>


              {/* PAGE 2: DAFTAR HADIR PESERTA EKSTRAKURIKULER (NO 1 - 30) */}
              <div
                style={timesNewRomanFont}
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto relative"
              >
                <div>
                  {/* Header Title */}
                  <div className="text-center font-bold leading-tight mb-6">
                    <h1 className="text-base tracking-wide uppercase">DAFTAR HADIR PESERTA EKSTRAKURIKULER</h1>
                    <h2 className="text-base tracking-wide uppercase">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</h2>
                    <h3 className="text-base tracking-wide uppercase">TAHUN PELAJARAN {filterTahunAjaran}</h3>
                  </div>

                  {/* Subheader: Bulan & Nama Ekstrakurikuler */}
                  <div className="flex items-center justify-between text-xs font-bold mb-3">
                    <div>Bulan : {filterBulan}</div>
                    <div>Nama Ekstrakurikuler : {namaEkskul}</div>
                  </div>

                  {/* Table: No., Nama Anggota, Kelas, Tanggal/Tanda Tangan (1-5) */}
                  <table className="w-full border-collapse border border-black text-[9.5px] text-center">
                    <thead>
                      <tr className="font-bold border-b border-black">
                        <th rowSpan={2} className="border border-black p-1 w-8 align-middle">No.</th>
                        <th rowSpan={2} className="border border-black p-1 text-left align-middle pl-2">Nama Anggota</th>
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
                      {paddedPage1to30Rows.map((student, idx) => {
                        const no = idx + 1;
                        return (
                          <tr key={idx} className="h-5 border-b border-black">
                            <td className="border border-black p-0.5 font-bold align-middle">{no}</td>
                            <td className="border border-black p-0.5 text-left align-middle font-medium truncate max-w-[170px] pl-2">
                              {student?.nama || ''}
                            </td>
                            <td className="border border-black p-0.5 align-middle">{student?.kelas || ''}</td>

                            {/* 5 Attendance signature/check marks */}
                            {[1, 2, 3, 4, 5].map((col) => {
                              const status = student ? getStudentAttendanceStatus(student, col) : null;
                              return (
                                <td key={col} className="border border-black p-0.5 align-middle">
                                  {status?.isPresent && student ? (
                                    <StudentWetSignature
                                      studentName={student.nama}
                                      columnIndex={col}
                                      customSignatureUrl={status.customSig || student.signatureUrl}
                                      height="13px"
                                      maxWidth="32px"
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

                {/* Footer Signature */}
                {includeAsistenPelatih ? (
                  <div className="mt-6 mb-2 text-xs">
                    <div className="text-right mb-2 font-normal">Cigombong, ......................................</div>
                    <div className="grid grid-cols-2 gap-8 text-center">
                      <div>
                        <div className="font-bold">Pelatih Ekstrakurikuler</div>
                        <div className="h-14 flex items-center justify-center my-1">
                          {coachSignatureUrl && (
                            <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-12 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                        <div className="font-bold mt-1">({pelatihName})</div>
                        {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                      </div>

                      <div>
                        <div className="font-bold">Asisten Pelatih</div>
                        <div className="h-14 flex items-center justify-center my-1">
                          {asistenSignatureUrl && (
                            <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-12 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                        <div className="font-bold mt-1">({asistenName})</div>
                        {asistenNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {asistenNip}</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end mt-6 mb-2 text-xs">
                    <div className="w-64 text-center">
                      <div>Cigombong, ......................................</div>
                      <div className="mt-1">Pelatih Ekstrakurikuler</div>

                      <div className="h-14 flex items-center justify-center my-1">
                        {coachSignatureUrl && (
                          <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-12 max-w-[120px] object-contain" />
                        )}
                      </div>

                      <div className="border-b border-dotted border-black w-48 mx-auto"></div>
                      <div className="font-bold mt-1">({pelatihName})</div>
                    </div>
                  </div>
                )}
              </div>

              {/* PAGE 3 (Optional if > 30 students): DAFTAR HADIR PESERTA EKSTRAKURIKULER (NO 31 - 60) */}
              {schoolAnggota.length > 30 && (
                <div
                  style={timesNewRomanFont}
                  className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto relative"
                >
                  <div>
                    {/* Header Title */}
                    <div className="text-center font-bold leading-tight mb-6">
                      <h1 className="text-base tracking-wide uppercase">DAFTAR HADIR PESERTA EKSTRAKURIKULER</h1>
                      <h2 className="text-base tracking-wide uppercase">SMP NEGERI 2 CIGOMBONG KABUPATEN BOGOR</h2>
                      <h3 className="text-base tracking-wide uppercase">TAHUN PELAJARAN {filterTahunAjaran}</h3>
                    </div>

                    {/* Subheader */}
                    <div className="flex items-center justify-between text-xs font-bold mb-3">
                      <div>Bulan : {filterBulan}</div>
                      <div>Nama Ekstrakurikuler : {namaEkskul}</div>
                    </div>

                    {/* Table: No 31-60 */}
                    <table className="w-full border-collapse border border-black text-[9.5px] text-center">
                      <thead>
                        <tr className="font-bold border-b border-black">
                          <th rowSpan={2} className="border border-black p-1 w-8 align-middle">No.</th>
                          <th rowSpan={2} className="border border-black p-1 text-left align-middle pl-2">Nama Anggota</th>
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
                        {paddedPage31to60Rows.map((student, idx) => {
                          const no = idx + 31;
                          return (
                            <tr key={idx} className="h-5 border-b border-black">
                              <td className="border border-black p-0.5 font-bold align-middle">{no}</td>
                              <td className="border border-black p-0.5 text-left align-middle font-medium truncate max-w-[170px] pl-2">
                                {student?.nama || ''}
                              </td>
                              <td className="border border-black p-0.5 align-middle">{student?.kelas || ''}</td>

                              {[1, 2, 3, 4, 5].map((col) => {
                                const status = student ? getStudentAttendanceStatus(student, col) : null;
                                return (
                                  <td key={col} className="border border-black p-0.5 align-middle">
                                    {status?.isPresent && student ? (
                                      <StudentWetSignature
                                        studentName={student.nama}
                                        columnIndex={col}
                                        customSignatureUrl={status.customSig || student.signatureUrl}
                                        height="13px"
                                        maxWidth="32px"
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

                  {includeAsistenPelatih ? (
                    <div className="mt-6 mb-2 text-xs">
                      <div className="text-right mb-2 font-normal">Cigombong, ......................................</div>
                      <div className="grid grid-cols-2 gap-8 text-center">
                        <div>
                          <div className="font-bold">Pelatih Ekstrakurikuler</div>
                          <div className="h-14 flex items-center justify-center my-1">
                            {coachSignatureUrl && (
                              <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-12 max-w-[120px] object-contain" />
                            )}
                          </div>
                          <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                          <div className="font-bold mt-1">({pelatihName})</div>
                          {pelatihNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {pelatihNip}</div>}
                        </div>

                        <div>
                          <div className="font-bold">Asisten Pelatih</div>
                          <div className="h-14 flex items-center justify-center my-1">
                            {asistenSignatureUrl && (
                              <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-12 max-w-[120px] object-contain" />
                            )}
                          </div>
                          <div className="border-b border-dotted border-black w-44 mx-auto"></div>
                          <div className="font-bold mt-1">({asistenName})</div>
                          {asistenNip && <div className="text-[10px] text-slate-700">NIP/NUPTK. {asistenNip}</div>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end mt-6 mb-2 text-xs">
                      <div className="w-64 text-center">
                        <div>Cigombong, ......................................</div>
                        <div className="mt-1">Pelatih Ekstrakurikuler</div>
                        <div className="h-14 flex items-center justify-center my-1">
                          {coachSignatureUrl && (
                            <img src={coachSignatureUrl} alt="TTD Pelatih" className="h-12 max-w-[120px] object-contain" />
                          )}
                        </div>
                        <div className="border-b border-dotted border-black w-48 mx-auto"></div>
                        <div className="font-bold mt-1">({pelatihName})</div>
                      </div>
                    </div>
                  )}
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

                return (
                  <div
                    key={meeting.id || mIdx}
                    style={timesNewRomanFont}
                    className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[14mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto relative"
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

                      {/* Two Column Parallel Attendance Table (1-30 and 31-60) */}
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Left Column Table: No 1 to 30 with Top & Bottom Header */}
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
                              {paddedPage1to30Rows.map((student, idx) => {
                                const no = idx + 1;
                                const meetingCol = (meeting.index !== undefined ? meeting.index : mIdx) + 1;
                                const status = student ? getStudentAttendanceStatus(student, meetingCol) : null;
                                return (
                                  <tr key={idx} className="h-4 border-b border-black">
                                    <td className="border border-black p-0.5 font-normal align-middle text-[8.5px]">{no}</td>
                                    <td className="border border-black p-0.5 text-left align-middle pl-1.5 truncate max-w-[130px] font-normal text-[8.5px]">
                                      {student?.nama || ''}
                                    </td>
                                    <td className="border border-black p-0.5 align-middle">
                                      {status?.isPresent && student ? (
                                        <StudentWetSignature
                                          studentName={student.nama}
                                          columnIndex={meetingCol}
                                          customSignatureUrl={status.customSig || student.signatureUrl}
                                          height="13px"
                                          maxWidth="36px"
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

                        {/* Right Column Table: No 31 to 60 (Starts directly at 31, no top header) */}
                        <div>
                          <table className="w-full border-collapse border border-black text-[9px] text-center">
                            <tbody>
                              {paddedPage31to60Rows.map((student, idx) => {
                                const no = idx + 31;
                                const meetingCol = (meeting.index !== undefined ? meeting.index : mIdx) + 1;
                                const status = student ? getStudentAttendanceStatus(student, meetingCol) : null;
                                return (
                                  <tr key={idx} className="h-4 border-b border-black">
                                    <td className="border border-black p-0.5 w-8 font-normal align-middle text-[8.5px]">{no}</td>
                                    <td className="border border-black p-0.5 text-left align-middle pl-1.5 truncate max-w-[130px] font-normal text-[8.5px]">
                                      {student?.nama || ''}
                                    </td>
                                    <td className="border border-black p-0.5 w-16 align-middle">
                                      {status?.isPresent && student ? (
                                        <StudentWetSignature
                                          studentName={student.nama}
                                          columnIndex={meetingCol}
                                          customSignatureUrl={status.customSig || student.signatureUrl}
                                          height="13px"
                                          maxWidth="36px"
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

                    {/* Footer: Mengetahui Kepala Sekolah & Pembimbing / Asisten Pelatih */}
                    {includeAsistenPelatih ? (
                      <div className="grid grid-cols-3 gap-3 mt-6 text-xs text-left">
                        {/* Left: Kepala Sekolah */}
                        <div className="pl-1">
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

                        {/* Center: Pelatih Utama */}
                        <div className="text-center">
                          <div className="font-normal">PELATIH UTAMA</div>

                          <div className="h-14 flex items-center justify-center">
                            {coachSignatureUrl && (
                              <img src={coachSignatureUrl} alt="TTD Pembimbing" className="h-11 max-w-[110px] object-contain" />
                            )}
                          </div>

                          <div className="border-b border-dotted border-black w-full max-w-[160px] mx-auto"></div>
                          <div className="font-bold text-xs mt-1">({pelatihName})</div>
                          <div className="font-normal text-[10px] mt-0.5">
                            NIP/NUPTK. {pelatihNip || '....................'}
                          </div>
                        </div>

                        {/* Right: Asisten Pelatih */}
                        <div className="text-center">
                          <div className="font-normal">ASISTEN PELATIH</div>

                          <div className="h-14 flex items-center justify-center">
                            {asistenSignatureUrl && (
                              <img src={asistenSignatureUrl} alt="TTD Asisten" className="h-11 max-w-[110px] object-contain" />
                            )}
                          </div>

                          <div className="border-b border-dotted border-black w-full max-w-[160px] mx-auto"></div>
                          <div className="font-bold text-xs mt-1">({asistenName})</div>
                          <div className="font-normal text-[10px] mt-0.5">
                            NIP/NUPTK. {asistenNip || '....................'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-left">
                        {/* Left: Kepala Sekolah */}
                        <div className="pl-1">
                          <div className="font-normal">MENGETAHUI,</div>
                          <div className="uppercase font-normal">KEPALA {schoolTitle}</div>

                          <div className="h-16 flex items-center">
                            {/* Signature space */}
                          </div>

                          <div className="font-bold text-xs uppercase tracking-wide underline">
                            {kepalaSekolahInfo.nama}
                          </div>
                          <div className="font-normal text-[11px] mt-0.5">
                            NIP. {kepalaSekolahInfo.nip || '................................................'}
                          </div>
                        </div>

                        {/* Right: Pembimbing */}
                        <div className="pl-1">
                          <div className="font-normal">PEMBIMBING</div>

                          <div className="h-16 flex items-center">
                            {coachSignatureUrl && (
                              <img src={coachSignatureUrl} alt="TTD Pembimbing" className="h-11 max-w-[120px] object-contain" />
                            )}
                          </div>

                          <div className="border-b border-dotted border-black w-full max-w-[240px]"></div>
                          <div className="font-normal text-[11px] mt-0.5">
                            NIP/NUPTK. {pelatihNip || ''}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
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

              {/* PAGE 2: Presensi Anggota (1-30) */}
              <div
                style={timesNewRomanFont}
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TutWuriLogo className="w-14 h-14" />
                    </div>
                    <div className="text-center font-bold leading-tight">
                      <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                      <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND — PRESENSI ANGGOTA (NO 1 - 30)</h2>
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
                        <th className="border border-black p-1 text-left">NAMA ANGGOTA</th>
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
                      {paddedPage1to30Rows.map((student, idx) => {
                        const no = idx + 1;
                        return (
                          <tr key={idx} className="h-6 border-b border-black">
                            <td className="border border-black p-0.5 font-bold align-middle">{no}</td>
                            <td className="border border-black p-0.5 text-left align-middle font-medium truncate max-w-[140px]">
                              {student?.nama || ''}
                            </td>
                            <td className="border border-black p-0.5 align-middle">{student?.kelas || ''}</td>
                            <td className="border border-black p-0.5 text-left align-middle truncate max-w-[100px]">
                              {student?.divisiNama || ''}
                            </td>
                            {[1, 2, 3, 4, 5].map((col) => {
                              const status = student ? getStudentAttendanceStatus(student, col) : null;
                              return (
                                <td key={col} className="border border-black p-0.5 align-middle bg-slate-50/20">
                                  {status?.isPresent && student ? (
                                    <StudentWetSignature
                                      studentName={student.nama}
                                      columnIndex={col}
                                      customSignatureUrl={status.customSig || student.signatureUrl}
                                      height="13px"
                                      maxWidth="32px"
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
                  Halaman 2 / 4 — Presensi Anggota (No 1-30) — {namaSekolahFormatted}
                </div>
              </div>

              {/* PAGE 3: Presensi Anggota (31-60) */}
              <div
                style={timesNewRomanFont}
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TutWuriLogo className="w-14 h-14" />
                    </div>
                    <div className="text-center font-bold leading-tight">
                      <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                      <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND — PRESENSI ANGGOTA (NO 31 - 60)</h2>
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
                        <th className="border border-black p-1 text-left">NAMA ANGGOTA</th>
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
                      {paddedPage31to60Rows.map((student, idx) => {
                        const no = idx + 31;
                        return (
                          <tr key={idx} className="h-6 border-b border-black">
                            <td className="border border-black p-0.5 font-bold align-middle">{no}</td>
                            <td className="border border-black p-0.5 text-left align-middle font-medium truncate max-w-[140px]">
                              {student?.nama || ''}
                            </td>
                            <td className="border border-black p-0.5 align-middle">{student?.kelas || ''}</td>
                            <td className="border border-black p-0.5 text-left align-middle truncate max-w-[100px]">
                              {student?.divisiNama || ''}
                            </td>
                            {[1, 2, 3, 4, 5].map((col) => {
                              const status = student ? getStudentAttendanceStatus(student, col) : null;
                              return (
                                <td key={col} className="border border-black p-0.5 align-middle bg-slate-50/20">
                                  {status?.isPresent && student ? (
                                    <StudentWetSignature
                                      studentName={student.nama}
                                      columnIndex={col}
                                      customSignatureUrl={status.customSig || student.signatureUrl}
                                      height="13px"
                                      maxWidth="32px"
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
                  Halaman 3 / 4 — Presensi Anggota (No 31-60) — {namaSekolahFormatted}
                </div>
              </div>

              {/* PAGE 4: Lampiran Foto */}
              <div
                style={timesNewRomanFont}
                className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TutWuriLogo className="w-14 h-14" />
                    </div>
                    <div className="text-center font-bold leading-tight">
                      <h1 className="text-xs sm:text-sm tracking-wide uppercase">LAMPIRAN FOTO DOKUMENTASI KEGIATAN LATIHAN</h1>
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
                    <span>DOKUMENTASI FOTO: {documentationItems.length} KEGIATAN</span>
                  </div>

                  {documentationItems.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500 my-12">
                      <p className="text-xs font-semibold">Belum ada foto dokumentasi kegiatan latihan yang diunggah untuk bulan {filterBulan}.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 my-2">
                      {documentationItems.map((item) => (
                        <div key={item.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between h-[115mm] box-border">
                          <div className="mb-1 border-b border-slate-300 pb-1">
                            <div className="flex items-center justify-between text-[8.5px] font-bold text-black">
                              <span className="bg-slate-200 px-1.5 py-0.5 rounded">{item.hariTanggalFormat}</span>
                              <span className="text-blue-700 font-bold">{item.jamMulai} - {item.jamSelesai}</span>
                            </div>
                            <div className="text-[9.5px] font-bold text-slate-900 mt-1 line-clamp-1">
                              {item.materiPokok}
                            </div>
                          </div>

                          <div className="flex-1 my-1 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-300 h-[75mm]">
                            {item.fotoDokumentasiUrl ? (
                              <img
                                src={item.fotoDokumentasiUrl}
                                alt={`Dokumentasi ${item.hariTanggalFormat}`}
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
                  )}
                </div>

                <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
                  Halaman 4 / 4 — Lampiran Foto Dokumentasi Kegiatan Latihan — {namaSekolahFormatted}
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
