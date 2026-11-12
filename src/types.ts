export type UserRole = 'admin' | 'pelatih' | 'asisten_pelatih';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  nip?: string;
  phone?: string;
  specialty?: string;
  active: boolean;
  avatarUrl?: string;
}

export interface Sekolah {
  id: string;
  pelatihId: string; // Pelatih Utama / Koordinator
  pelatihIds?: string[]; // Tim Pelatih Kolaborator (termasuk Pelatih Utama & Pelatih Mitra)
  namaSekolah: string;
  kepalaSekolah: string;
  nipKepalaSekolah?: string;
  tahunAjaran: string; // e.g. "2024/2025"
  alamat?: string;
}

// Helper: Cek apakah user adalah pelatih (utama atau kolaborator) di sekolah tersebut
export function isSchoolCoach(school: Sekolah | undefined | null, coachId: string | undefined | null): boolean {
  if (!school || !coachId) return false;
  if (school.pelatihId === coachId) return true;
  if (Array.isArray(school.pelatihIds) && school.pelatihIds.includes(coachId)) return true;
  return false;
}

// Helper: Ambil seluruh ID pelatih di sekolah tersebut
export function getSchoolCoachIds(school: Sekolah | undefined | null): string[] {
  if (!school) return [];
  const set = new Set<string>();
  if (school.pelatihId) set.add(school.pelatihId);
  if (Array.isArray(school.pelatihIds)) {
    school.pelatihIds.forEach(id => {
      if (id) set.add(id);
    });
  }
  return Array.from(set);
}

export interface Divisi {
  id: string;
  pelatihId: string;
  namaDivisi: string;
  deskripsi?: string;
}

export interface Anggota {
  id: string;
  pelatihId: string;
  sekolahId: string;
  nama: string;
  kelas: string;
  divisiNama: string;
  nis?: string;
  qrCodeData: string;
  signatureUrl?: string; // Data URL of drawn signature
  createdAt: string;
}

export interface JadwalLatihan {
  id: string;
  pelatihId: string;
  pelatihNama?: string;
  pelatih2Id?: string;
  pelatih2Nama?: string;
  sekolahId: string;
  sekolahNama?: string;
  hari?: string; // e.g., "Senin", "Rabu", "Sabtu"
  tanggal: string; // YYYY-MM-DD
  hariTanggalFormat?: string; // e.g., "Senin, 15 Ags 2026"
  jamMulai: string; // e.g., "15:00"
  jamSelesai: string; // e.g., "17:30"
  materiRencana?: string;
  lokasiLatihan?: string;
  status?: 'terjadwal' | 'berlangsung' | 'selesai' | 'dibatalkan';
  reminderEnabled: boolean;
  reminderMinutesBefore: number; // e.g. 15, 30, 60, 120
  absenPelatihId?: string; // Link to AbsenPelatihItem
  catatan?: string;
  createdAt?: string;
}

export interface AbsenPelatihItem {
  id: string;
  pelatihId: string;
  pelatihNama?: string;
  pelatih2Id?: string; // ID Pelatih ke-2 (Kolaborator / Pendamping)
  pelatih2Nama?: string; // Nama Pelatih ke-2
  sekolahId: string;
  tahunAjaran?: string; // e.g. "2024/2025"
  tanggal: string; // YYYY-MM-DD
  hariTanggalFormat: string; // e.g. "Senin, 12 Ags 2026"
  jamMulai: string;
  jamSelesai: string;
  materiPokok: string;
  pencapaianPercent: number; // 0 - 100
  fotoDokumentasiUrl: string; // Data URL or Image URL
  parafPelatihUrl?: string; // Tanda tangan Pelatih 1
  parafPelatih2Url?: string; // Tanda tangan Pelatih 2
  statusKepalaSekolah: 'Mengetahui' | 'Menunggu';
  catatan?: string;
  jadwalId?: string; // Link to JadwalLatihan
  // Status Verifikasi oleh Admin
  statusVerifikasiAdmin?: 'menunggu' | 'diverifikasi' | 'ditolak';
  diverifikasiOleh?: string;
  diverifikasiPada?: string;
  catatanAdmin?: string;
}

export interface AbsenAsistenPelatihItem {
  id: string;
  asistenId: string;
  asistenName: string;
  sekolahId: string;
  sekolahNama: string;
  tahunAjaran?: string; // e.g. "2024/2025"
  tanggal: string; // YYYY-MM-DD
  hariTanggalFormat: string; // e.g. "Senin, 15 Ags 2026"
  jamMulai: string;
  jamSelesai: string;
  statusKehadiran: 'Hadir' | 'Izin' | 'Sakit' | 'Tugas Luar';
  kegiatanPendampingan: string; // Deskripsi materi / tugas pendampingan
  divisiBinaan?: string; // e.g. "Percussion", "Brass", "Color Guard", "Pit Instrument", "Display Drill"
  fotoDokumentasiUrl?: string;
  parafAsistenUrl?: string;
  catatan?: string;
  createdAt?: string;
}

export interface EventLog {
  id: string;
  sekolahId: string;
  tanggal: string; // YYYY-MM-DD
  namaEvent: string;
  keterangan?: string;
  lokasi?: string;
  prestasi?: string;
  fotoUrl?: string;
  tahunAjaran?: string;
  createdByName?: string;
}

export interface AbsenSiswaEntry {
  id: string;
  sekolahId: string;
  anggotaId: string;
  bulan: string; // e.g., "Januari", "Agustus"
  tahunAjaran: string; // e.g. "2024/2025"
  kolomIndex: number; // 1 to 5 (represent practice dates in month)
  tanggal: string; // YYYY-MM-DD
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alfa';
  signatureUrl?: string;
}
