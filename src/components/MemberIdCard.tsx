import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Anggota } from '../types';
import { Download, Printer, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High-res 300 DPI for physical printing
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
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
        Standard Indonesian Marching Band ID Card (Aspect Ratio ~1.49 matching template image 2528x1696)
      */}
      <div
        id={id}
        ref={cardRef}
        className="id-card-element relative w-[370px] h-[248px] sm:w-[420px] sm:h-[282px] rounded-xl shadow-xl overflow-hidden select-none print:shadow-none print:rounded-none"
        style={{
          boxSizing: 'border-box',
          backgroundImage: "url('/assets/aistudio/1793721342067_1292d0de.jpg')",
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        {/* ================= LEFT GOLD BOX FOR QR CODE ================= */}
        {/* 
          Template Box Coordinates:
          Left: 12.1%, Top: 28.4%, Width: 28.4%, Height: 42.3%
          Inner area: Left: 13.5%, Top: 30.2%, Width: 25.5%, Height: 38.5%
        */}
        <div className="absolute left-[13.6%] top-[30.2%] w-[25.5%] h-[38.7%] bg-white p-1 rounded-xs flex items-center justify-center overflow-hidden shadow-inner">
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

        {/* ================= RIGHT DETAILS: NAMA, SEKOLAH, DIVISI ================= */}
        {/*
          Seamless dark navy backdrop overlay to cleanly cover placeholder text and 
          display member data with gold/white typography
        */}
        <div className="absolute right-[5.5%] top-[27.5%] w-[52%] h-[47%] flex flex-col justify-center items-end text-right px-2.5 py-1 bg-gradient-to-l from-[#081226]/95 via-[#0b1834]/90 to-transparent rounded-lg">
          
          {/* NAMA ANGGOTA (Bold White Display Font) */}
          <div className="w-full text-right mb-1">
            <span
              className="font-sans font-black text-white text-[13.5px] sm:text-[15.5px] uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] line-clamp-1 block leading-tight"
              title={member.nama}
            >
              {formatCardMemberName(member.nama, 20)}
            </span>
            {member.nis && (
              <span className="text-[9px] sm:text-[10px] text-amber-300 font-mono tracking-widest font-bold opacity-90 block">
                NIS: {member.nis}
              </span>
            )}
          </div>

          {/* ASAL SEKOLAH (Gold Display Serif Font) */}
          <div className="w-full text-right mb-1">
            <p
              className="font-serif font-black text-[#f6d787] text-[11.5px] sm:text-[13.5px] uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight"
              title={schoolName}
            >
              {schoolName || 'SMPN 2 CIGOMBONG'}
            </p>
          </div>

          {/* DIVISI (Gold Display Serif Font) */}
          <div className="w-full text-right">
            <p className="font-serif font-bold text-[#e5be64] text-[10.5px] sm:text-[12px] uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate leading-tight">
              DIVISI {member.divisiNama || 'UMUM'} {member.kelas ? `• ${member.kelas}` : ''}
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
