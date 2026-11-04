import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { Anggota } from '../types';
import { Download, Printer, Copy, Check } from 'lucide-react';
import { formatCardMemberName } from '../utils/nameFormatter';
import { renderMemberCardToCanvas, CARD_TEMPLATE_SRC } from '../utils/cardCanvasRenderer';

interface MemberIdCardProps {
  member: Anggota;
  schoolName: string;
  qrDataUrl: string;
  id?: string;
  showActions?: boolean;
  className?: string;
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({
  member,
  schoolName,
  qrDataUrl,
  id,
  showActions = false,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Template image path
  const templateSrc = CARD_TEMPLATE_SRC;

  // Dynamic text size calculation based on string length to ensure it fits the frame
  // User requirement: "Untuk nama yang terlalu panjang di kartu anggota, buat singkat akhirnya saja."
  const formattedName = formatCardMemberName(member.nama, 20);
  const nameLength = formattedName.length;

  const getNameFontSizeClass = () => {
    if (nameLength <= 14) return 'text-[19px] sm:text-[23px]';
    if (nameLength <= 20) return 'text-[16px] sm:text-[19px]';
    if (nameLength <= 26) return 'text-[14px] sm:text-[16px]';
    return 'text-[12px] sm:text-[14px]';
  };

  const schoolLength = (schoolName || '').length;
  const getSchoolFontSizeClass = () => {
    if (schoolLength <= 16) return 'text-[15px] sm:text-[18px]';
    if (schoolLength <= 24) return 'text-[13px] sm:text-[15.5px]';
    return 'text-[11.5px] sm:text-[13.5px]';
  };

  const divisiText = `DIVISI ${(member.divisiNama || 'UMUM').toUpperCase()}${member.kelas ? ` • ${member.kelas.toUpperCase()}` : ''}`;
  const divisiLength = divisiText.length;
  const getDivisiFontSizeClass = () => {
    if (divisiLength <= 18) return 'text-[13px] sm:text-[15.5px]';
    if (divisiLength <= 26) return 'text-[11.5px] sm:text-[13.5px]';
    return 'text-[10px] sm:text-[12px]';
  };

  /**
   * Ultra-Reliable High-Resolution Canvas Export Engine
   * Draws directly on a native 2528 x 1696 canvas to eliminate any CSS parsing or taint issues.
   * Produces an uncorrupted, crystal-clear 300-DPI physical print-grade PNG.
   */
  const handleDownloadPng = async () => {
    setDownloading(true);

    try {
      const canvas = await renderMemberCardToCanvas(member, schoolName, qrDataUrl);

      // Generate Safe Blob & Trigger Download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas blob generation failed');
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `KARTU_ANGGOTA_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setDownloading(false);
      }, 'image/png');

    } catch (err) {
      console.warn('Canvas direct engine failed, using html2canvas fallback:', err);
      // Fallback to html2canvas if canvas direct drawing encountered any issue
      if (cardRef.current) {
        try {
          const fallbackCanvas = await html2canvas(cardRef.current, {
            scale: 3,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#09132b',
            logging: false
          });
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
          }, 'image/png');
        } catch (fallbackErr) {
          console.error('All export engines failed:', fallbackErr);
          alert('Gagal mengunduh kartu. Silakan gunakan tombol Cetak Langsung.');
        }
      }
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
      {/* 
        ID CARD CONTAINER:
        Standard Indonesian Marching Band ID Card (Aspect Ratio 1.49 matching 2528x1696)
      */}
      <div
        id={id}
        ref={cardRef}
        className="id-card-element relative w-[370px] h-[248px] sm:w-[420px] sm:h-[282px] rounded-xl shadow-xl overflow-hidden select-none print:shadow-none print:rounded-none bg-[#09132b]"
        style={{
          boxSizing: 'border-box'
        }}
      >
        {/* Background Template Image */}
        <img
          src={templateSrc}
          alt="Template Kartu Anggota"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          crossOrigin="anonymous"
          loading="eager"
        />

        {/* ================= LEFT GOLD BOX FOR QR CODE ================= */}
        {/* 
          Template Box Coordinates:
          Left: 12.1%, Top: 28.4%, Width: 28.4%, Height: 42.3%
          Inner area: Left: 13.5%, Top: 30.2%, Width: 25.5%, Height: 38.7%
        */}
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
        {/*
          Clean, perfectly fitted text container on top of the emblem watermark.
          Carefully scaled typography to ensure everything sits harmoniously within the frame.
        */}
        <div className="absolute left-[38%] right-[4.5%] top-[18%] bottom-[27%] flex flex-col justify-center items-end text-right pr-2 sm:pr-3 z-10 pointer-events-none">
          
          {/* NAMA ANGGOTA (Bold White Display Font - Scaled to fit frame) */}
          <div className="w-full text-right mb-1">
            <span
              className={`font-sans font-black text-white ${getNameFontSizeClass()} uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] line-clamp-1 block leading-tight`}
              title={member.nama}
            >
              {formattedName}
            </span>
            {member.nis && (
              <span className="text-[9px] sm:text-[10px] text-amber-300 font-mono tracking-widest font-bold opacity-90 block mt-0.5">
                NIS: {member.nis}
              </span>
            )}
          </div>

          {/* ASAL SEKOLAH (Gold Display Serif Font - Scaled to fit frame) */}
          <div className="w-full text-right mb-1">
            <p
              className={`font-serif font-black text-[#f6d787] ${getSchoolFontSizeClass()} uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight`}
              title={schoolName}
            >
              {schoolName || 'SMPN 2 CIGOMBONG'}
            </p>
          </div>

          {/* DIVISI (Gold Display Serif Font - Scaled to fit frame) */}
          <div className="w-full text-right">
            <p className={`font-serif font-bold text-[#e5be64] ${getDivisiFontSizeClass()} uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight`}>
              {divisiText}
            </p>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS (if showActions is true) */}
      {showActions && (
        <div className="no-print mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Unduh Kartu Anggota format PNG Resolusi Tinggi (300 DPI) untuk dicetak fisik"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Memproses...' : 'Unduh Kartu PNG'}</span>
          </button>
          
          <button
            type="button"
            onClick={handlePrintSingle}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Langsung</span>
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
