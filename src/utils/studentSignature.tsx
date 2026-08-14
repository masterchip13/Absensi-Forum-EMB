import React from 'react';

// Generates a consistent numeric hash from a string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// 12 realistic handwritten cursive signature paths (strokes)
const SIGNATURE_PRESETS = [
  // 0: Classic loop initial with wavy cursive line and underline flourish
  {
    viewBox: '0 0 160 55',
    path1: 'M 10 38 C 18 12, 28 8, 36 28 C 42 42, 48 48, 56 24 C 62 14, 70 18, 78 32 C 85 42, 94 30, 104 22 C 114 15, 126 28, 138 24',
    path2: 'M 22 44 C 55 52, 95 50, 146 42',
    dot: { cx: 148, cy: 38, r: 1.8 }
  },
  // 1: Sharp dynamic initial (A / M style) with rhythmic peaks and sweep
  {
    viewBox: '0 0 160 55',
    path1: 'M 12 42 L 24 10 L 38 40 L 50 18 C 58 32, 68 38, 80 20 C 90 8, 100 28, 112 22 C 122 18, 134 32, 144 26',
    path2: 'M 18 36 C 50 48, 102 46, 142 38',
    dot: { cx: 145, cy: 26, r: 1.6 }
  },
  // 2: Tall rounded loop with smooth flowing script and tail
  {
    viewBox: '0 0 160 55',
    path1: 'M 14 30 C 12 10, 32 6, 38 26 C 42 44, 52 38, 60 22 C 68 12, 76 34, 86 24 C 95 16, 108 28, 120 18 C 130 12, 140 24, 148 20',
    path2: 'M 30 46 C 65 52, 110 50, 148 44',
    dot: { cx: 150, cy: 40, r: 1.8 }
  },
  // 3: Quick flick initial with double loop and bottom sweep
  {
    viewBox: '0 0 160 55',
    path1: 'M 16 44 C 20 20, 30 12, 42 22 C 50 30, 54 44, 64 26 C 72 15, 82 20, 92 36 C 100 45, 114 26, 128 20 C 138 16, 146 28, 150 24',
    path2: 'M 14 38 C 48 50, 96 52, 144 42',
    dot: null
  },
  // 4: Fluid S / R curve with wide cursive connection
  {
    viewBox: '0 0 160 55',
    path1: 'M 14 22 C 22 8, 38 12, 34 28 C 30 42, 44 46, 54 28 C 62 16, 72 20, 82 35 C 90 44, 102 24, 115 18 C 125 14, 138 26, 146 22',
    path2: 'M 25 45 C 60 53, 105 50, 146 40',
    dot: { cx: 148, cy: 22, r: 1.7 }
  },
  // 5: Calligraphic arch with sharp oscillation and end flourish
  {
    viewBox: '0 0 160 55',
    path1: 'M 10 40 C 22 14, 32 10, 44 26 C 52 38, 62 16, 74 24 C 84 32, 94 18, 106 22 C 118 28, 128 14, 140 20 C 146 24, 150 20, 152 18',
    path2: 'M 35 44 C 70 54, 115 50, 148 42',
    dot: { cx: 153, cy: 38, r: 1.5 }
  },
  // 6: High ascender with compact rhythmic oscillations
  {
    viewBox: '0 0 160 55',
    path1: 'M 15 45 C 18 16, 26 8, 35 25 C 42 40, 50 20, 60 22 C 70 25, 78 38, 88 20 C 98 12, 110 30, 122 20 C 132 14, 142 26, 148 22',
    path2: 'M 20 40 C 58 52, 104 52, 148 44',
    dot: { cx: 150, cy: 44, r: 1.9 }
  },
  // 7: Sweeping monogram style with fast cursive waves
  {
    viewBox: '0 0 160 55',
    path1: 'M 12 36 C 24 10, 36 12, 45 30 C 52 44, 65 24, 76 22 C 86 20, 96 36, 108 26 C 118 18, 130 28, 142 22',
    path2: 'M 15 48 C 55 54, 100 50, 145 38',
    dot: null
  },
  // 8: Compact formal cursive with distinct start and confident underline
  {
    viewBox: '0 0 160 55',
    path1: 'M 14 34 C 18 14, 30 10, 40 25 C 48 38, 56 42, 66 22 C 74 12, 84 26, 95 30 C 105 34, 116 18, 128 22 C 138 26, 145 18, 150 22',
    path2: 'M 28 46 C 68 53, 112 50, 148 40',
    dot: { cx: 152, cy: 22, r: 1.8 }
  },
  // 9: Expressive dynamic signature with loop and underline
  {
    viewBox: '0 0 160 55',
    path1: 'M 10 32 C 16 8, 28 6, 38 22 C 46 36, 55 46, 68 24 C 78 12, 88 28, 100 20 C 112 14, 124 30, 136 22 C 144 18, 148 24, 152 20',
    path2: 'M 18 42 C 55 50, 105 52, 146 44',
    dot: { cx: 148, cy: 40, r: 1.6 }
  },
  // 10: Smooth fountain pen signature with graceful ascender
  {
    viewBox: '0 0 160 55',
    path1: 'M 12 44 C 16 18, 26 12, 38 26 C 46 38, 56 16, 68 20 C 78 24, 88 40, 100 22 C 110 14, 122 30, 134 20 C 142 16, 148 24, 152 22',
    path2: 'M 22 46 C 60 54, 108 52, 148 42',
    dot: { cx: 151, cy: 38, r: 1.8 }
  },
  // 11: Freehand rapid signature with confident cursive cadence
  {
    viewBox: '0 0 160 55',
    path1: 'M 14 38 C 22 12, 32 10, 42 28 C 50 42, 60 22, 70 24 C 80 26, 90 38, 102 20 C 112 12, 126 28, 138 22 C 144 18, 148 26, 152 24',
    path2: 'M 16 46 C 54 54, 102 52, 148 44',
    dot: { cx: 152, cy: 24, r: 1.6 }
  }
];

