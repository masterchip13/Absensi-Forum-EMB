import React from 'react';

// SVG rendered Tut Wuri Handayani Official Emblem
export const TutWuriLogo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <path id="tutWuriTextArc" d="M 60,225 A 210,210 0 0,1 440,225" />
    </defs>

    {/* Outer Pentagon Shield (Dark Outline) */}
    <path
      d="M 250,10 L 485,175 L 395,465 Q 250,488 105,465 L 15,175 Z"
      fill="#231F20"
    />

    {/* White Gap Inner Shield */}
    <path
      d="M 250,22 L 472,180 L 387,455 Q 250,476 113,455 L 28,180 Z"
      fill="#FFFFFF"
    />

    {/* Dark Line Inner Shield */}
    <path
      d="M 250,28 L 465,183 L 382,450 Q 250,470 118,450 L 35,183 Z"
      fill="#231F20"
    />

    {/* Main Sky-Blue / Cyan Shield Background */}
    <path
      d="M 250,38 L 454,187 L 374,442 Q 250,460 126,442 L 46,187 Z"
      fill="#00A2E8"
    />

    {/* Curved Text "TUT WURI HANDAYANI" */}
    <text fill="#231F20" fontSize="35" fontWeight="900" fontFamily="sans-serif" letterSpacing="4">
      <textPath href="#tutWuriTextArc" startOffset="50%" textAnchor="middle">
        TUT WURI HANDAYANI
      </textPath>
    </text>

    {/* Central Garuda Wings, Tail, Belencong & Flame, Open Book */}
    <g stroke="#231F20" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      {/* Tail Feathers (Ekor) */}
      <path
        d="M 250,120 L 250,230 M 225,135 L 235,235 M 275,135 L 265,235 M 200,150 L 220,240 M 300,150 L 280,240"
        fill="#FFFFFF"
      />
      <path
        d="M 185,160 C 200,135 220,120 250,118 C 280,120 300,135 315,160 C 315,160 300,150 280,150 C 265,135 235,135 220,150 C 200,150 185,160 185,160 Z"
        fill="#FFFFFF"
      />

      {/* Left Wing */}
      <path
        d="M 240,260 C 180,200 130,220 90,260 C 130,300 160,330 220,380 L 240,360 Z"
        fill="#FFFFFF"
      />
      <path d="M 115,235 C 100,250 90,270 95,290 C 120,285 145,280 180,310 C 210,335 225,365 235,385" fill="#FFFFFF" />
      <path d="M 105,295 C 115,320 140,335 175,345 C 200,352 220,380 230,388" fill="#FFFFFF" />
      <path d="M 130,345 C 150,360 180,370 215,392" fill="#FFFFFF" />

      {/* Right Wing */}
      <path
        d="M 260,260 C 320,200 370,220 410,260 C 370,300 340,330 280,380 L 260,360 Z"
        fill="#FFFFFF"
      />
      <path d="M 385,235 C 400,250 410,270 405,290 C 380,285 355,280 320,310 C 290,335 275,365 265,385" fill="#FFFFFF" />
      <path d="M 395,295 C 385,320 360,335 325,345 C 300,352 280,380 270,388" fill="#FFFFFF" />
      <path d="M 370,345 C 350,360 320,370 285,392" fill="#FFFFFF" />

      {/* Belencong Body */}
      <path
        d="M 250,215 C 240,230 240,260 245,280 C 235,300 235,340 242,395 L 258,395 C 265,340 265,300 255,280 C 260,260 260,230 250,215 Z"
        fill="#FFFFFF"
      />

      {/* Red Flame */}
      <path
        d="M 250,295 C 230,315 220,340 238,360 C 250,372 260,360 262,360 C 280,340 270,315 250,295 Z"
        fill="#E31E24"
      />

      {/* Open Book Pedestal */}
      <path
        d="M 160,400 Q 250,420 250,395 Q 250,420 340,400 L 332,430 Q 250,450 250,425 Q 250,450 168,430 Z"
        fill="#FFFFFF"
      />
    </g>
  </svg>
);

