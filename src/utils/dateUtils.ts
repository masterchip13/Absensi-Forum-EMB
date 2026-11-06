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
