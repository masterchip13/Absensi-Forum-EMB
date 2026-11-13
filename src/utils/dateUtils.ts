/**
 * Indonesian Month and Date Utilities
 */

export const BULAN_OPTIONS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const MONTH_SHORT_MAP: Record<string, string> = {
  'Januari': 'Jan',
  'Februari': 'Feb',
  'Maret': 'Mar',
  'April': 'Apr',
  'Mei': 'Mei',
  'Juni': 'Jun',
  'Juli': 'Jul',
  'Agustus': 'Ags',
  'September': 'Sep',
  'Oktober': 'Okt',
  'November': 'Nov',
  'Desember': 'Des'
};

/**
 * Returns the Indonesian name of the current ongoing month (e.g., "November", "Desember")
 */
export function getCurrentMonthName(): string {
  const monthIdx = new Date().getMonth(); // 0 = Januari, 10 = November
  return BULAN_OPTIONS[monthIdx] || 'Januari';
}

/**
 * Returns short abbreviation for a given month or current month
 */
export function getMonthShort(monthName?: string): string {
  const target = monthName || getCurrentMonthName();
  return MONTH_SHORT_MAP[target] || target.substring(0, 3);
}

/**
 * Returns local date string in YYYY-MM-DD format (no UTC shift)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD in local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Returns Indonesian month name from YYYY-MM-DD
 */
export function getMonthNameFromDateString(dateStr?: string): string {
  if (!dateStr) return getCurrentMonthName();
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 2 || !parts[1]) return getCurrentMonthName();
  return BULAN_OPTIONS[parts[1] - 1] || getCurrentMonthName();
}

/**
 * Formats YYYY-MM-DD into e.g. "Sabtu, 14 Nov 2026"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = parseLocalDate(dateStr);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}
