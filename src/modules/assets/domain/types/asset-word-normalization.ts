export const MAX_ASSET_WORD_LENGTH = 64;

/**
 * Canonical form used to match a word detected by OCR.
 *
 * Case and accent marks are ignored, while the Spanish letter `ñ` remains
 * distinct from `n` to avoid assigning a model to a different word.
 */
export function normalizeAssetWord(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('es-CO')
    .normalize('NFKD')
    .replace(/n\u0303/gu, 'ñ')
    .replace(/\p{Mark}+/gu, '')
    .normalize('NFC');
}