// SVG rendered Forum Ekstrakurikuler Marching Band Official Emblem
export const MarchingBandLogo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Curved text path for top banner */}
      <path id="topTextArc" d="M 55,250 A 195,195 0 0,1 445,250" />
      {/* Curved text path for bottom banner */}
      <path id="bottomTextArc" d="M 445,250 A 195,195 0 0,1 55,250" />
    </defs>

    {/* Outer background circle */}
    <circle cx="250" cy="250" r="242" fill="#0B132B" stroke="#080D1F" strokeWidth="4" />

    {/* Outer Gold Ring */}
    <circle cx="250" cy="250" r="232" fill="none" stroke="#EAB308" strokeWidth="9" />

    {/* Outer Dark Navy Band Inner Border */}
    <circle cx="250" cy="250" r="172" fill="none" stroke="#EAB308" strokeWidth="7" />

    {/* Inner Dark Navy Circle */}
    <circle cx="250" cy="250" r="168" fill="#0B122A" />

    {/* Top Text: FORUM EKSTRAKURIKULER */}
    <text fill="#FFFFFF" fontSize="27" fontWeight="bold" letterSpacing="4" fontFamily="Georgia, 'Times New Roman', serif">
      <textPath href="#topTextArc" startOffset="50%" textAnchor="middle">
        FORUM EKSTRAKURIKULER
      </textPath>
    </text>

    {/* Bottom Text: MARCHING BAND */}
    <text fill="#FFFFFF" fontSize="29" fontWeight="bold" letterSpacing="5" fontFamily="Georgia, 'Times New Roman', serif">
      <textPath href="#bottomTextArc" startOffset="50%" textAnchor="middle">
        MARCHING BAND
      </textPath>
    </text>

    {/* Left Laurel Wreath */}
    <g fill="#EAB308">
      <path d="M 82,190 C 70,175 52,180 50,195 C 65,195 78,192 82,190 Z" />
      <path d="M 85,210 C 68,205 52,220 54,235 C 70,228 82,218 85,210 Z" />
      <path d="M 90,235 C 72,238 60,258 65,272 C 80,260 88,248 90,235 Z" />
      <path d="M 100,260 C 82,270 75,292 82,305 C 95,290 100,275 100,260 Z" />
      <path d="M 115,285 C 98,300 95,322 105,335 C 115,318 118,300 115,285 Z" />
      <path d="M 125,168 C 110,155 92,160 90,175 C 105,175 120,170 125,168 Z" />
      <path d="M 105,178 C 95,165 80,165 76,178 C 90,180 100,180 105,178 Z" />
    </g>

    {/* Right Laurel Wreath */}
    <g fill="#EAB308">
      <path d="M 418,190 C 430,175 448,180 450,195 C 435,195 422,192 418,190 Z" />
      <path d="M 415,210 C 432,205 448,220 446,235 C 430,228 418,218 415,210 Z" />
      <path d="M 410,235 C 428,238 440,258 435,272 C 420,260 412,248 410,235 Z" />
      <path d="M 400,260 C 418,270 425,292 418,305 C 405,290 400,275 400,260 Z" />
      <path d="M 385,285 C 402,300 405,322 395,335 C 385,318 382,300 385,285 Z" />
      <path d="M 375,168 C 390,155 408,160 410,175 C 395,175 380,170 375,168 Z" />
      <path d="M 395,178 C 405,165 420,165 424,178 C 410,180 400,180 395,178 Z" />
    </g>

    {/* Two Gold Stars at top of inner circle */}
    <g fill="#EAB308">
      <polygon points="222,130 227,143 241,143 230,152 234,166 222,157 210,166 214,152 203,143 217,143" />
      <polygon points="278,130 283,143 297,143 286,152 290,166 278,157 266,166 270,152 259,143 273,143" />
    </g>

    {/* Crossed Drumsticks */}
    <g stroke="#000000" strokeWidth="8" strokeLinecap="round">
      <line x1="172" y1="170" x2="328" y2="248" stroke="#FFFFFF" />
      <line x1="328" y1="170" x2="172" y2="248" stroke="#FFFFFF" />
    </g>
    <g stroke="#000000" strokeWidth="3" fill="#FFFFFF">
      <circle cx="172" cy="170" r="9" />
      <circle cx="328" cy="170" r="9" />
    </g>

    {/* Snare Drum in Center */}
    <g>
      <path
        d="M 160,230 L 160,320 C 160,350 340,350 340,320 L 340,230 Z"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <ellipse cx="250" cy="230" rx="90" ry="32" fill="#FFFFFF" stroke="#000000" strokeWidth="10" />
      <ellipse cx="250" cy="320" rx="90" ry="32" fill="none" stroke="#000000" strokeWidth="12" />
      <ellipse cx="250" cy="230" rx="90" ry="32" fill="none" stroke="#000000" strokeWidth="12" />
      <line x1="162" y1="230" x2="162" y2="320" stroke="#000000" strokeWidth="9" />
      <line x1="206" y1="245" x2="206" y2="335" stroke="#000000" strokeWidth="9" />
      <line x1="250" y1="250" x2="250" y2="340" stroke="#000000" strokeWidth="9" />
      <line x1="294" y1="245" x2="294" y2="335" stroke="#000000" strokeWidth="9" />
      <line x1="338" y1="230" x2="338" y2="320" stroke="#000000" strokeWidth="9" />
      <rect x="156" y="270" width="12" height="12" rx="2" fill="#000000" />
      <rect x="200" y="282" width="12" height="12" rx="2" fill="#000000" />
      <rect x="244" y="287" width="12" height="12" rx="2" fill="#000000" />
      <rect x="288" y="282" width="12" height="12" rx="2" fill="#000000" />
      <rect x="332" y="270" width="12" height="12" rx="2" fill="#000000" />
    </g>
  </svg>
);

