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

  // Template image path
  const templateSrc = '/assets/aistudio/1793747874998_a8c50b8e.jpg';

  // Dynamic text size calculation based on string length to ensure it fits the frame
  const formattedName = formatCardMemberName(member.nama, 28);
  const nameLength = formattedName.length;

  const getNameFontSizeClass = () => {
    if (nameLength <= 14) return 'text-[15px] sm:text-[17px]';
    if (nameLength <= 20) return 'text-[13px] sm:text-[14.5px]';
    if (nameLength <= 26) return 'text-[11.5px] sm:text-[13px]';
    return 'text-[10px] sm:text-[11.5px]';
  };

  const schoolLength = (schoolName || '').length;
  const getSchoolFontSizeClass = () => {
    if (schoolLength <= 16) return 'text-[12px] sm:text-[14px]';
    if (schoolLength <= 24) return 'text-[10.5px] sm:text-[12px]';
    return 'text-[9.5px] sm:text-[10.5px]';
  };

  const divisiText = `DIVISI ${(member.divisiNama || 'UMUM').toUpperCase()}${member.kelas ? ` • ${member.kelas.toUpperCase()}` : ''}`;
  const divisiLength = divisiText.length;
  const getDivisiFontSizeClass = () => {
    if (divisiLength <= 18) return 'text-[10.5px] sm:text-[12px]';
    if (divisiLength <= 26) return 'text-[9.5px] sm:text-[10.5px]';
    return 'text-[8.5px] sm:text-[9.5px]';
  };

  /**
   * Ultra-Reliable High-Resolution Canvas Export Engine
   * Draws directly on a native 2528 x 1696 canvas to eliminate any CSS parsing or taint issues.
   * Produces an uncorrupted, crystal-clear 300-DPI physical print-grade PNG.
   */
  const handleDownloadPng = async () => {
    setDownloading(true);

    try {
      // 1. Create native off-screen canvas at full template resolution (2528 x 1696)
      const canvas = document.createElement('canvas');
      canvas.width = 2528;
      canvas.height = 1696;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // 2. Load background template image cleanly
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => reject(new Error('Failed to load card template'));
        bgImg.src = templateSrc;
      });

      // Draw background template
      ctx.drawImage(bgImg, 0, 0, 2528, 1696);

      // 3. Draw QR code inside the golden double-line box on the left
      // Coordinates on 2528x1696: Box is X=306..1024, Y=482..1200
      // Inner QR area: X=342, Y=512, Width=646, Height=656
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => resolve(); // continue even if QR fails
          qrImg.src = qrDataUrl;
        });

        // Crisp white rounded background pad for QR
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(342, 512, 646, 656, 12) : ctx.rect(342, 512, 646, 656);
        ctx.fill();

        // Draw QR code with 24px inner padding
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, 366, 536, 598, 608);
      }

      // 4. Render Member Details on the Right Frame
      // Available width between QR box (1024) and right edge filigree (~2280): 1180px
      const maxAvailableWidth = 1150;
      const rightX = 2270;

      // Helper function to dynamically scale down font size until text strictly fits inside maxAvailableWidth
      const fitFontSize = (text: string, maxW: number, startSize: number, minSize: number, fontFace: string, weight = '900') => {
        let size = startSize;
        ctx.font = `${weight} ${size}px ${fontFace}`;
        while (ctx.measureText(text).width > maxW && size > minSize) {
          size -= 2;
          ctx.font = `${weight} ${size}px ${fontFace}`;
        }
        return size;
      };

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Setup drop shadow for high contrast & luxury gold filigree appearance
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 4;

      const hasNis = !!member.nis;
      const nameY = hasNis ? 560 : 600;
      const schoolY = 760;
      const divisiY = 920;

      // NAMA ANGGOTA (Bold White Sans-Serif)
      const nameText = formattedName.toUpperCase();
      const calculatedNameFontSize = fitFontSize(
        nameText,
        maxAvailableWidth,
        nameLength > 20 ? 68 : 84,
        42,
        '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        '900'
      );
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(nameText, rightX, nameY);

      // Optional NIS
      if (hasNis) {
        ctx.fillStyle = '#FCD34D';
        ctx.font = '700 42px monospace';
        ctx.fillText(`NIS: ${member.nis}`, rightX, 645);
      }

      // ASAL SEKOLAH (Gold Display Serif)
      const schoolText = (schoolName || 'MARCHING BAND').toUpperCase();
      const calculatedSchoolFontSize = fitFontSize(
        schoolText,
        maxAvailableWidth,
        schoolText.length > 22 ? 52 : 64,
        38,
        '"Times New Roman", Georgia, serif',
        '900'
      );
      ctx.fillStyle = '#F6D787';
      ctx.fillText(schoolText, rightX, schoolY);

      // DIVISI (Gold Display Serif)
      const calculatedDivisiFontSize = fitFontSize(
        divisiText,
        maxAvailableWidth,
        divisiText.length > 24 ? 44 : 54,
        34,
        '"Times New Roman", Georgia, serif',
        '700'
      );
      ctx.fillStyle = '#E5BE64';
      ctx.fillText(divisiText, rightX, divisiY);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // 5. Generate Safe Blob & Trigger Download
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
        <div className="absolute left-[42%] right-[5%] top-[20%] bottom-[28%] flex flex-col justify-center items-end text-right pr-2 sm:pr-3 z-10 pointer-events-none">
          
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
