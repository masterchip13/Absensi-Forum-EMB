/**
 * Helper to format member name for ID Cards and QR Code prints.
 * If the full name exceeds maxLen (default: 18 characters),
 * the last name is automatically abbreviated to its initial with a period.
 * 
 * Examples:
 * - "Muhammad Rizky Pratama" -> "Muhammad Rizky P."
 * - "Ahmad Fauzi Nurhadi" -> "Ahmad Fauzi N."
 * - "Siti Nurhaliza Rahmadani" -> "Siti Nurhaliza R."
 */
export function formatCardMemberName(name: string, maxLen: number = 18): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) {
    return trimmed;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return trimmed;
  }

  // Copy parts array
  const partsCopy = [...parts];
  const lastIdx = partsCopy.length - 1;
  const lastWord = partsCopy[lastIdx];

  // Abbreviate last name to initial
  if (lastWord.length > 1) {
    partsCopy[lastIdx] = `${lastWord[0].toUpperCase()}.`;
  }

  const resultWithLastAbbr = partsCopy.join(' ');
  if (resultWithLastAbbr.length <= maxLen) {
    return resultWithLastAbbr;
  }

  // If still too long and has >= 3 words, abbreviate previous middle names from right to left
  for (let i = lastIdx - 1; i >= 1; i--) {
    const word = partsCopy[i];
    if (word.length > 1 && !word.endsWith('.')) {
      partsCopy[i] = `${word[0].toUpperCase()}.`;
      const attempt = partsCopy.join(' ');
      if (attempt.length <= maxLen) {
        return attempt;
      }
    }
  }

  // If still exceeds maxLen, abbreviate first name as well
  if (partsCopy[0].length > 1) {
    partsCopy[0] = `${partsCopy[0][0].toUpperCase()}.`;
    const attemptFirst = partsCopy.join(' ');
    if (attemptFirst.length <= maxLen) {
      return attemptFirst;
    }
  }

  return partsCopy.join(' ');
}
