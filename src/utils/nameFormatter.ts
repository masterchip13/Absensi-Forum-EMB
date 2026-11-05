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

/**
 * Ubah format kelas yang menggunakan huruf/romawi menjadi angka dengan pembatas strip (-)
 * User requirement: "Ubah kelas yang menggunakan huruf menjadi angka dengan menggunakan pembatas strip"
 * 
 * Contoh:
 * - "VII A" / "VII-A" / "7A" / "7-A" -> "7-1"
 * - "VIII B" / "8B" / "8-B" -> "8-2"
 * - "IX C" / "9C" -> "9-3"
 * - "7D" -> "7-4"
 * - "VII.1" / "7 1" / "7-1" -> "7-1"
 */
export function formatKelasAngka(rawKelas?: string | null): string {
  if (!rawKelas) return '';
  let str = rawKelas.trim();
  if (!str) return '';

  // If already in number-number format (e.g. "7-1", "8-2", "9-10"), return as is
  if (/^\d+\s*[-]\s*\d+$/.test(str)) {
    return str.replace(/\s+/g, '');
  }

  // Remove prefixes like "Kelas", "Kls", "SMP", "SD", "Ruang"
  str = str.replace(/^(kelas|kls|smp|sd|ruang)\s+/i, '').trim();

  // Mapping Roman numerals to numbers (order descending so VIII before VII, etc.)
  const romanMap: [RegExp, string][] = [
    [/^XII\b/i, '12'],
    [/^XI\b/i, '11'],
    [/^X\b/i, '10'],
    [/^IX\b/i, '9'],
    [/^VIII\b/i, '8'],
    [/^VII\b/i, '7'],
    [/^VI\b/i, '6'],
    [/^V\b/i, '5'],
    [/^IV\b/i, '4'],
    [/^III\b/i, '3'],
    [/^II\b/i, '2'],
    [/^I\b/i, '1']
  ];

  for (const [pattern, num] of romanMap) {
    if (pattern.test(str)) {
      str = str.replace(pattern, num).trim();
      break;
    }
  }

  // Helper to convert letter to 1-based index (A -> 1, B -> 2, ..., J -> 10)
  const letterToNumber = (char: string): number => {
    const code = char.toUpperCase().charCodeAt(0);
    return code >= 65 && code <= 90 ? code - 64 : 0;
  };

  // Pattern 1: Number followed by letter (e.g. "7A", "7 A", "7-A", "7.A", "7/A", "7_A")
  const numLetterMatch = str.match(/^(\d+)\s*[-./_ ]*\s*([A-Za-z])$/);
  if (numLetterMatch) {
    const grade = numLetterMatch[1];
    const letter = numLetterMatch[2];
    const sectionNum = letterToNumber(letter);
    if (sectionNum > 0) {
      return `${grade}-${sectionNum}`;
    }
  }

  // Pattern 2: Number followed by number with separator other than strip (e.g. "7.1", "7 1", "7/1", "7_1")
  const numNumMatch = str.match(/^(\d+)\s*[-./_ ]\s*(\d+)$/);
  if (numNumMatch) {
    return `${numNumMatch[1]}-${numNumMatch[2]}`;
  }

  // Pattern 3: Letter followed by number (e.g. "A 7" or "A-7")
  const letterNumMatch = str.match(/^([A-Za-z])\s*[-./_ ]*\s*(\d+)$/);
  if (letterNumMatch) {
    const sectionNum = letterToNumber(letterNumMatch[1]);
    const grade = letterNumMatch[2];
    if (sectionNum > 0) {
      return `${grade}-${sectionNum}`;
    }
  }

  return str;
}

