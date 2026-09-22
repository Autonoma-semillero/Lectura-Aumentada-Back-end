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
 * Normaliza una palabra para comparación: recorta, descompone Unicode (NFKD)
 * y elimina diacríticos, pasa a minúsculas y colapsa espacios internos.
 *
 * Es la única fuente de verdad de esta regla: tanto la previsualización como
 * la generación real deben comparar palabras a través de esta función, o el
 * set de tarjetas resuelto podría divergir entre ambas.
 */
export function normalizeDomanWord(word: string): string {
  return word
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Resuelve una lista explícita de palabras pineadas a las tarjetas propias
 * de un estudiante en una categoría, comparando por `normalizeDomanWord`.
 *
 * A diferencia de `resolveEligibleDomanCards`, esto NO aplica la tiering por
 * estado (new/active antes que completed): una palabra pineada es una
 * selección explícita del docente, no un ranking, así que una tarjeta
 * `completed` pineada nunca debe descartarse silenciosamente. Solo se
 * excluyen las tarjetas `archived`.
 */
export async function resolveWordsForStudent(
  wordCardsRepository: IWordCardsRepository,
  words: string[],
  studentId: string,
  categoryId: string,
): Promise<{ cards: WordCardListed[]; unresolvedWords: string[] }> {
  const studentCards = await wordCardsRepository.listByStudentAndCategory(
    studentId,
    categoryId,
  );
  const eligibleCards = studentCards.filter(
    (card) => card.status !== 'archived',
  );
  const cardsByNormalizedWord = new Map<string, WordCardListed[]>();
  for (const card of eligibleCards) {
    const normalized = normalizeDomanWord(card.word);
    const existing = cardsByNormalizedWord.get(normalized) ?? [];
    existing.push(card);
    cardsByNormalizedWord.set(normalized, existing);
  }

  const resolvedCards: WordCardListed[] = [];
  const unresolvedWords: string[] = [];
  for (const word of words) {
    const matches = cardsByNormalizedWord.get(normalizeDomanWord(word));
    if (matches === undefined || matches.length === 0) {
      unresolvedWords.push(word);
      continue;
    }
    resolvedCards.push(...matches);
  }

  return {
    cards: sortDomanCardsByPriority(resolvedCards),
    unresolvedWords,
  };
}

/**
 * Resuelve las tarjetas de una categoría configurada en un nivel de plan de
 * estudio: respeta la selección exacta de los planes singleton legacy
 * (`word_card_ids`), luego la selección explícita por palabra
 * (`word_card_words`) y, si no, aplica la regla v2 por `target_cards_count`.
 *
 * Es el ÚNICO punto de entrada para esta resolución: tanto la generación
 * real de planes diarios como la previsualización administrativa deben
 * llamar a esta misma función exportada, para que ambas produzcan siempre
 * el mismo set de tarjetas.
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
  if (category.word_card_words !== undefined) {
    const { cards } = await resolveWordsForStudent(
      wordCardsRepository,
      category.word_card_words,
      studentId,
      category.category_id,
    );
    return cards;
  }
  return resolveEligibleDomanCards(
    wordCardsRepository,
    studentId,
    category.category_id,
    category.target_cards_count ?? DEFAULT_DAILY_PLAN_TARGET_CARDS,
  );
}
