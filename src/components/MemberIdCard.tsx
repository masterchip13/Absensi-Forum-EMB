import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Anggota } from '../types';
import { MarchingBandLogo } from './Logos';
import { Download, Printer } from 'lucide-react';

interface MemberIdCardProps {
  member: Anggota;
  schoolName: string;
  qrDataUrl: string;
  id?: string;
  showActions?: boolean;
  scale?: number;
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

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High-res 300 DPI equivalent for print
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `ID-CARD-${member.nama.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export ID card PNG', err);
    }
  };

  const handlePrintSingle = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* CARD ROOT: Standard ID Card Proportion (Landscape 85.6mm x 54mm or 1.58:1 ratio) */}
      <div
        id={id}
        ref={cardRef}
        className="relative w-[360px] h-[225px] sm:w-[400px] sm:h-[250px] bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-slate-800"
        style={{
          boxSizing: 'border-box'
        }}
      >
        {/* TOP DECORATIVE GEOMETRIC ACCENTS (Orange Triangle Left + Navy Wedge Right) */}
        <div className="absolute top-0 left-0 right-0 h-7 pointer-events-none z-10 overflow-hidden">
          {/* Top Left Orange Triangle */}
          <svg className="absolute top-0 left-0 w-36 h-7" viewBox="0 0 144 28" fill="none">
            <polygon points="0,0 144,0 0,28" fill="#F59E0B" />
          </svg>
          {/* Top Right Dark Navy Wedge */}
          <svg className="absolute top-0 right-0 w-64 h-7" viewBox="0 0 256 28" fill="none">
            <polygon points="40,0 256,0 256,28 0,0" fill="#1A1687" />
          </svg>
        </div>

        {/* BOTTOM DECORATIVE GEOMETRIC ACCENTS (Navy Wedge Left + Orange Triangle Right) */}
        <div className="absolute bottom-0 left-0 right-0 h-7 pointer-events-none z-10 overflow-hidden">
          {/* Bottom Left Dark Navy Wedge */}
          <svg className="absolute bottom-0 left-0 w-64 h-7" viewBox="0 0 256 28" fill="none">
            <polygon points="0,0 0,28 256,28 216,28" fill="#1A1687" />
            <polygon points="0,0 220,28 0,28" fill="#1A1687" />
          </svg>
          {/* Bottom Right Orange Triangle */}
          <svg className="absolute bottom-0 right-0 w-44 h-7" viewBox="0 0 176 28" fill="none">
            <polygon points="32,28 176,28 176,6" fill="#F59E0B" />
          </svg>
        </div>

        {/* BACKGROUND WATERMARK EMBLEM (Centered Forum Logo with Opacity) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] z-0">
          <div className="w-56 h-56 -ml-4">
            <MarchingBandLogo className="w-full h-full object-contain" />
          </div>
        </div>

        {/* CARD CONTENT LAYER (Two Columns: Left QR + Right Student Info) */}
        <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-5 py-6">
          
          {/* LEFT SECTION: Dark Blue Strip + Framed Barcode Box */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Vertical Dark Blue Strip */}
            <div className="w-3 sm:w-3.5 h-[120px] sm:h-[135px] bg-[#1A1687] rounded-full shadow-xs shrink-0" />

            {/* Square Barcode/QR Box with Orange Border */}
            <div className="w-[115px] h-[115px] sm:w-[130px] sm:h-[130px] bg-white rounded-xs border-[3.5px] sm:border-[4px] border-[#F5A623] shadow-xs flex items-center justify-center p-1.5 overflow-hidden">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${member.nama}`}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                  QR Code
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: Header + Member Name Pill + School + Division */}
          <div className="flex-1 flex flex-col items-center justify-center text-center pl-3 sm:pl-4 space-y-1.5 sm:space-y-2">
            
            {/* Header Title */}
            <div className="leading-tight">
              <h3 className="font-black text-slate-900 text-[11px] sm:text-[12.5px] uppercase tracking-wider">
                FORUM EKSTRAKURIKULER
              </h3>
              <h4 className="font-black text-slate-900 text-[12px] sm:text-[13.5px] uppercase tracking-widest -mt-0.5">
                MARCHING BAND
              </h4>
            </div>

            {/* Member Name Pill (Dark Navy Blue Container with White Text) */}
            <div className="w-full max-w-[210px] bg-[#1A1687] text-white py-1 sm:py-1.5 px-2.5 rounded-lg shadow-sm flex items-center justify-center">
              <span className="font-black text-xs sm:text-[13px] uppercase tracking-wide truncate leading-tight">
                {member.nama}
              </span>
            </div>

            {/* School Name (Bold Orange / Gold Text) */}
            <div className="w-full max-w-[210px]">
              <p className="font-black text-[#F5A623] text-xs sm:text-[13.5px] uppercase tracking-wide truncate leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                {schoolName || 'MARCHING BAND'}
              </p>
            </div>

            {/* Division Text (Bold Dark Text) */}
            <div className="w-full max-w-[210px] -mt-0.5">
              <p className="font-black text-slate-900 text-[11px] sm:text-[12.5px] uppercase tracking-wider truncate leading-tight">
                DIVISI {member.divisiNama || 'UMUM'} {member.kelas ? `• ${member.kelas}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons if requested */}
      {showActions && (
        <div className="no-print mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
            title="Unduh ID Card Siap Cetak (Format Gambar PNG Resolusi Tinggi)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Gambar ID Card</span>
          </button>
          <button
            type="button"
            onClick={handlePrintSingle}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kartu</span>
          </button>
        </div>
      )}
    </div>
  );
};
