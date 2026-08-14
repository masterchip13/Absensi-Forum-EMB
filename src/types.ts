export type UserRole = 'admin' | 'pelatih';

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
  pelatihId: string;
  namaSekolah: string;
  kepalaSekolah: string;
  nipKepalaSekolah?: string;
  tahunAjaran: string; // e.g. "2024/2025"
  alamat?: string;
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
  qrCodeData: string;
  signatureUrl?: string; // Data URL of drawn signature
  createdAt: string;
}

export interface JadwalLatihan {
  id: string;
  pelatihId: string;
  sekolahId: string;
  hari: string; // e.g., "Senin", "Rabu", "Sabtu"
  jamMulai: string; // e.g., "14:00"
  jamSelesai: string; // e.g., "16:30"
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

export interface AbsenPelatihItem {
  id: string;
  pelatihId: string;
  sekolahId: string;
  tahunAjaran?: string; // e.g. "2024/2025"
  tanggal: string; // YYYY-MM-DD
  hariTanggalFormat: string; // e.g. "Senin, 12 Ags 2026"
  jamMulai: string;
  jamSelesai: string;
  materiPokok: string;
  pencapaianPercent: number; // 0 - 100
  fotoDokumentasiUrl: string; // Data URL or Image URL
  parafPelatihUrl?: string;
  statusKepalaSekolah: 'Mengetahui' | 'Menunggu';
  catatan?: string;
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
