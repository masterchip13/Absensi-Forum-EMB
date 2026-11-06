import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { Anggota } from '../types';
import { Download, Printer, Copy, Check, RotateCw, FileText } from 'lucide-react';
import { formatCardMemberName } from '../utils/nameFormatter';
import {
  renderMemberCardToCanvas,
  renderMemberCardBackToCanvas,
  CARD_TEMPLATE_SRC,
  CARD_BACK_TEMPLATE_SRC
} from '../utils/cardCanvasRenderer';
import jsPDF from 'jspdf';

interface MemberIdCardProps {
  member: Anggota;
  schoolName: string;
  qrDataUrl: string;
  id?: string;
  showActions?: boolean;
  className?: string;
  initialSide?: 'front' | 'back';
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({
  member,
  schoolName,
  qrDataUrl,
  id,
  showActions = false,
  className = '',
  initialSide = 'front'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>(initialSide);

  // Template image paths
  const frontTemplateSrc = CARD_TEMPLATE_SRC;
  const backTemplateSrc = CARD_BACK_TEMPLATE_SRC;

  // Dynamic text size calculation based on string length to ensure it fits the frame
  // User requirement: "Untuk nama yang terlalu panjang di kartu anggota, buat singkat akhirnya saja."
  const formattedName = formatCardMemberName(member.nama, 20);
  const nameLength = formattedName.length;

  const getNameFontSizeClass = () => {
    if (nameLength <= 12) return 'text-[17px] sm:text-[21px]';
    if (nameLength <= 18) return 'text-[15px] sm:text-[18px]';
    if (nameLength <= 24) return 'text-[13px] sm:text-[15.5px]';
    return 'text-[11.5px] sm:text-[13.5px]';
  };

  const schoolLength = (schoolName || '').length;
  const getSchoolFontSizeClass = () => {
    if (schoolLength <= 18) return 'text-[13px] sm:text-[15.5px]';
    if (schoolLength <= 26) return 'text-[11.5px] sm:text-[13.5px]';
    return 'text-[10px] sm:text-[12px]';
  };

  // User requirement: "Hilangkan kelas di kartu anggota"
  const divisiText = `DIVISI ${(member.divisiNama || 'UMUM').toUpperCase()}`;
  const divisiLength = divisiText.length;
  const getDivisiFontSizeClass = () => {
    if (divisiLength <= 18) return 'text-[12px] sm:text-[14px]';
    if (divisiLength <= 26) return 'text-[10.5px] sm:text-[12.5px]';
    return 'text-[9.5px] sm:text-[11px]';
  };

  /**
   * Ultra-Reliable High-Resolution Canvas Export Engine for Front PNG (300 DPI, 2528 x 1696)
   */
  const handleDownloadFrontPng = async () => {
    setDownloading(true);

    try {
      const canvas = await renderMemberCardToCanvas(member, schoolName, qrDataUrl);

      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas blob generation failed');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `KARTU_DEPAN_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setDownloading(false);
      }, 'image/png');
    } catch (err) {
      console.warn('Direct canvas front engine failed, using fallback:', err);
      fallbackDownloadPng();
    }
  };

