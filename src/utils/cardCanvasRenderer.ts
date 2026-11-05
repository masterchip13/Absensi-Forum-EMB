import { Anggota } from '../types';
import { formatCardMemberName } from './nameFormatter';

export const CARD_TEMPLATE_SRC = '/assets/aistudio/1793747874998_a8c50b8e.jpg';
export const CARD_WIDTH = 2528;
export const CARD_HEIGHT = 1696;

/**
 * Preloads an image into an HTMLImageElement
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image from ${src}: ${e}`));
    img.src = src;
  });
}

/**
 * Renders a physical print-grade (300 DPI, 2528x1696) member card to an off-screen HTMLCanvasElement.
 * Highly optimized for single download as well as batch PDF generation.
 */
export async function renderMemberCardToCanvas(
  member: Anggota,
  schoolName: string,
  qrDataUrl?: string,
  preloadedBg?: HTMLImageElement
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Load Background Template
  const bgImg = preloadedBg || await preloadImage(CARD_TEMPLATE_SRC);
  ctx.drawImage(bgImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 2. Draw QR code inside the golden double-line box on the left
  // Box coordinates on 2528x1696: Box is X=306..1024, Y=482..1200
  // Inner QR area: X=342, Y=512, Width=646, Height=656
  if (qrDataUrl) {
    try {
      const qrImg = await preloadImage(qrDataUrl);

      // Crisp white rounded background pad for QR
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(342, 512, 646, 656, 12);
      } else {
        ctx.rect(342, 512, 646, 656);
      }
      ctx.fill();

      // Draw QR code with inner padding
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, 366, 536, 598, 608);
      ctx.imageSmoothingEnabled = true;
    } catch {
      // Continue even if QR fails
    }
  }

  // 3. Render Member Details on the Right Frame (Center-Aligned & Leveled with Left QR Box)
  // Left QR box center is at Y=840 (Y=512..1168).
  // Right frame bounds: X=1120..2320 -> Horizontal center is X=1720.
  const maxAvailableWidth = 1160;
  const centerX = 1720;

  // Format member name: If too long (> 20 chars), ONLY abbreviate the end of the name
  const formattedName = formatCardMemberName(member.nama, 20);
  const nameLength = formattedName.length;

  const fitFontSize = (text: string, maxW: number, startSize: number, minSize: number, fontFace: string, weight = '900') => {
    let size = startSize;
    ctx.font = `${weight} ${size}px ${fontFace}`;
    while (ctx.measureText(text).width > maxW && size > minSize) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${fontFace}`;
    }
    return size;
  };

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Drop shadow for luxury contrast
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  const hasNis = !!member.nis;
  const nameY = hasNis ? 660 : 700;
  const schoolY = hasNis ? 860 : 850;
  const divisiY = 980;

  // NAMA ANGGOTA (Bold White Sans-Serif - Rata Tengah)
  const nameText = formattedName.toUpperCase();
  fitFontSize(
    nameText,
    maxAvailableWidth,
    nameLength > 18 ? 88 : 108,
    46,
    '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    '900'
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameText, centerX, nameY);

  // Optional NIS
  if (hasNis) {
    ctx.fillStyle = '#FCD34D';
    ctx.font = '700 44px monospace';
    ctx.fillText(`NIS: ${member.nis}`, centerX, 745);
  }

  // ASAL SEKOLAH (Gold Display Serif - Rata Tengah)
  const schoolText = (schoolName || 'MARCHING BAND').toUpperCase();
  fitFontSize(
    schoolText,
    maxAvailableWidth,
    schoolText.length > 22 ? 68 : 82,
    40,
    '"Times New Roman", Georgia, serif',
    '900'
  );
  ctx.fillStyle = '#F6D787';
  ctx.fillText(schoolText, centerX, schoolY);

  // DIVISI (Gold Display Serif - Rata Tengah)
  const divisiText = `DIVISI ${(member.divisiNama || 'UMUM').toUpperCase()}`;
  fitFontSize(
    divisiText,
    maxAvailableWidth,
    divisiText.length > 24 ? 58 : 70,
    36,
    '"Times New Roman", Georgia, serif',
    '700'
  );
  ctx.fillStyle = '#E5BE64';
  ctx.fillText(divisiText, centerX, divisiY);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  return canvas;
}
