import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Anggota } from '../types';
import { MarchingBandLogo } from './Logos';
import { Download, Printer, Check, Copy } from 'lucide-react';
import { formatCardMemberName } from '../utils/nameFormatter';

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

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High-res for clear physical printing (approx 300 DPI)
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const link = document.createElement('a');
      link.download = `KARTU_ANGGOTA_${member.nama.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Gagal mengekspor kartu ID:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintSingle = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 
        ID CARD CONTAINER:
        Standard Indonesian School ID Card Ratio (~85.6mm x 54mm or 1011x639px ratio)
      */}
      <div
        id={id}
        ref={cardRef}
        className="id-card-element relative w-[370px] h-[230px] sm:w-[420px] sm:h-[262px] bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-slate-800 print:rounded-none"
        style={{
          boxSizing: 'border-box'
        }}
      >
        {/* ================= TOP GEOMETRIC ACCENTS ================= */}
        <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10 overflow-hidden">
          {/* Top Left Orange Wedge */}
          <svg className="absolute top-0 left-0 w-36 sm:w-44 h-8" viewBox="0 0 160 32" fill="none">
            <polygon points="0,0 160,0 0,32" fill="#F59E0B" />
          </svg>
          {/* Top Right Dark Navy Blue Wedge */}
          <svg className="absolute top-0 right-0 w-64 sm:w-80 h-8" viewBox="0 0 300 32" fill="none">
            <polygon points="50,0 300,0 300,32 0,0" fill="#14116E" />
          </svg>
        </div>

        {/* ================= BOTTOM GEOMETRIC ACCENTS ================= */}
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-10 overflow-hidden">
          {/* Bottom Left Dark Navy Blue Wedge */}
          <svg className="absolute bottom-0 left-0 w-72 sm:w-88 h-8" viewBox="0 0 320 32" fill="none">
            <polygon points="0,0 260,32 0,32" fill="#14116E" />
          </svg>
          {/* Bottom Right Orange Wedge */}
          <svg className="absolute bottom-0 right-0 w-44 sm:w-56 h-8" viewBox="0 0 200 32" fill="none">
            <polygon points="40,32 200,32 200,6" fill="#F59E0B" />
          </svg>
        </div>

        {/* ================= WATERMARK EMBLEM IN BACKGROUND ================= */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.13] z-0">
          <div className="w-56 h-56 -ml-3">
            <MarchingBandLogo className="w-full h-full object-contain" />
          </div>
        </div>

        {/* ================= CARD MAIN CONTENT ================= */}
        <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-5 py-5">
          
          {/* LEFT SIDE: Vertical Navy Strip + Framed QR/Barcode Box */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Vertical Dark Navy Strip */}
            <div className="w-3 sm:w-3.5 h-[125px] sm:h-[145px] bg-[#14116E] rounded-md shadow-xs shrink-0" />

            {/* Square Barcode/QR Box with Orange Border */}
            <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-white rounded-xs border-[3.5px] sm:border-[4px] border-[#F5A623] shadow-xs flex items-center justify-center p-1.5 overflow-hidden">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${member.nama}`}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                  Memuat Barcode...
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Header + Nama Anggota + Asal Sekolah + Divisi */}
          <div className="flex-1 flex flex-col items-center justify-center text-center pl-3 sm:pl-4 space-y-1.5 sm:space-y-2 overflow-hidden">
            
            {/* Header: FORUM EKSTRAKURIKULER MARCHING BAND */}
            <div className="leading-tight">
              <h3 className="font-black text-slate-900 text-[11px] sm:text-[13px] uppercase tracking-wider">
                FORUM EKSTRAKURIKULER
              </h3>
              <h4 className="font-black text-slate-900 text-[12px] sm:text-[14px] uppercase tracking-widest -mt-0.5">
                MARCHING BAND
              </h4>
            </div>

            {/* NAMA ANGGOTA (Navy blue rounded pill container with bold white text) */}
            <div className="w-full max-w-[210px] sm:max-w-[230px] bg-[#14116E] text-white py-1 sm:py-1.5 px-3 rounded-lg shadow-sm flex items-center justify-center">
              <span className="font-black text-xs sm:text-[13.5px] uppercase tracking-wide truncate leading-tight" title={member.nama}>
                {formatCardMemberName(member.nama, 18)}
              </span>
            </div>

            {/* ASAL SEKOLAH (Bold Orange / Gold Text) */}
            <div className="w-full max-w-[210px] sm:max-w-[230px]">
              <p className="font-black text-[#F5A623] text-xs sm:text-[14px] uppercase tracking-wide truncate leading-tight">
                {schoolName || 'MARCHING BAND'}
              </p>
            </div>

            {/* DIVISI (Bold Dark Text) */}
            <div className="w-full max-w-[210px] sm:max-w-[230px] -mt-0.5">
              <p className="font-black text-slate-900 text-[11px] sm:text-[13px] uppercase tracking-wider truncate leading-tight">
                DIVISI {member.divisiNama || 'UMUM'} {member.kelas ? `• ${member.kelas}` : ''}
              </p>
            </div>
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
            title="Unduh Kartu Anggota format PNG Resolusi Tinggi untuk dicetak fisik"
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
        </div>
      )}
    </div>
  );
};
