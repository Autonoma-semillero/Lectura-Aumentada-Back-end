import type { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import type { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import type { DomanStudyPlanCategory } from '../domain/interfaces/doman-study-plan.interface';
import { DEFAULT_DAILY_PLAN_TARGET_CARDS } from '../domain/constants/doman-limits.constants';
import { isSameObjectId } from './doman-authorization.util';

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

/**
 * Selección canónica de tarjetas elegibles para una temática: prioriza
 * `new`/`active` y solo cae a `completed` cuando no alcanzan para el límite.
 *
 * Es la única fuente de verdad de esta regla. Tener dos copias hacía que la
 * previsualización de un plan de estudio mostrara un set distinto del que la
 * generación elegía realmente, porque una ordenaba por prioridad y la otra no.
 */
export async function resolveEligibleDomanCards(
  wordCardsRepository: IWordCardsRepository,
  studentId: string,
  categoryId: string,
  limit: number,
): Promise<WordCardListed[]> {
  const primary =
    await wordCardsRepository.listByStudentCategoryAndStatuses(
      studentId,
      categoryId,
      ['new', 'active'],
    );
  let candidates = primary;
  if (candidates.length < limit) {
    const completed =
      await wordCardsRepository.listByStudentCategoryAndStatuses(
        studentId,
        categoryId,
        ['completed'],
      );
    candidates = candidates.concat(completed);
  }
  return sortDomanCardsByPriority(candidates).slice(0, limit);
}

/**
 * Resuelve las tarjetas de una categoría configurada en un nivel de plan de
 * estudio: respeta la selección exacta de los planes singleton legacy
 * (`word_card_ids`) y, si no, aplica la regla v2 por `target_cards_count`.
 */
export async function resolveStudyPlanCategoryCards(
  wordCardsRepository: IWordCardsRepository,
  category: DomanStudyPlanCategory,
  studentId: string,
): Promise<WordCardListed[]> {
  if (category.word_card_ids !== undefined) {
    const cards = await wordCardsRepository.findByIds(category.word_card_ids);
    return cards.filter(
      (card) =>
        isSameObjectId(card.student_id, studentId) &&
        isSameObjectId(card.category_id ?? '', category.category_id) &&
        card.status !== 'archived',
    );
  }
  return resolveEligibleDomanCards(
    wordCardsRepository,
    studentId,
    category.category_id,
    category.target_cards_count ?? DEFAULT_DAILY_PLAN_TARGET_CARDS,
  );
}
