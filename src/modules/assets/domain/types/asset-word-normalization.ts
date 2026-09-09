export const MAX_ASSET_WORD_LENGTH = 64;
export const MIN_FUZZY_ASSET_WORD_LENGTH = 3;

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

/**
 * Computes the Levenshtein edit distance between two normalized OCR words.
 * Array.from keeps the comparison based on Unicode code points instead of
 * UTF-16 code units.
 */
export function assetWordLevenshteinDistance(
  left: string,
  right: string,
): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);

  let previousRow = rightCharacters.map((_, index) => index + 1);
  previousRow.unshift(0);

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    const currentRow = [leftIndex + 1];
    for (
      let rightIndex = 0;
      rightIndex < rightCharacters.length;
      rightIndex += 1
    ) {
      const insertion = currentRow[rightIndex] + 1;
      const deletion = previousRow[rightIndex + 1] + 1;
      const substitution =
        previousRow[rightIndex] +
        (leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1);
      currentRow.push(Math.min(insertion, deletion, substitution));
    }
    previousRow = currentRow;
  }

  return previousRow[rightCharacters.length];
}