// Realistic dark wet blue ink colors
const INK_COLORS = [
  '#00247d', // Deep Royal Blue
  '#002b88', // Classic Ballpoint Blue
  '#001f68', // Midnight Navy Blue
  '#003399', // Rich Blue
  '#0a2366', // Deep Ink Blue
  '#002882'  // Dark Sapphire Blue
];

/**
 * Returns deterministic signature preset & color for student and column
 */
export function getStudentSignatureStyle(studentName: string, columnOrMeetingIndex: number) {
  const hash = hashCode(`${studentName || 'siswa'}_col_${columnOrMeetingIndex}`);
  const presetIndex = hash % SIGNATURE_PRESETS.length;
  const colorIndex = (hash >> 3) % INK_COLORS.length;
  const rotationDeg = ((hash % 7) - 3) * 0.8; // -2.4deg to +2.4deg natural tilt

  return {
    preset: SIGNATURE_PRESETS[presetIndex],
    color: INK_COLORS[colorIndex],
    rotation: rotationDeg
  };
}

/**
 * React Component that renders authentic wet-ink cursive student signature
 */
export const StudentWetSignature: React.FC<{
  studentName: string;
  columnIndex?: number;
  customSignatureUrl?: string;
  className?: string;
  maxWidth?: string;
  height?: string;
}> = ({
  studentName,
  columnIndex = 1,
  customSignatureUrl,
  className = '',
  maxWidth = '38px',
  height = '14px'
}) => {
  // If student has explicit custom drawn signature, use it
  if (customSignatureUrl && customSignatureUrl.startsWith('data:image')) {
    return (
      <div className={`w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
        <img
          src={customSignatureUrl}
          alt={`TTD ${studentName}`}
          className="object-contain mx-auto"
          style={{ maxHeight: height, maxWidth: maxWidth || '95%' }}
        />
      </div>
    );
  }

  const { preset, color, rotation } = getStudentSignatureStyle(studentName, columnIndex);

  return (
    <div
      className={`w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0.2px 0.2px 0px rgba(0,25,100,0.3))'
      }}
      title={`Tanda Tangan Basah ${studentName}`}
    >
      <svg
        viewBox={preset.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto object-contain mx-auto block"
        style={{ maxHeight: height, maxWidth: maxWidth || '95%' }}
      >
        <path
          d={preset.path1}
          fill="none"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {preset.path2 && (
          <path
            d={preset.path2}
            fill="none"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {preset.dot && (
          <circle
            cx={preset.dot.cx}
            cy={preset.dot.cy}
            r={preset.dot.r}
            fill={color}
          />
        )}
      </svg>
    </div>
  );
};

/**
 * Helper to generate data URL SVG for exports (Word / Print canvas)
 */
export function getStudentSignatureDataUrl(studentName: string, columnIndex = 1): string {
  const { preset, color, rotation } = getStudentSignatureStyle(studentName, columnIndex);
  const dotSvg = preset.dot ? `<circle cx="${preset.dot.cx}" cy="${preset.dot.cy}" r="${preset.dot.r}" fill="${color}" />` : '';
  const path2Svg = preset.path2 ? `<path d="${preset.path2}" fill="none" stroke="${color}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" />` : '';

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${preset.viewBox}" width="90" height="32">
      <g transform="rotate(${rotation} 80 27)">
        <path d="${preset.path1}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        ${path2Svg}
        ${dotSvg}
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}
