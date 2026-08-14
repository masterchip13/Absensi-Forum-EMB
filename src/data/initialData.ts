import { User, Sekolah, Divisi, Anggota, JadwalLatihan, AbsenPelatihItem, EventLog, AbsenSiswaEntry } from '../types';

// Helper for quick sample signature canvas base64
function createSampleSignature(nameText: string, color = '#1E3A8A'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
    <path d="M 20 50 Q 40 10, 60 50 T 100 40 T 140 60 T 180 30" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 30 65 C 70 70, 110 55, 170 65" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <text x="150" y="72" font-family="cursive, sans-serif" font-size="10" fill="${color}">${nameText}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Sample photo for documentation
export const SAMPLE_DOC_PHOTO = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="#1E293B"/>
  <rect x="20" y="20" width="360" height="210" fill="#334155" rx="8"/>
  <circle cx="200" cy="110" r="45" fill="#3B82F6" opacity="0.3"/>
  <path d="M 120 180 C 160 130, 240 130, 280 180 Z" fill="#60A5FA" opacity="0.5"/>
  <text x="200" y="115" font-family="sans-serif" font-size="16" fill="#F8FAFC" font-weight="bold" text-anchor="middle">Dokumentasi Latihan Regular</text>
  <text x="200" y="140" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">Marching Band Field Session</text>
  <rect x="30" y="30" width="80" height="24" fill="#0EA5E9" rx="12"/>
  <text x="70" y="46" font-family="sans-serif" font-size="10" fill="#FFFFFF" text-anchor="middle">Bukti Foto</text>
</svg>
`)));

export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    name: 'Administrator Forum',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    phone: '081234567890',
    active: true,
  }
];

export const INITIAL_SEKOLAH: Sekolah[] = [];

export const INITIAL_DIVISI: Divisi[] = [];

export const INITIAL_JADWAL: JadwalLatihan[] = [];

export const INITIAL_ANGGOTA: Anggota[] = [];

export const INITIAL_ABSEN_PELATIH: AbsenPelatihItem[] = [];

export const INITIAL_EVENTS: EventLog[] = [];

export const INITIAL_ABSEN_SISWA: AbsenSiswaEntry[] = [];