// Helper function to render SVG to Data URL for Canvas/PDF
export function getLogoDataUrl(logoType: 'tutwuri' | 'marching'): string {
  if (logoType === 'tutwuri') {
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 500 500">
      <defs>
        <path id="tutWuriTextArc" d="M 60,225 A 210,210 0 0,1 440,225" />
      </defs>
      <path d="M 250,10 L 485,175 L 395,465 Q 250,488 105,465 L 15,175 Z" fill="#231F20" />
      <path d="M 250,22 L 472,180 L 387,455 Q 250,476 113,455 L 28,180 Z" fill="#FFFFFF" />
      <path d="M 250,28 L 465,183 L 382,450 Q 250,470 118,450 L 35,183 Z" fill="#231F20" />
      <path d="M 250,38 L 454,187 L 374,442 Q 250,460 126,442 L 46,187 Z" fill="#00A2E8" />
      <text fill="#231F20" font-size="35" font-weight="900" font-family="sans-serif" letter-spacing="4">
        <textPath href="#tutWuriTextArc" startOffset="50%" text-anchor="middle">TUT WURI HANDAYANI</textPath>
      </text>
      <g stroke="#231F20" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 250,120 L 250,230 M 225,135 L 235,235 M 275,135 L 265,235 M 200,150 L 220,240 M 300,150 L 280,240" fill="#FFFFFF" />
        <path d="M 185,160 C 200,135 220,120 250,118 C 280,120 300,135 315,160 C 315,160 300,150 280,150 C 265,135 235,135 220,150 C 200,150 185,160 185,160 Z" fill="#FFFFFF" />
        <path d="M 240,260 C 180,200 130,220 90,260 C 130,300 160,330 220,380 L 240,360 Z" fill="#FFFFFF" />
        <path d="M 115,235 C 100,250 90,270 95,290 C 120,285 145,280 180,310 C 210,335 225,365 235,385" fill="#FFFFFF" />
        <path d="M 105,295 C 115,320 140,335 175,345 C 200,352 220,380 230,388" fill="#FFFFFF" />
        <path d="M 130,345 C 150,360 180,370 215,392" fill="#FFFFFF" />
        <path d="M 260,260 C 320,200 370,220 410,260 C 370,300 340,330 280,380 L 260,360 Z" fill="#FFFFFF" />
        <path d="M 385,235 C 400,250 410,270 405,290 C 380,285 355,280 320,310 C 290,335 275,365 265,385" fill="#FFFFFF" />
        <path d="M 395,295 C 385,320 360,335 325,345 C 300,352 280,380 270,388" fill="#FFFFFF" />
        <path d="M 370,345 C 350,360 320,370 285,392" fill="#FFFFFF" />
        <path d="M 250,215 C 240,230 240,260 245,280 C 235,300 235,340 242,395 L 258,395 C 265,340 265,300 255,280 C 260,260 260,230 250,215 Z" fill="#FFFFFF" />
        <path d="M 250,295 C 230,315 220,340 238,360 C 250,372 260,360 262,360 C 280,340 270,315 250,295 Z" fill="#E31E24" />
        <path d="M 160,400 Q 250,420 250,395 Q 250,420 340,400 L 332,430 Q 250,450 250,425 Q 250,450 168,430 Z" fill="#FFFFFF" />
      </g>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  } else {
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 500 500">
      <defs>
        <path id="topTextArc" d="M 55,250 A 195,195 0 0,1 445,250" />
        <path id="bottomTextArc" d="M 445,250 A 195,195 0 0,1 55,250" />
      </defs>
      <circle cx="250" cy="250" r="242" fill="#0B132B" stroke="#080D1F" stroke-width="4" />
      <circle cx="250" cy="250" r="232" fill="none" stroke="#EAB308" stroke-width="9" />
      <circle cx="250" cy="250" r="172" fill="none" stroke="#EAB308" stroke-width="7" />
      <circle cx="250" cy="250" r="168" fill="#0B122A" />
      <text fill="#FFFFFF" font-size="27" font-weight="bold" letter-spacing="4" font-family="sans-serif">
        <textPath href="#topTextArc" startOffset="50%" text-anchor="middle">FORUM EKSTRAKURIKULER</textPath>
      </text>
      <text fill="#FFFFFF" font-size="29" font-weight="bold" letter-spacing="5" font-family="sans-serif">
        <textPath href="#bottomTextArc" startOffset="50%" text-anchor="middle">MARCHING BAND</textPath>
      </text>
      <g fill="#EAB308">
        <path d="M 82,190 C 70,175 52,180 50,195 C 65,195 78,192 82,190 Z" />
        <path d="M 85,210 C 68,205 52,220 54,235 C 70,228 82,218 85,210 Z" />
        <path d="M 90,235 C 72,238 60,258 65,272 C 80,260 88,248 90,235 Z" />
        <path d="M 100,260 C 82,270 75,292 82,305 C 95,290 100,275 100,260 Z" />
        <path d="M 115,285 C 98,300 95,322 105,335 C 115,318 118,300 115,285 Z" />
        <path d="M 418,190 C 430,175 448,180 450,195 C 435,195 422,192 418,190 Z" />
        <path d="M 415,210 C 432,205 448,220 446,235 C 430,228 418,218 415,210 Z" />
        <path d="M 410,235 C 428,238 440,258 435,272 C 420,260 412,248 410,235 Z" />
        <path d="M 400,260 C 418,270 425,292 418,305 C 405,290 400,275 400,260 Z" />
        <polygon points="222,130 227,143 241,143 230,152 234,166 222,157 210,166 214,152 203,143 217,143" />
        <polygon points="278,130 283,143 297,143 286,152 290,166 278,157 266,166 270,152 259,143 273,143" />
      </g>
      <g stroke="#000000" stroke-width="8" stroke-linecap="round">
        <line x1="172" y1="170" x2="328" y2="248" stroke="#FFFFFF" />
        <line x1="328" y1="170" x2="172" y2="248" stroke="#FFFFFF" />
      </g>
      <g stroke="#000000" stroke-width="3" fill="#FFFFFF">
        <circle cx="172" cy="170" r="9" />
        <circle cx="328" cy="170" r="9" />
      </g>
      <g>
        <path d="M 160,230 L 160,320 C 160,350 340,350 340,320 L 340,230 Z" fill="#FFFFFF" stroke="#000000" stroke-width="10" stroke-linejoin="round" />
        <ellipse cx="250" cy="230" rx="90" ry="32" fill="#FFFFFF" stroke="#000000" stroke-width="10" />
        <ellipse cx="250" cy="320" rx="90" ry="32" fill="none" stroke="#000000" stroke-width="12" />
        <ellipse cx="250" cy="230" rx="90" ry="32" fill="none" stroke="#000000" stroke-width="12" />
        <line x1="162" y1="230" x2="162" y2="320" stroke="#000000" stroke-width="9" />
        <line x1="206" y1="245" x2="206" y2="335" stroke="#000000" stroke-width="9" />
        <line x1="250" y1="250" x2="250" y2="340" stroke="#000000" stroke-width="9" />
        <line x1="294" y1="245" x2="294" y2="335" stroke="#000000" stroke-width="9" />
        <line x1="338" y1="230" x2="338" y2="320" stroke="#000000" stroke-width="9" />
      </g>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  }
}
