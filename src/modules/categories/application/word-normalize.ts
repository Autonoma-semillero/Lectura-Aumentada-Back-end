/**
 * Normalización canónica de `word` para persistencia y unicidad
 * (`ux_word_cards_student_word` sobre el valor almacenado).
 */
export function normalizeWordForStorage(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  return collapsed.normalize('NFC').toLocaleLowerCase('es');
}

/** Primera letra (Unicode) en mayúsculas para `initial_letter`. */
export function initialLetterFromNormalizedWord(normalized: string): string {
  const chars = [...normalized];
  if (chars.length === 0) {
    throw new Error('normalized word is empty');
  }
  return chars[0].toLocaleUpperCase('es');
}
