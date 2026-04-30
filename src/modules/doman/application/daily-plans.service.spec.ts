import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesService } from '../../categories/application/categories.service';
import { WORD_CARDS_REPOSITORY } from '../../categories/domain/constants/categories.tokens';
import {
  DAILY_PLANS_REPOSITORY,
  DOMAN_SESSION_CARDS_REPOSITORY,
  DOMAN_SESSIONS_REPOSITORY,
} from '../domain/constants/doman.tokens';
import { DailyPlansService } from './daily-plans.service';

describe('DailyPlansService', () => {
  const dailyPlansRepository = {
    findByStudentAndDateRange: jest.fn(),
    findById: jest.fn(),
    findByStudentAndPlanDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const sessionsRepository = {
    findByDailyPlanId: jest.fn(),
    deleteByDailyPlanId: jest.fn(),
    create: jest.fn(),
  };
  const sessionCardsRepository = {
    deleteBySessionIds: jest.fn(),
    createMany: jest.fn(),
  };
  const wordCardsRepository = {
    countWordCardsByCategoryForStudent: jest.fn(),
    listByStudentCategoryAndStatuses: jest.fn(),
  };
  const categoriesService = {
    findById: jest.fn(),
  };

  let service: DailyPlansService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DailyPlansService,
        { provide: DAILY_PLANS_REPOSITORY, useValue: dailyPlansRepository },
        { provide: DOMAN_SESSIONS_REPOSITORY, useValue: sessionsRepository },
        { provide: DOMAN_SESSION_CARDS_REPOSITORY, useValue: sessionCardsRepository },
        { provide: WORD_CARDS_REPOSITORY, useValue: wordCardsRepository },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();
    service = moduleRef.get(DailyPlansService);
  });

  it('list rechaza student_id inválido', async () => {
    await expect(
      service.list({ student_id: 'invalid', from: '2026-01-01', to: '2026-01-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
