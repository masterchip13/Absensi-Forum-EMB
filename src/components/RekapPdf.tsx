import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Sekolah, AbsenPelatihItem, Anggota, AbsenSiswaEntry, EventLog } from '../types';
import { TutWuriLogo, MarchingBandLogo } from './Logos';
import { FileText, Download, Printer, Calendar, Filter, Sparkles, CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react';

import { StorageService } from '../data/storage';

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

  // Group 30 items per page for Page 2 and Page 3 (Rows 1-30, Rows 31-60)
  const page2Anggota = schoolAnggota.slice(0, 30);
  const page3Anggota = schoolAnggota.slice(30, 60);

  // Pad table rows to match template layout visually if less than 30
  const paddedPage2Rows = Array.from({ length: 30 }, (_, i) => page2Anggota[i] || null);
  const paddedPage3Rows = Array.from({ length: 30 }, (_, i) => page3Anggota[i] || null);

  // Pad agendas table to 7 rows as shown in template image page 1
  const paddedAgendaRows = Array.from({ length: 7 }, (_, i) => schoolAbsenPelatih[i] || null);

  const getStudentSignatureForColumn = (anggotaId: string, kolomIndex: number): string | null => {
    const record = absenSiswaList.find(
      a => a.anggotaId === anggotaId &&
           a.sekolahId === filterSekolahId &&
           a.bulan === filterBulan &&
           a.kolomIndex === kolomIndex
    );
    if (record) {
      return record.signatureUrl || '✓';
    }
    return null;
  };

  const exportPdf = async () => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const container = pdfContainerRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Target page elements
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

      pdf.save(`Rekap-Absensi-MarchingBand-${namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_')}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.pdf`);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Gagal mengeksport PDF. Mencoba mencetak langsung via browser.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const exportWord = () => {
    const cleanSchoolName = namaSekolahFormatted.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rekap-Absensi-MarchingBand-${cleanSchoolName}-${filterBulan}-${filterTahunAjaran.replace('/', '-')}.doc`;

    const htmlHeader = `
<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Rekap Laporan Absensi Marching Band - ${namaSekolahFormatted}</title>
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
      font-size: 9.5pt;
      color: #000000;
      line-height: 1.3;
    }
    .header-box {
      text-align: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 12pt;
      font-weight: bold;
      font-family: 'Times New Roman', Times, serif;
      margin: 0;
      text-transform: uppercase;
    }
    .header-subtitle {
      font-size: 11pt;
      font-weight: bold;
      font-family: 'Times New Roman', Times, serif;
      margin: 2px 0;
      text-transform: uppercase;
    }
    .bulan-title {
      font-size: 10pt;
      font-weight: bold;
      font-family: 'Times New Roman', Times, serif;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9pt;
      font-family: 'Times New Roman', Times, serif;
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
    .footer-note {
      font-size: 8.5pt;
      font-family: 'Times New Roman', Times, serif;
      color: #64748b;
      text-align: right;
      margin-top: 10px;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
    }
  </style>
</head>
<body>
`;

    // Section 1: Agenda Kegiatan Latihan & Event
    const agendaRowsHtml = paddedAgendaRows.map(row => `
      <tr style="height: 38px;">
        <td style="font-weight: bold;">${row?.hariTanggalFormat || ''}</td>
        <td>${row ? `${row.jamMulai} S/D ${row.jamSelesai}` : 'S/D'}</td>
        <td class="text-left">${row?.materiPokok || ''}</td>
        <td style="text-align: center;">${row?.fotoDokumentasiUrl ? `<img src="${row.fotoDokumentasiUrl}" height="32" style="max-width: 55px; object-fit: cover; border-radius: 3px;" />` : '-'}</td>
        <td><b>${row ? `${row.pencapaianPercent}%` : ''}</b></td>
        <td>${row?.parafPelatihUrl ? `<img src="${row.parafPelatihUrl}" height="28" style="max-width: 60px;" />` : ''}</td>
        <td style="font-size: 8.5pt; font-weight: bold;">${row ? (selectedSekolah?.kepalaSekolah || '') : ''}</td>
      </tr>
    `).join('');

    const eventRowsHtml = schoolEvents.length === 0 ? `
      <tr style="height: 30px;"><td style="width: 30%;">-</td><td class="text-left">Belum ada agenda event pada bulan ini</td></tr>
    ` : schoolEvents.map(evt => `
      <tr style="height: 30px;">
        <td style="width: 30%; font-weight: bold;">${evt.tanggal}</td>
        <td class="text-left">${evt.namaEvent}</td>
      </tr>
    `).join('');

    const section1 = `
      <div class="header-box">
        <div class="header-title">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</div>
        <div class="header-subtitle">EKSTRAKURIKULER MARCHING BAND</div>
        <div class="header-subtitle">(${namaSekolahFormatted})</div>
        <div style="font-size: 10pt; margin-top: 2px;">(${filterTahunAjaran})</div>
      </div>

      <div class="bulan-title">BULAN : ${filterBulan.toUpperCase()}</div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 18%;">HARI, TANGGAL</th>
            <th style="width: 12%;">WAKTU</th>
            <th>MATERI POKOK</th>
            <th style="width: 14%;">FOTO DOKUMENTASI</th>
            <th style="width: 10%;">PENCAPAIAN %</th>
            <th style="width: 12%;">PARAF PELATIH</th>
            <th style="width: 16%;">MENGETAHUI KEPALA SEKOLAH</th>
          </tr>
        </thead>
        <tbody>
          ${agendaRowsHtml}
        </tbody>
      </table>

      <div style="font-weight: bold; font-size: 10pt; margin-top: 15px; margin-bottom: 6px;">AGENDA EVENT & KEGIATAN UNGGULAN:</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 30%;">HARI TANGGAL</th>
            <th>EVENT</th>
          </tr>
        </thead>
        <tbody>
          ${eventRowsHtml}
        </tbody>
      </table>

      <div class="footer-note">Halaman 1 / 4 — Laporan Resmi Marching Band ${namaSekolahFormatted}</div>
    `;

    // Section 2: Siswa Presensi 1-30
    const page2RowsHtml = paddedPage2Rows.map((student, idx) => {
      const no = idx + 1;
      const sigCols = [1, 2, 3, 4, 5].map(col => {
        const sig = student ? getStudentSignatureForColumn(student.id, col) : null;
        if (!sig) return '';
        if (sig.startsWith('data:image')) {
          return `<img src="${sig}" height="18" style="max-width: 30px;" />`;
        }
        return `<span style="color: #047857; font-weight: bold;">${sig}</span>`;
      });

      return `
        <tr style="height: 22px;">
          <td><b>${no}</b></td>
          <td class="text-left">${student?.nama || ''}</td>
          <td>${student?.kelas || ''}</td>
          <td class="text-left">${student?.divisiNama || ''}</td>
          <td>${sigCols[0]}</td>
          <td>${sigCols[1]}</td>
          <td>${sigCols[2]}</td>
          <td>${sigCols[3]}</td>
          <td>${sigCols[4]}</td>
        </tr>
      `;
    }).join('');

    const section2 = `
      <div class="page-break"></div>
      <div class="header-box">
        <div class="header-title">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</div>
        <div class="header-subtitle">EKSTRAKURIKULER MARCHING BAND — PRESENSI SISWA (NO 1 - 30)</div>
        <div class="header-subtitle">(${namaSekolahFormatted})</div>
        <div style="font-size: 10pt; margin-top: 2px;">BULAN : ${filterBulan.toUpperCase()} — TAHUN AJARAN : ${filterTahunAjaran}</div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">NO</th>
            <th style="width: 30%;">NAMA ANGGOTA</th>
            <th style="width: 12%;">KELAS</th>
            <th style="width: 25%;">DIVISI</th>
            <th style="width: 5.5%;">1</th>
            <th style="width: 5.5%;">2</th>
            <th style="width: 5.5%;">3</th>
            <th style="width: 5.5%;">4</th>
            <th style="width: 5.5%;">5</th>
          </tr>
        </thead>
        <tbody>
          ${page2RowsHtml}
        </tbody>
      </table>

      <div class="footer-note">Halaman 2 / 4 — Presensi Siswa (No 1 - 30) — ${namaSekolahFormatted}</div>
    `;

    // Section 3: Siswa Presensi 31-60
    const page3RowsHtml = paddedPage3Rows.map((student, idx) => {
      const no = idx + 31;
      const sigCols = [1, 2, 3, 4, 5].map(col => {
        const sig = student ? getStudentSignatureForColumn(student.id, col) : null;
        if (!sig) return '';
        if (sig.startsWith('data:image')) {
          return `<img src="${sig}" height="18" style="max-width: 30px;" />`;
        }
        return `<span style="color: #047857; font-weight: bold;">${sig}</span>`;
      });

      return `
        <tr style="height: 22px;">
          <td><b>${no}</b></td>
          <td class="text-left">${student?.nama || ''}</td>
          <td>${student?.kelas || ''}</td>
          <td class="text-left">${student?.divisiNama || ''}</td>
          <td>${sigCols[0]}</td>
          <td>${sigCols[1]}</td>
          <td>${sigCols[2]}</td>
          <td>${sigCols[3]}</td>
          <td>${sigCols[4]}</td>
        </tr>
      `;
    }).join('');

    const section3 = `
      <div class="page-break"></div>
      <div class="header-box">
        <div class="header-title">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</div>
        <div class="header-subtitle">EKSTRAKURIKULER MARCHING BAND — PRESENSI SISWA (NO 31 - 60)</div>
        <div class="header-subtitle">(${namaSekolahFormatted})</div>
        <div style="font-size: 10pt; margin-top: 2px;">BULAN : ${filterBulan.toUpperCase()} — TAHUN AJARAN : ${filterTahunAjaran}</div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">NO</th>
            <th style="width: 30%;">NAMA ANGGOTA</th>
            <th style="width: 12%;">KELAS</th>
            <th style="width: 25%;">DIVISI</th>
            <th style="width: 5.5%;">1</th>
            <th style="width: 5.5%;">2</th>
            <th style="width: 5.5%;">3</th>
            <th style="width: 5.5%;">4</th>
            <th style="width: 5.5%;">5</th>
          </tr>
        </thead>
        <tbody>
          ${page3RowsHtml}
        </tbody>
      </table>

      <div class="footer-note">Halaman 3 / 4 — Presensi Siswa (No 31 - 60) — ${namaSekolahFormatted}</div>
    `;

    // Section 4: Lampiran Foto Dokumentasi Kegiatan
    const docPhotoHtml = documentationItems.length === 0 ? `
      <div style="border: 1px dashed #cbd5e1; padding: 25px; text-align: center; color: #64748b; font-size: 9.5pt;">
        Belum ada foto dokumentasi kegiatan latihan yang diunggah untuk bulan ${filterBulan}.
      </div>
    ` : `
      <table style="width: 100%; border-collapse: separate; border-spacing: 10px;">
        ${documentationItems.reduce((acc: any[][], item, idx) => {
          if (idx % 2 === 0) acc.push([item]);
          else acc[acc.length - 1].push(item);
          return acc;
        }, []).map(pair => `
          <tr>
            ${pair.map(item => `
              <td style="width: 50%; border: 1px solid #000000; padding: 8px; vertical-align: top; background-color: #f8fafc;">
                <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                  <div>${item.hariTanggalFormat} (${item.jamMulai} - ${item.jamSelesai})</div>
                  <div style="color: #1e293b; font-size: 9pt; margin-top: 2px;">${item.materiPokok}</div>
                </div>
                <div style="text-align: center; margin: 6px 0;">
                  <img src="${item.fotoDokumentasiUrl}" style="max-width: 100%; max-height: 220px; border-radius: 4px; border: 1px solid #94a3b8;" />
                </div>
                <div style="font-size: 8.5pt; margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
                  <b>Target Pencapaian:</b> ${item.pencapaianPercent}%
                  ${item.catatan ? `<br/><i>Catatan: "${item.catatan}"</i>` : ''}
                </div>
              </td>
            `).join('')}
            ${pair.length === 1 ? '<td style="width: 50%;"></td>' : ''}
          </tr>
        `).join('')}
      </table>
    `;

    const section4 = `
      <div class="page-break"></div>
      <div class="header-box">
        <div class="header-title">LAMPIRAN FOTO DOKUMENTASI KEGIATAN LATIHAN</div>
        <div class="header-subtitle">EKSTRAKURIKULER MARCHING BAND</div>
        <div class="header-subtitle">(${namaSekolahFormatted})</div>
        <div style="font-size: 10pt; margin-top: 2px;">BULAN : ${filterBulan.toUpperCase()} — TAHUN AJARAN : ${filterTahunAjaran}</div>
      </div>

      ${docPhotoHtml}

      <div class="footer-note">Halaman 4 / 4 — Lampiran Foto Dokumentasi Kegiatan — ${namaSekolahFormatted}</div>
    `;

    const htmlFooter = `
</body>
</html>
`;

    const fullHtml = htmlHeader + section1 + section2 + section3 + section4 + htmlFooter;

    const blob = new Blob(['\ufeff', fullHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const timesNewRomanFont = { fontFamily: "'Times New Roman', Times, Georgia, serif" };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      {/* Print Specific CSS to enforce Times New Roman & Page breaks */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-pdf-area, #printable-pdf-area * {
            visibility: visible;
          }
          #printable-pdf-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .pdf-page {
            font-family: 'Times New Roman', Times, serif !important;
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Rekap Laporan Absensi Resmi ({namaSekolahFormatted})</h2>
            <p className="text-xs text-slate-500">
              Format Times New Roman resmi mencakup Agenda Latihan, Presensi Siswa, & Foto Dokumentasi Pelatih
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Langsung</span>
          </button>

          <button
            onClick={exportWord}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition"
            title="Ekspor laporan ke dokumen Microsoft Word (.doc/.docx)"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>Unduh File Word (.doc)</span>
          </button>

          <button
            onClick={exportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
            title="Ekspor laporan ke file PDF"
          >
            <Download className="w-4 h-4 text-yellow-300" />
            <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh File PDF'}</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Laporan:</span>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-slate-600 font-medium">Sekolah:</span>
          <select
            value={filterSekolahId}
            onChange={(e) => setFilterSekolahId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            {sekolahList.map(s => (
              <option key={s.id} value={s.id}>{s.namaSekolah}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Bulan:</span>
          <select
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            {BULAN_OPTIONS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Tahun Ajaran:</span>
          <select
            value={filterTahunAjaran}
            onChange={(e) => setFilterTahunAjaran(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            {tahunAjaranOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PDF Document Live Preview Canvas Container */}
      <div className="overflow-x-auto p-2 bg-slate-200/80 rounded-2xl border border-slate-300 flex flex-col items-center gap-6">
        <div id="printable-pdf-area" ref={pdfContainerRef} className="space-y-8 w-full max-w-[210mm]">
          
          {/* PAGE 1: Agenda Kegiatan Program Latihan Reguler & Event */}
          <div
            style={timesNewRomanFont}
            className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
          >
            <div>
              {/* Template Header Logos & Title */}
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

              {/* Bulan Subheader */}
              <div className="mb-3 text-xs font-bold uppercase tracking-wider">
                BULAN : {filterBulan.toUpperCase()}
              </div>

              {/* Table 1: Agenda Latihan Regular */}
              <table className="w-full border-collapse border border-black text-[9.5px] text-center mb-6">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5 w-20">HARI,<br/>TANGGAL</th>
                    <th className="border border-black p-1.5 w-16">WAKTU</th>
                    <th className="border border-black p-1.5">MATERI POKOK</th>
                    <th className="border border-black p-1.5 w-16">FOTO<br/>DOKUMENTASI</th>
                    <th className="border border-black p-1.5 w-14">PENCAPAIAN<br/>%</th>
                    <th className="border border-black p-1.5 w-16">PARAF<br/>PELATIH</th>
                    <th className="border border-black p-1.5 w-20">MENGETAHUI<br/>KEPALA SEKOLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {paddedAgendaRows.map((row, idx) => (
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
                      <td className="border border-black p-1 align-middle">
                        {row?.fotoDokumentasiUrl ? (
                          <img
                            src={row.fotoDokumentasiUrl}
                            alt="Dokumentasi"
                            className="h-8 max-w-[55px] mx-auto object-cover rounded border border-slate-300"
                          />
                        ) : (
                          ''
                        )}
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
                      <td className="border border-black p-1 align-middle text-[8.5px] font-bold text-slate-800">
                        {row ? selectedSekolah?.kepalaSekolah : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table 2: Events */}
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


          {/* PAGE 2: Siswa Absensi Columns (No 1 to 30) */}
          <div
            style={timesNewRomanFont}
            className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
          >
            <div>
              {/* Header Logos */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                <div className="w-16 h-16 flex items-center justify-center">
                  <TutWuriLogo className="w-14 h-14" />
                </div>
                <div className="text-center font-bold leading-tight">
                  <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                  <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND — PRESENSI SISWA (NO 1 - 30)</h2>
                  <h3 className="text-xs tracking-wide uppercase">({namaSekolahFormatted})</h3>
                  <h4 className="text-xs tracking-wide font-normal">({filterTahunAjaran})</h4>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <MarchingBandLogo className="w-14 h-14" />
                </div>
              </div>

              {/* Table Student Presensi No 1-30 */}
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
                  {paddedPage2Rows.map((student, idx) => {
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

                        {/* 5 Attendance Signature Columns */}
                        {[1, 2, 3, 4, 5].map((col) => {
                          const sig = student ? getStudentSignatureForColumn(student.id, col) : null;
                          return (
                            <td key={col} className="border border-black p-0.5 align-middle bg-slate-50/20">
                              {sig ? (
                                sig.startsWith('data:image') ? (
                                  <img src={sig} alt="sig" className="h-4 max-w-[28px] mx-auto object-contain" />
                                ) : (
                                  <span className="font-bold text-emerald-800">{sig}</span>
                                )
                              ) : (
                                ''
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
              Halaman 2 / 4 — Presensi Siswa (No 1-30) — {namaSekolahFormatted}
            </div>
          </div>


          {/* PAGE 3: Siswa Absensi Columns (No 31 to 60) */}
          <div
            style={timesNewRomanFont}
            className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
          >
            <div>
              {/* Header Logos */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                <div className="w-16 h-16 flex items-center justify-center">
                  <TutWuriLogo className="w-14 h-14" />
                </div>
                <div className="text-center font-bold leading-tight">
                  <h1 className="text-xs sm:text-sm tracking-wide uppercase">AGENDA KEGIATAN PROGRAM LATIHAN REGULER</h1>
                  <h2 className="text-xs tracking-wide uppercase">EKSTRAKURIKULER MARCHING BAND — PRESENSI SISWA (NO 31 - 60)</h2>
                  <h3 className="text-xs tracking-wide uppercase">({namaSekolahFormatted})</h3>
                  <h4 className="text-xs tracking-wide font-normal">({filterTahunAjaran})</h4>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <MarchingBandLogo className="w-14 h-14" />
                </div>
              </div>

              {/* Table Student Presensi No 31-60 */}
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
                  {paddedPage3Rows.map((student, idx) => {
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

                        {/* 5 Attendance Signature Columns */}
                        {[1, 2, 3, 4, 5].map((col) => {
                          const sig = student ? getStudentSignatureForColumn(student.id, col) : null;
                          return (
                            <td key={col} className="border border-black p-0.5 align-middle bg-slate-50/20">
                              {sig ? (
                                sig.startsWith('data:image') ? (
                                  <img src={sig} alt="sig" className="h-4 max-w-[28px] mx-auto object-contain" />
                                ) : (
                                  <span className="font-bold text-emerald-800">{sig}</span>
                                )
                              ) : (
                                ''
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
              Halaman 3 / 4 — Presensi Siswa (No 31-60) — {namaSekolahFormatted}
            </div>
          </div>


          {/* PAGE 4: Lampiran Foto Dokumentasi Kegiatan Latihan Pelatih */}
          <div
            style={timesNewRomanFont}
            className="pdf-page bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-lg text-black box-border flex flex-col justify-between mx-auto"
          >
            <div>
              {/* Header Logos */}
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

              {/* Bulan Subheader */}
              <div className="mb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-black pb-1">
                <span>BULAN : {filterBulan.toUpperCase()}</span>
                <span>DOKUMENTASI FOTO: {documentationItems.length} KEGIATAN</span>
              </div>

              {/* Gallery Grid */}
              {documentationItems.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500 my-12">
                  <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold">Belum ada foto dokumentasi kegiatan latihan yang diunggah untuk bulan {filterBulan}.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Foto dokumentasi yang diunggah oleh Pelatih saat absen harian akan otomatis muncul di halaman lampiran ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 my-2">
                  {documentationItems.map((item) => (
                    <div key={item.id} className="border border-black rounded p-2 bg-slate-50 flex flex-col justify-between h-[115mm] box-border">
                      {/* Header info */}
                      <div className="mb-1 border-b border-slate-300 pb-1">
                        <div className="flex items-center justify-between text-[8.5px] font-bold text-black">
                          <span className="bg-slate-200 px-1.5 py-0.5 rounded">{item.hariTanggalFormat}</span>
                          <span className="text-blue-700 font-bold">{item.jamMulai} - {item.jamSelesai}</span>
                        </div>
                        <div className="text-[9.5px] font-bold text-slate-900 mt-1 line-clamp-1">
                          {item.materiPokok}
                        </div>
                      </div>

                      {/* Photo */}
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

                      {/* Footer info */}
                      <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px]">
                        <div>
                          <span className="text-slate-600 font-medium">Pencapaian Target: </span>
                          <span className="font-bold text-emerald-700">{item.pencapaianPercent}%</span>
                        </div>
                        {item.parafPelatihUrl && (
                          <div className="flex items-center gap-1">
                            <span className="text-[7.5px] text-slate-500">Paraf Pelatih:</span>
                            <img src={item.parafPelatihUrl} alt="Paraf" className="h-4 max-w-[35px] object-contain" />
                          </div>
                        )}
                      </div>
                      {item.catatan && (
                        <div className="text-[8px] italic text-slate-600 truncate mt-0.5">
                          Catatan: "{item.catatan}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[8.5px] text-slate-500 text-right mt-4 pt-2 border-t border-slate-200">
              Halaman 4 / 4 — Lampiran Foto Dokumentasi Kegiatan Latihan — {namaSekolahFormatted}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


