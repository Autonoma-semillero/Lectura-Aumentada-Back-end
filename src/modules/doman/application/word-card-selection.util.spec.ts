import type { WordCardListed } from '../../categories/domain/interfaces/word-card-listed.interface';
import type { IWordCardsRepository } from '../../categories/domain/interfaces/word-cards.repository.interface';
import {
  resolveEligibleDomanCards,
  resolveStudyPlanCategoryCards,
  sortDomanCardsByPriority,
} from './word-card-selection.util';

describe('word-card-selection.util', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const otherStudentId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439021';
  const otherCategoryId = '507f1f77bcf86cd799439022';

  const wordCardsRepository = {
    findByIds: jest.fn(),
    listByStudentCategoryAndStatuses: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function repository(): IWordCardsRepository {
    return wordCardsRepository as unknown as IWordCardsRepository;
  }

  function buildCard(overrides: Partial<WordCardListed>): WordCardListed {
    return {
      id: '507f1f77bcf86cd799439031',
      student_id: studentId,
      category_id: categoryId,
      word: 'gato',
      initial_letter: 'G',
      status: 'active',
      times_shown: 0,
      created_at: new Date('2026-09-01T00:00:00.000Z'),
      updated_at: new Date('2026-09-01T00:00:00.000Z'),
      ...overrides,
    } as WordCardListed;
  }

  describe('sortDomanCardsByPriority', () => {
    it('ordena por estado, luego por exposiciones y luego alfabéticamente', () => {
      const cards = [
        buildCard({ id: 'a', word: 'zorro', status: 'completed' }),
        buildCard({ id: 'b', word: 'perro', status: 'active', times_shown: 7 }),
        buildCard({ id: 'c', word: 'ave', status: 'new' }),
        buildCard({ id: 'd', word: 'gato', status: 'active', times_shown: 2 }),
      ];

      expect(sortDomanCardsByPriority(cards).map((card) => card.id)).toEqual([
        'c',
        'd',
        'b',
        'a',
      ]);
    });

    it('no muta el arreglo recibido', () => {
      const cards = [
        buildCard({ id: 'a', status: 'completed' }),
        buildCard({ id: 'b', status: 'new' }),
      ];

      sortDomanCardsByPriority(cards);

      expect(cards.map((card) => card.id)).toEqual(['a', 'b']);
    });
  });

  describe('resolveEligibleDomanCards', () => {
    it('prioriza new/active y respeta el límite sin consultar completed', async () => {
      wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([
        buildCard({ id: 'muy-expuesta', times_shown: 9, status: 'active' }),
        buildCard({ id: 'nueva', status: 'new' }),
        buildCard({ id: 'poco-expuesta', times_shown: 1, status: 'active' }),
      ]);

      const cards = await resolveEligibleDomanCards(
        repository(),
        studentId,
        categoryId,
        2,
      );

      // El orden de prioridad decide QUÉ tarjetas entran, no solo cuántas.
      expect(cards.map((card) => card.id)).toEqual(['nueva', 'poco-expuesta']);
      expect(
        wordCardsRepository.listByStudentCategoryAndStatuses,
      ).toHaveBeenCalledTimes(1);
      expect(
        wordCardsRepository.listByStudentCategoryAndStatuses,
      ).toHaveBeenCalledWith(studentId, categoryId, ['new', 'active']);
    });

    it('cae a completed solo cuando new/active no alcanzan el límite', async () => {
      wordCardsRepository.listByStudentCategoryAndStatuses
        .mockResolvedValueOnce([buildCard({ id: 'activa', status: 'active' })])
        .mockResolvedValueOnce([
          buildCard({ id: 'completada', status: 'completed' }),
        ]);

      const cards = await resolveEligibleDomanCards(
        repository(),
        studentId,
        categoryId,
        3,
      );

      expect(cards.map((card) => card.id)).toEqual(['activa', 'completada']);
      expect(
        wordCardsRepository.listByStudentCategoryAndStatuses,
      ).toHaveBeenLastCalledWith(studentId, categoryId, ['completed']);
    });
  });

  describe('resolveStudyPlanCategoryCards', () => {
    it('aplica la regla v2 por target_cards_count', async () => {
      wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue([
        buildCard({ id: 'activa', times_shown: 4, status: 'active' }),
        buildCard({ id: 'nueva', status: 'new' }),
      ]);

      const cards = await resolveStudyPlanCategoryCards(
        repository(),
        { category_id: categoryId, target_cards_count: 1 },
        studentId,
      );

      expect(cards.map((card) => card.id)).toEqual(['nueva']);
    });

    it('usa el default cuando la categoría no define target_cards_count', async () => {
      wordCardsRepository.listByStudentCategoryAndStatuses.mockResolvedValue(
        [],
      );

      await resolveStudyPlanCategoryCards(
        repository(),
        { category_id: categoryId },
        studentId,
      );

      // Con 0 candidatos y límite 5 por defecto, debe intentar el fallback.
      expect(
        wordCardsRepository.listByStudentCategoryAndStatuses,
      ).toHaveBeenCalledTimes(2);
    });

    it('respeta la selección exacta legacy y descarta lo que no corresponde', async () => {
      wordCardsRepository.findByIds.mockResolvedValue([
        buildCard({ id: 'valida' }),
        buildCard({ id: 'de-otro-alumno', student_id: otherStudentId }),
        buildCard({ id: 'de-otra-tematica', category_id: otherCategoryId }),
        buildCard({ id: 'archivada', status: 'archived' }),
      ]);

      const cards = await resolveStudyPlanCategoryCards(
        repository(),
        {
          category_id: categoryId,
          word_card_ids: ['valida', 'de-otro-alumno'],
        },
        studentId,
      );

      expect(cards.map((card) => card.id)).toEqual(['valida']);
      expect(
        wordCardsRepository.listByStudentCategoryAndStatuses,
      ).not.toHaveBeenCalled();
    });

    it('normaliza el case del ObjectId al filtrar la selección legacy', async () => {
      wordCardsRepository.findByIds.mockResolvedValue([
        buildCard({
          id: 'valida',
          student_id: studentId.toUpperCase(),
          category_id: categoryId.toUpperCase(),
        }),
      ]);

      const cards = await resolveStudyPlanCategoryCards(
        repository(),
        { category_id: categoryId, word_card_ids: ['valida'] },
        studentId,
      );

      expect(cards.map((card) => card.id)).toEqual(['valida']);
    });
  });
});