  /**
   * High-Resolution Canvas Export Engine for Back PNG (300 DPI, 2528 x 1696)
   */
  const handleDownloadBackPng = async () => {
    setDownloading(true);

    try {
      const canvas = await renderMemberCardBackToCanvas();

      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas blob generation failed');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `KARTU_BELAKANG_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setDownloading(false);
      }, 'image/png');
    } catch (err) {
      console.error('Back canvas export failed:', err);
      alert('Gagal mengunduh halaman belakang.');
      setDownloading(false);
    }
  };

  /**
   * One-Click PDF Downloader with Both Front and Back Sides (Bolak-Balik Siap Cetak Fisik)
   */
  const handleDownloadSinglePdf = async () => {
    setDownloadingPdf(true);

    try {
      // Create landscape PDF matching ID card standard ratio 85.6mm x 54mm or CR80 card
      const cardW = 90;
      const cardH = 60.38;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardW, cardH]
      });

      // Render Front Canvas
      const frontCanvas = await renderMemberCardToCanvas(member, schoolName, qrDataUrl);
      const frontDataUrl = frontCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(frontDataUrl, 'JPEG', 0, 0, cardW, cardH);

      // Add Page 2: Back Side Canvas
      pdf.addPage([cardW, cardH], 'landscape');
      const backCanvas = await renderMemberCardBackToCanvas();
      const backDataUrl = backCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(backDataUrl, 'JPEG', 0, 0, cardW, cardH);

      // Download PDF
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.download = `KARTU_ID_BOLAK_BALIK_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.pdf`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadingPdf(false);
    } catch (err) {
      console.error('Failed to generate single card PDF:', err);
      alert('Gagal membuat file PDF kartu. Silakan unduh format PNG.');
      setDownloadingPdf(false);
    }
  };

  const fallbackDownloadPng = () => {
    if (cardRef.current) {
      html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#09132b',
        logging: false
      }).then((fallbackCanvas) => {
        fallbackCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `KARTU_ANGGOTA_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }
          setDownloading(false);
        }, 'image/png');
      }).catch(() => setDownloading(false));
    } else {
      setDownloading(false);
    }
  };

  const handlePrintSingle = () => {
    window.print();
  };

  const handleCopyCode = () => {
    const code = member.qrCodeData || `FMB-${member.sekolahId}-${member.id}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Front / Back Toggle Pill */}
      {showActions && (
        <div className="no-print mb-2.5 flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => setCurrentSide('front')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              currentSide === 'front'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Tampak Depan (QR & Nama)</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentSide('back')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              currentSide === 'back'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Tampak Belakang (Logo)</span>
          </button>
        </div>
      )}

      {/* 
        ID CARD CONTAINER:
        Standard Indonesian Marching Band ID Card (Aspect Ratio 1.49 matching 2528x1696)
      */}
      <div
        id={id}
        ref={cardRef}
        className="id-card-element relative w-[370px] h-[248px] sm:w-[420px] sm:h-[282px] rounded-xl shadow-xl overflow-hidden select-none print:shadow-none print:rounded-none bg-[#09132b] transition-all"
        style={{
          boxSizing: 'border-box'
        }}
      >
        {currentSide === 'front' ? (
          <>
            {/* Background Template Image Front */}
            <img
              src={frontTemplateSrc}
              alt="Template Depan Kartu Anggota"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              crossOrigin="anonymous"
              loading="eager"
            />

            {/* ================= LEFT GOLD BOX FOR QR CODE ================= */}
            <div className="absolute left-[13.6%] top-[30.2%] w-[25.5%] h-[38.7%] bg-white p-1 rounded-xs flex items-center justify-center overflow-hidden shadow-inner z-10">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${member.nama}`}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                  Memuat QR...
                </div>
              )}
            </div>

            {/* ================= RIGHT DETAILS: NAMA, ASAL SEKOLAH, DIVISI ================= */}
            <div className="absolute left-[41%] right-[5%] top-[26%] bottom-[28%] flex flex-col justify-center items-center text-center px-1 z-10 pointer-events-none">
              {/* NAMA ANGGOTA (Bold White Display Font - Rata Tengah & Sejajar Kotak) */}
              <div className="w-full text-center mb-1">
                <span
                  className={`font-sans font-black text-white ${getNameFontSizeClass()} uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] line-clamp-1 block leading-tight`}
                  title={member.nama}
                >
                  {formattedName}
                </span>
                {member.nis && (
                  <span className="text-[9px] sm:text-[10px] text-amber-300 font-mono tracking-widest font-bold opacity-90 block mt-0.5 text-center">
                    NIS: {member.nis}
                  </span>
                )}
              </div>

              {/* ASAL SEKOLAH (Gold Display Serif Font - Rata Tengah) */}
              <div className="w-full text-center mb-1">
                <p
                  className={`font-serif font-black text-[#f6d787] ${getSchoolFontSizeClass()} uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight`}
                  title={schoolName}
                >
                  {schoolName || 'SMPN 2 CIGOMBONG'}
                </p>
              </div>

              {/* DIVISI (Gold Display Serif Font - Rata Tengah) */}
              <div className="w-full text-center">
                <p className={`font-serif font-bold text-[#e5be64] ${getDivisiFontSizeClass()} uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight`}>
                  {divisiText}
                </p>
              </div>
            </div>
          </>
        ) : (
          /* ================= BACK SIDE TEMPLATE ================= */
          <div className="relative w-full h-full">
            <img
              src={backTemplateSrc}
              alt="Template Belakang Kartu Anggota - Gita Pesona Nusantara"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              crossOrigin="anonymous"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* ACTION CONTROLS (if showActions is true) */}
      {showActions && (
        <div className="no-print mt-3 flex flex-wrap items-center justify-center gap-2">
          {/* One-click PDF with both sides */}
          <button
            type="button"
            onClick={handleDownloadSinglePdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Unduh Kartu ID PDF 2 Halaman (Depan & Belakang) siap cetak fisik bolak-balik"
          >
            <FileText className="w-4 h-4" />
            <span>{downloadingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF (Depan & Belakang)'}</span>
          </button>

          {/* Download PNG for current side */}
          {currentSide === 'front' ? (
            <button
              type="button"
              onClick={handleDownloadFrontPng}
              disabled={downloading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
              title="Unduh Kartu Anggota Depan format PNG Resolusi Tinggi (300 DPI)"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Memproses...' : 'Unduh PNG Depan'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadBackPng}
              disabled={downloading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
              title="Unduh Kartu Anggota Belakang format PNG Resolusi Tinggi (300 DPI)"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Memproses...' : 'Unduh PNG Belakang'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintSingle}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Printer</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Salin kode Barcode / QR ID Anggota"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
