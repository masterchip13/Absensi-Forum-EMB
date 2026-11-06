import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Anggota, Sekolah } from '../types';
import { MemberIdCard } from './MemberIdCard';
import { formatCardMemberName } from '../utils/nameFormatter';
import {
  renderMemberCardToCanvas,
  renderMemberCardBackToCanvas,
  preloadImage,
  CARD_TEMPLATE_SRC,
  CARD_BACK_TEMPLATE_SRC
} from '../utils/cardCanvasRenderer';
import jsPDF from 'jspdf';
import {
  Printer,
  QrCode as QrIcon,
  CheckSquare,
  Square,
  School,
  Filter,
  X,
  CreditCard,
  Grid,
  Download,
  Info,
  Loader2,
  RotateCw,
  Layers
} from 'lucide-react';

interface BatchQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  anggotaList: Anggota[];
  sekolahList: Sekolah[];
  selectedSekolahId: string;
}

interface MemberWithQr extends Anggota {
  qrDataUrl: string;
}

export const BatchQrPrintModal: React.FC<BatchQrPrintModalProps> = ({
  isOpen,
  onClose,
  anggotaList,
  sekolahList,
  selectedSekolahId
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [membersWithQr, setMembersWithQr] = useState<MemberWithQr[]>([]);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [printLayout, setPrintLayout] = useState<'idcard' | 'compact'>('idcard');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  // User requirement: "Buat halaman belakang untuk cetak id card nya dalam bentuk pdf"
  const [pdfSides, setPdfSides] = useState<'duplex' | 'front_only' | 'back_only'>('duplex');
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  // Sync selected school on open
  useEffect(() => {
    if (selectedSekolahId) {
      setFilterSekolahId(selectedSekolahId);
    }
  }, [selectedSekolahId, isOpen]);

  // Available division options based on filtered school
  const divisionOptions = React.useMemo(() => {
    const list = filterSekolahId === 'ALL'
      ? anggotaList
      : anggotaList.filter(a => a.sekolahId === filterSekolahId);
    const divs = new Set(list.map(a => a.divisiNama).filter(Boolean));
    return Array.from(divs);
  }, [anggotaList, filterSekolahId]);

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    return anggotaList.filter(a => {
      if (filterSekolahId !== 'ALL' && a.sekolahId !== filterSekolahId) return false;
      if (filterDivisi !== 'ALL' && a.divisiNama !== filterDivisi) return false;
      return true;
    });
  }, [anggotaList, filterSekolahId, filterDivisi]);

  // Initialize all as selected when filtered list changes
  useEffect(() => {
    setSelectedIds(filteredMembers.map(m => m.id));
  }, [filteredMembers]);

  // Generate QR code data URLs for selected members
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingQr(true);

    const generateQrs = async () => {
      const activeMembers = filteredMembers.filter(m => selectedIds.includes(m.id));
      const results: MemberWithQr[] = [];

      for (const m of activeMembers) {
        try {
          const qrDataUrl = await QRCode.toDataURL(m.qrCodeData || `FMB-${m.sekolahId}-${m.id}`, {
            width: 320,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          results.push({ ...m, qrDataUrl });
        } catch (err) {
          console.error('Error generating QR for', m.nama, err);
          results.push({ ...m, qrDataUrl: '' });
        }
      }

      if (isMounted) {
        setMembersWithQr(results);
        setLoadingQr(false);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIds, filteredMembers]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map(m => m.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  /**
   * One-Click Batch PDF Downloader
   * User requirement: "Perbaiki cetak banyak qr nya agar bisa di download dalam satu kali klik dalam format pdf"
   * Renders all selected member cards cleanly into an A4 PDF document (8 cards per page with cut guidelines)
   */
  /**
   * One-Click Batch PDF Downloader
   * User requirements:
   * 1. "Perbaiki cetak banyak qr nya agar bisa di download dalam satu kali klik dalam format pdf"
   * 2. "Buat halaman belakang untuk cetak id card nya dalam bentuk pdf"
   * Renders all selected member cards into an A4 PDF document (8 cards per page with cut guidelines).
   * Supports Duplex (Bolak-Balik), Front Only, and Back Only modes with exact registration alignment.
   */
  const handleDownloadBatchPdf = async () => {
    if (membersWithQr.length === 0) {
      alert('Tidak ada anggota yang dipilih untuk diunduh.');
      return;
    }

    setIsDownloadingPdf(true);
    setPdfProgressText('Menyiapkan template kartu...');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      if (printLayout === 'idcard') {
        // Layout: 2 columns x 4 rows = 8 physical cards per A4 page
        // Card dimensions: 90mm x 60.38mm
        const cardW = 90;
        const cardH = 60.38;
        const startX = 10;
        const startY = 14;
        const gapX = 10;
        const gapY = 6;
        const cardsPerPage = 8;

        // Preload template backgrounds
        const frontBgImg = (pdfSides === 'duplex' || pdfSides === 'front_only')
          ? await preloadImage(CARD_TEMPLATE_SRC)
          : null;
        const backBgImg = (pdfSides === 'duplex' || pdfSides === 'back_only')
          ? await preloadImage(CARD_BACK_TEMPLATE_SRC)
          : null;

        // Pre-generate back canvas once for performance
        let backDataUrl = '';
        if (backBgImg) {
          const backCanvas = await renderMemberCardBackToCanvas(backBgImg);
          backDataUrl = backCanvas.toDataURL('image/jpeg', 0.92);
        }

        const totalBatches = Math.ceil(membersWithQr.length / cardsPerPage);
        let isFirstPage = true;

        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          const batchStart = batchIdx * cardsPerPage;
          const batchEnd = Math.min(batchStart + cardsPerPage, membersWithQr.length);
          const batchMembers = membersWithQr.slice(batchStart, batchEnd);

          // 1. FRONT SIDE PAGE (if duplex or front_only)
          if (pdfSides === 'duplex' || pdfSides === 'front_only') {
            if (!isFirstPage) {
              pdf.addPage();
            }
            isFirstPage = false;

            for (let k = 0; k < batchMembers.length; k++) {
              const student = batchMembers[k];
              const overallIdx = batchStart + k + 1;
              setPdfProgressText(`Membuat Kartu Depan ${overallIdx}/${membersWithQr.length} (${student.nama})...`);

              const col = k % 2;
              const row = Math.floor(k / 2);
              const x = startX + col * (cardW + gapX);
              const y = startY + row * (cardH + gapY);

              const studentSchool = sekolahList.find(s => s.id === student.sekolahId)?.namaSekolah || activeSchoolName;
              const cardCanvas = await renderMemberCardToCanvas(student, studentSchool, student.qrDataUrl, frontBgImg || undefined);
              const cardDataUrl = cardCanvas.toDataURL('image/jpeg', 0.92);

              // Place front card on PDF
              pdf.addImage(cardDataUrl, 'JPEG', x, y, cardW, cardH);

              // Subtle dashed cutting guide line
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineDashPattern([2, 2], 0);
              pdf.rect(x - 0.3, y - 0.3, cardW + 0.6, cardH + 0.6);
            }
          }

          // 2. BACK SIDE PAGE (if duplex or back_only)
          if (pdfSides === 'duplex' || pdfSides === 'back_only') {
            if (!isFirstPage) {
              pdf.addPage();
            }
            isFirstPage = false;

            setPdfProgressText(`Membuat Halaman Belakang Lembar ke-${batchIdx + 1}/${totalBatches}...`);

            for (let k = 0; k < batchMembers.length; k++) {
              const col = k % 2;
              const row = Math.floor(k / 2);
              // For duplex flip on long edge (flip horizontal):
              // Front Column 0 aligns with Back Column 1
              // Front Column 1 aligns with Back Column 0
              const backCol = 1 - col;
              const x = startX + backCol * (cardW + gapX);
              const y = startY + row * (cardH + gapY);

              // Place back card on PDF
              pdf.addImage(backDataUrl, 'JPEG', x, y, cardW, cardH);

              // Subtle dashed cutting guide line
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineDashPattern([2, 2], 0);
              pdf.rect(x - 0.3, y - 0.3, cardW + 0.6, cardH + 0.6);
            }
          }
        }
      } else {
        // Compact Stiker QR Layout: 3 columns x 5 rows = 15 stickers per page
        const cardW = 58;
        const cardH = 50;
        const startX = 10;
        const startY = 12;
        const gapX = 7;
        const gapY = 5;
        const cardsPerPage = 15;

        for (let i = 0; i < membersWithQr.length; i++) {
          const student = membersWithQr[i];
          setPdfProgressText(`Membuat Stiker ${i + 1}/${membersWithQr.length} (${student.nama})...`);

          const slotIndex = i % cardsPerPage;
          if (i > 0 && slotIndex === 0) {
            pdf.addPage();
          }

          const col = slotIndex % 3;
          const row = Math.floor(slotIndex / 3);
          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);

          const studentSchool = sekolahList.find(s => s.id === student.sekolahId)?.namaSekolah || activeSchoolName;

          // Draw sticker box
          pdf.setDrawColor(30, 41, 59);
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

          // Header banner
          pdf.setFillColor(15, 23, 42);
          pdf.rect(x, y, cardW, 6, 'F');
          pdf.setTextColor(245, 158, 11);
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.text('MARCHING BAND', x + cardW / 2, y + 4, { align: 'center' });

          // QR Image
          if (student.qrDataUrl) {
            pdf.addImage(student.qrDataUrl, 'PNG', x + (cardW - 25) / 2, y + 8, 25, 25);
          }

          // Student Details
          pdf.setTextColor(15, 23, 42);
          pdf.setFontSize(7.5);
          pdf.setFont('helvetica', 'bold');
          const shortName = formatCardMemberName(student.nama, 18);
          pdf.text(shortName.toUpperCase(), x + cardW / 2, y + 37, { align: 'center' });

          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(71, 85, 105);
          pdf.text(`DIVISI ${student.divisiNama || 'UMUM'}`.toUpperCase(), x + cardW / 2, y + 42, { align: 'center' });
          pdf.setFont('helvetica', 'normal');
          pdf.text(studentSchool, x + cardW / 2, y + 46, { align: 'center' });
        }
      }

      // Safe Blob download in one click
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      const cleanSchool = activeSchoolName.replace(/[^a-zA-Z0-9]/g, '_');
      const sideSuffix = pdfSides === 'duplex' ? 'Bolak_Balik' : (pdfSides === 'back_only' ? 'Belakang' : 'Depan');
      downloadLink.download = `Kumpulan_Kartu_Anggota_${cleanSchool}_${membersWithQr.length}_Kartu_${sideSuffix}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

    } catch (err) {
      console.error('Batch PDF generation failed:', err);
      alert('Gagal membuat file PDF. Silakan gunakan tombol Cetak Langsung Browser.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressText('');
    }
  };

  const activeSchoolName = sekolahList.find(s => s.id === filterSekolahId)?.namaSekolah || 'Semua Sekolah';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Print-specific style block optimized for physical printing on A4 paper */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-qr-container, #printable-qr-container * {
            visibility: visible !important;
          }
          #printable-qr-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .id-card-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            page-break-inside: auto;
          }
          .id-card-print-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8px !important;
          }
          .id-card-element {
            width: 95mm !important;
            height: 63.7mm !important;
            border: 1px solid #1e293b !important;
            box-shadow: none !important;
            border-radius: 4px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-sm font-black">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Cetak Fisik Kartu Anggota & Barcode Anggota
              </h3>
              <p className="text-xs text-slate-300">
                Format resmi template Forum MB ({membersWithQr.length} kartu siap dicetak)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBatchPdf}
              disabled={membersWithQr.length === 0 || loadingQr || isDownloadingPdf}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              title="Unduh semua kartu anggota yang dicentang dalam format PDF siap cetak dalam sekali klik"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>{isDownloadingPdf ? (pdfProgressText || 'Membuat PDF...') : `Unduh PDF (${membersWithQr.length} Kartu${printLayout === 'idcard' ? (pdfSides === 'duplex' ? ' • Bolak-Balik' : (pdfSides === 'back_only' ? ' • Belakang' : ' • Depan')) : ''})`}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={membersWithQr.length === 0 || loadingQr || isDownloadingPdf}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:bg-slate-800 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition cursor-pointer"
              title="Buka dialog cetak printer bawaan browser"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Cetak Printer</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Layout Toggle Controls (No Print) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filter Sekolah */}
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600 shrink-0" />
              <select
                value={filterSekolahId}
                onChange={(e) => setFilterSekolahId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">🏫 Semua Sekolah</option>
                {sekolahList.map(s => (
                  <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                ))}
              </select>
            </div>

            {/* Filter Divisi */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600 shrink-0" />
              <select
                value={filterDivisi}
                onChange={(e) => setFilterDivisi(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">🎷 Semua Divisi</option>
                {divisionOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Layout View Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPrintLayout('idcard')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  printLayout === 'idcard'
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Desain Kartu ID Resmi</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('compact')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  printLayout === 'compact'
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Stiker Mini QR</span>
              </button>
            </div>

            {/* Sisi PDF & Preview Options (When in idcard mode) */}
            {printLayout === 'idcard' && (
              <>
                {/* Preview Front/Back Toggle */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Preview:
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('front')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      previewSide === 'front'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Depan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('back')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      previewSide === 'back'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Belakang</span>
                  </button>
                </div>

                {/* PDF Output Mode Selector */}
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-black text-amber-900">Format PDF:</span>
                  <select
                    value={pdfSides}
                    onChange={(e) => setPdfSides(e.target.value as 'duplex' | 'front_only' | 'back_only')}
                    className="bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 py-1 px-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="duplex">📄 Bolak-Balik (Duplex Otomatis)</option>
                    <option value="front_only">Halaman Depan Saja</option>
                    <option value="back_only">Halaman Belakang Saja</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Toggle All Selection */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs transition"
            >
              {selectedIds.length === filteredMembers.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Batalkan Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Pilih Semua ({filteredMembers.length})</span>
                </>
              )}
            </button>
            <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {selectedIds.length} Anggota Terpilih
            </span>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {/* Member selection checkboxes pills (No Print) */}
          <div className="no-print mb-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Centang Anggota Yang Ingin Dicetak ({selectedIds.length}/{filteredMembers.length}):
              </p>
              <span className="text-[10px] text-slate-400">
                Klik nama anggota untuk memilih/membatalkan
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {filteredMembers.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggleStudent(m.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m.nama}</span>
                    <span className="text-[10px] opacity-80">({m.divisiNama})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRINTABLE CONTAINER (Rendered on screen & formatted for physical printing) */}
          <div id="printable-qr-container">
            {/* Header Document Title for Print */}
            <div className="text-center mb-4 pb-2 border-b-2 border-slate-800 no-print">
              <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
                PREVIEW KARTU ANGGOTA & BARCODE MARCHING BAND
              </h2>
              <p className="text-xs font-bold text-slate-700">
                {activeSchoolName} • TOTAL: {membersWithQr.length} KARTU
              </p>
            </div>

            {loadingQr ? (
              <div className="no-print py-16 text-center text-slate-500">
                <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold">Membuat Gambar Barcode / QR Code Anggota...</p>
              </div>
            ) : membersWithQr.length === 0 ? (
              <div className="no-print py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs font-semibold text-slate-600">Tidak ada anggota yang dipilih.</p>
                <p className="text-[11px] text-slate-400 mt-1">Pilih setidaknya 1 anggota untuk dicetak.</p>
              </div>
            ) : printLayout === 'idcard' ? (
              /* ID CARD OFFICIAL FORUM LAYOUT (2 Columns x N Rows on A4 sheet) */
              <div className="id-card-print-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 justify-items-center">
                {membersWithQr.map((student) => {
                  const studentSchool = sekolahList.find(s => s.id === student.sekolahId)?.namaSekolah || activeSchoolName;

                  return (
                    <div
                      key={student.id}
                      className="id-card-print-item relative flex flex-col items-center"
                    >
                      {/* Member ID Card in exact template */}
                      <MemberIdCard
                        key={`${student.id}-${previewSide}`}
                        member={student}
                        schoolName={studentSchool}
                        qrDataUrl={student.qrDataUrl}
                        showActions={false}
                        initialSide={previewSide}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT STICKER GRID LAYOUT */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {membersWithQr.map((student, idx) => {
                  const studentSchool = sekolahList.find(s => s.id === student.sekolahId)?.namaSekolah || activeSchoolName;

                  return (
                    <div
                      key={student.id}
                      className="bg-white border-2 border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col items-center justify-between relative overflow-hidden text-center"
                    >
                      <div className="w-full bg-slate-900 text-white py-1 px-2 rounded-xl text-center mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">MARCHING BAND</p>
                        <p className="text-[10px] font-bold truncate">{studentSchool}</p>
                      </div>

                      <div className="bg-white p-1.5 border border-slate-300 rounded-xl shadow-xs my-1">
                        {student.qrDataUrl ? (
                          <img
                            src={student.qrDataUrl}
                            alt={`QR ${student.nama}`}
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            QR Error
                          </div>
                        )}
                      </div>

                      <div className="w-full mt-1">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate uppercase" title={student.nama}>
                          {idx + 1}. {formatCardMemberName(student.nama, 18)}
                        </h4>
                        <div className="flex items-center justify-center text-[10px] font-bold text-slate-700 mt-0.5">
                          <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200 uppercase">
                            DIVISI {student.divisiNama || 'UMUM'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar (No Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Ukuran Kartu:</b> Sesuai standar ID Card fisik A4 ({printLayout === 'idcard' ? (pdfSides === 'duplex' ? 'Mode Bolak-Balik Presisi Flip Horisontal' : (pdfSides === 'back_only' ? 'Halaman Belakang Saja' : 'Halaman Depan Saja')) : 'Stiker QR Mini'}).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              disabled={isDownloadingPdf}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              onClick={handlePrint}
              disabled={membersWithQr.length === 0 || loadingQr || isDownloadingPdf}
              className="px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              title="Cetak langsung menggunakan printer fisik"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Printer</span>
            </button>

            <button
              onClick={handleDownloadBatchPdf}
              disabled={membersWithQr.length === 0 || loadingQr || isDownloadingPdf}
              className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Unduh seluruh kartu anggota dalam satu berkas PDF siap cetak"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>{isDownloadingPdf ? (pdfProgressText || 'Membuat PDF...') : `Unduh PDF (${membersWithQr.length} Kartu${printLayout === 'idcard' ? (pdfSides === 'duplex' ? ' • Bolak-Balik' : (pdfSides === 'back_only' ? ' • Belakang' : ' • Depan')) : ''})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
