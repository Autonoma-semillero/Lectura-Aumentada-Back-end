import type { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';

const statusPriority = new Map<string, number>([
  ['new', 0],
  ['active', 1],
  ['completed', 2],
  ['archived', 3],
]);

export function sortDomanCardsByPriority(
  cards: WordCardListed[],
): WordCardListed[] {
  return [...cards].sort((left, right) => {
    const byStatus =
      (statusPriority.get(left.status) ?? 99) -
      (statusPriority.get(right.status) ?? 99);
    if (byStatus !== 0) {
      return byStatus;
    }
    if (left.times_shown !== right.times_shown) {
      return left.times_shown - right.times_shown;
    }
    return left.word.localeCompare(right.word, 'es');
  });
}
