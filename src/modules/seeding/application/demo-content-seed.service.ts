import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEMO_CONTENT_SEED_REPOSITORY } from '../domain/constants/seeding.tokens';
import { IDemoContentSeedRepository } from '../domain/interfaces/demo-content-seed.repository.interface';
import {
  initialLetterFromNormalizedWord,
  normalizeWordForStorage,
} from '../../categories/application/word-normalize';

type DemoCategorySeed = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  words: string[];
};

const DEMO_SEED_SOURCE = 'demo-content-seed-v2';

const DEMO_CATEGORIES: DemoCategorySeed[] = [
  {
    name: 'Animales',
    slug: 'animales',
    description: 'Palabras sobre animales cercanos y faciles de reconocer.',
    icon: 'pets',
    words: ['gato', 'perro', 'pato', 'vaca', 'caballo'],
  },
  {
    name: 'Familia',
    slug: 'familia',
    description: 'Vocabulario basico de los integrantes de la familia.',
    icon: 'brush',
    words: ['mamá', 'papá', 'prima', 'abuelo', 'hermana'],
  },
  {
    name: 'Cocina',
    slug: 'cocina',
    description: 'Objetos y alimentos cotidianos de la cocina.',
    icon: 'restaurant',
    words: ['pan', 'leche', 'queso', 'sopa', 'arroz'],
  },
  {
    name: 'Naturaleza',
    slug: 'naturaleza',
    description: 'Elementos del entorno natural para lectura inicial.',
    icon: 'rocket_launch',
    words: ['árbol', 'flor', 'nube', 'sol', 'luna'],
  },
  {
    name: 'Juguetes',
    slug: 'juguetes',
    description: 'Palabras de juego para una practica mas divertida.',
    icon: 'sports_soccer',
    words: ['pelota', 'tren', 'carro', 'trompo', 'bloques'],
  },
];

@Injectable()
export class DemoContentSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoContentSeedService.name);

  constructor(
    @Inject(DEMO_CONTENT_SEED_REPOSITORY)
    private readonly demoContentSeedRepository: IDemoContentSeedRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get<string>('env.nodeEnv') ?? 'development';
    const shouldSeed =
      nodeEnv !== 'production' &&
      (this.configService.get<string>('env.demoContentSeedEnabled') ?? 'true') ===
        'true';

    if (!shouldSeed) {
      return;
    }

    const studentIds = await this.demoContentSeedRepository.listActiveDemoStudentIds();

    if (studentIds.length === 0) {
      this.logger.warn('Demo content seed skipped because no active demo student users were found');
      return;
    }

    const categoryIdsBySlug = new Map<string, string>();
    for (const [categoryIndex, categorySeed] of DEMO_CATEGORIES.entries()) {
      categoryIdsBySlug.set(
        categorySeed.slug,
        await this.demoContentSeedRepository.upsertCategory({
          name: categorySeed.name,
          slug: categorySeed.slug,
          description: categorySeed.description,
          icon: categorySeed.icon,
          sortOrder: categoryIndex,
        }),
      );
    }

    for (const [studentIndex, studentId] of studentIds.entries()) {
      const selectedWordCardIds: string[] = [];
      for (const categorySeed of DEMO_CATEGORIES) {
        const categoryId = categoryIdsBySlug.get(categorySeed.slug);
        if (!categoryId) {
          continue;
        }
        const currentWords: string[] = [];
        for (const [wordIndex, rawWord] of categorySeed.words.entries()) {
          const normalizedWord = normalizeWordForStorage(rawWord);
          currentWords.push(normalizedWord);
          const learningUnitId = await this.demoContentSeedRepository.upsertLearningUnit(
            {
              word: normalizedWord,
              categoryId,
              categorySlug: categorySeed.slug,
              metadataSource: DEMO_SEED_SOURCE,
            },
          );
          const isSecondStudent = studentIndex % 2 === 1;
          const status =
            wordIndex >= 3 && isSecondStudent
              ? 'completed'
              : wordIndex === 0
                ? 'new'
                : 'active';
          const now = new Date();
          const timesShown = status === 'completed' ? 3 : wordIndex;
          const completedAt = status === 'completed' ? now : undefined;
          const wordCardId = await this.demoContentSeedRepository.upsertWordCard({
            studentId,
            word: normalizedWord,
            categoryId,
            learningUnitId,
            categorySlug: categorySeed.slug,
            initialLetter: initialLetterFromNormalizedWord(normalizedWord),
            status,
            timesShown,
            timesAudioPlayed: 0,
            completedAt,
          });
          if (categorySeed.slug === DEMO_CATEGORIES[0].slug) {
            selectedWordCardIds.push(wordCardId);
          }
        }

        await this.demoContentSeedRepository.deleteWordCardsNotInWordList(
          studentId,
          categoryId,
          currentWords,
        );
      }

      await this.seedProgressLogs(studentId, selectedWordCardIds);
      await this.seedTodayPlanAndSessions(
        studentId,
        selectedWordCardIds,
        categoryIdsBySlug.get(DEMO_CATEGORIES[0].slug)!,
      );
    }

    this.logger.log(
      `Seeded demo learning content and Doman plans for ${studentIds.length} students`,
    );
  }

  private async seedProgressLogs(
    studentId: string,
    wordCardIds: string[],
  ): Promise<void> {
    if (wordCardIds.length === 0) {
      return;
    }

    await this.demoContentSeedRepository.deleteProgressLogsByUserAndSeed(
      studentId,
      DEMO_SEED_SOURCE,
    );

    const now = Date.now();
    const seedLogs = wordCardIds.slice(0, 3).flatMap((wordCardId, index) => {
      const viewedAt = new Date(now - (index + 1) * 60_000);
      const completedAt = new Date(viewedAt.getTime() + 20_000);
      return [
        {
          user_id: studentId,
          action: 'word_viewed',
          ts: viewedAt,
          payload: {
            seed_source: DEMO_SEED_SOURCE,
            word_card_id: wordCardId,
          },
          device: 'seed-script',
          created_at: viewedAt,
        },
        {
          user_id: studentId,
          action: 'word_completed',
          ts: completedAt,
          payload: {
            seed_source: DEMO_SEED_SOURCE,
            word_card_id: wordCardId,
          },
          device: 'seed-script',
          created_at: completedAt,
        },
      ];
    });

    await this.demoContentSeedRepository.insertProgressLogs(seedLogs);
  }

  private async seedTodayPlanAndSessions(
    studentId: string,
    wordCardIds: string[],
    categoryId: string,
  ): Promise<void> {
    if (wordCardIds.length === 0) {
      return;
    }

    const planDate = new Date();
    planDate.setUTCHours(0, 0, 0, 0);

    await this.demoContentSeedRepository.resetDemoDomanPlanGraph(
      studentId,
      planDate,
      DEMO_SEED_SOURCE,
    );

    await this.demoContentSeedRepository.seedTodayPlanAndSessions({
      studentId,
      wordCardIds,
      categoryId,
      planDate,
      seedSource: DEMO_SEED_SOURCE,
    });
  }
}
