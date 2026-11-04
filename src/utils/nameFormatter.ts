/**
 * Helper to format member name for ID Cards and QR Code prints.
 * User requirement: "Untuk nama yang terlalu panjang di kartu anggota, buat singkat akhirnya saja."
 * 
 * If the full name exceeds maxLen (default: 20 characters),
 * ONLY the trailing word(s) are abbreviated to their initial with a period.
 * The first/given name is NEVER abbreviated.
 * 
 * Examples:
 * - "Muhammad Rizky Pratama" -> "Muhammad Rizky P."
 * - "Ahmad Fauzi Nurhadi" -> "Ahmad Fauzi N."
 * - "Siti Nurhaliza Ramadhani" -> "Siti Nurhaliza R."
 * - "Muhammad Aliansyah Ramadhan Kusuma" -> "Muhammad Aliansyah R. K."
 */
export function formatCardMemberName(name?: string | null, maxLen: number = 20): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const words = cleaned.split(' ');

  // Auto capitalize each word into proper Title Case
  const formattedWords = words.map(w => {
    if (!w) return '';
    if (w.length === 1) return w.toUpperCase();
    if (w.includes('.')) {
      return w
        .split('.')
        .map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '')
        .join('.');
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  const fullFormatted = formattedWords.join(' ');
  // If length is within bounds or only one word, return full name
  if (fullFormatted.length <= maxLen || formattedWords.length <= 1) {
    return fullFormatted;
  }

  // Only abbreviate the trailing word(s). NEVER abbreviate the first name (index 0).
  const copy = [...formattedWords];
  const lastIndex = copy.length - 1;

  // 1. Abbreviate the very last word first: e.g. "Muhammad Rizky Pratama" -> "Muhammad Rizky P."
  const lastWord = copy[lastIndex];
  if (lastWord.length > 1 && !lastWord.endsWith('.')) {
    copy[lastIndex] = `${lastWord[0].toUpperCase()}.`;
  }

  if (copy.join(' ').length <= maxLen) {
    return copy.join(' ');
  }

  // 2. If still exceeds maxLen and there are 3+ words, abbreviate backwards from second-to-last word
  // Note: loop terminates at i >= 1, NEVER touching copy[0] (first name)!
  for (let i = lastIndex - 1; i >= 1; i--) {
    const word = copy[i];
    if (word.length > 1 && !word.endsWith('.')) {
      copy[i] = `${word[0].toUpperCase()}.`;
      if (copy.join(' ').length <= maxLen) {
        return copy.join(' ');
      }
    }
  }

  // Return result with only the end abbreviated, first name is guaranteed intact
  return copy.join(' ');
}

/**
 * Automatically format member name with proper Title Case capitalization for reports.
 * User requirement: "Untuk di laporan kegiatan, gunakan kapitalisasi otomatis nama anggotanya"
 * 
 * Examples:
 * - "MUHAMMAD RIZKY RAMADHAN" -> "Muhammad Rizky Ramadhan"
 * - "siti nurhaliza" -> "Siti Nurhaliza"
 * - "ahmad fauzi n." -> "Ahmad Fauzi N."
 * - "NUR-AFIFAH" -> "Nur-Afifah"
 */
export function formatNamaKapital(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Handle abbreviations like "M.", "S.Pd", "H."
      if (word.includes('.')) {
        return word
          .split('.')
          .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
          .join('.');
      }
      // Handle hyphenated names like "Nur-Ainun"
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
