import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { Types } from 'mongoose';
import {
  CATEGORIES_REPOSITORY,
  WORD_CARDS_REPOSITORY,
} from '../domain/constants/categories.tokens';
import { ICategoriesRepository } from '../domain/interfaces/categories.repository.interface';
import { WordCardListed } from '../domain/interfaces/word-card-listed.interface';
import { IWordCardsRepository } from '../domain/interfaces/word-cards.repository.interface';
import { WordCardPatchPayload } from '../domain/types/word-card-repository.payloads';
import { CreateWordCardDto } from '../dto/create-word-card.dto';
import { ListWordCardsQueryDto } from '../dto/list-word-cards-query.dto';
import { UpdateWordCardCategoryDto } from '../dto/update-word-card-category.dto';
import { UpdateWordCardDto } from '../dto/update-word-card.dto';
import {
  initialLetterFromNormalizedWord,
  normalizeWordForStorage,
} from './word-normalize';

@Injectable()
export class WordCardsService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: ICategoriesRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
  ) {}

  async listByCategory(categoryId: string): Promise<WordCardListed[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category id');
    }
    const cat = await this.categoriesRepository.findById(categoryId);
    if (!cat) {
      throw new NotFoundException('Category not found');
    }
    return this.wordCardsRepository.listByCategoryId(categoryId);
  }

  async listByQuery(query: ListWordCardsQueryDto): Promise<WordCardListed[]> {
    if (!Types.ObjectId.isValid(query.student_id)) {
      throw new BadRequestException('Invalid student_id');
    }
    if (query.category_id) {
      if (!Types.ObjectId.isValid(query.category_id)) {
        throw new BadRequestException('Invalid category_id');
      }
      return this.listByStudentAndCategory(
        query.student_id,
        query.category_id,
      );
    }
    return this.wordCardsRepository.listByStudentId(query.student_id);
  }

  async listByStudentAndCategory(
    studentId: string,
    categoryId: string,
  ): Promise<WordCardListed[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category_id');
    }
    const cat = await this.categoriesRepository.findById(categoryId);
    if (!cat) {
      throw new NotFoundException('Category not found');
    }
    return this.wordCardsRepository.listByStudentAndCategory(
      studentId,
      categoryId,
    );
  }

  async getById(wordCardId: string): Promise<WordCardListed> {
    if (!Types.ObjectId.isValid(wordCardId)) {
      throw new BadRequestException('Invalid word card id');
    }
    const card = await this.wordCardsRepository.findById(wordCardId);
    if (!card) {
      throw new NotFoundException('Word card not found');
    }
    return card;
  }

  async create(dto: CreateWordCardDto): Promise<WordCardListed> {
    const wordNorm = normalizeWordForStorage(dto.word);
    if (!wordNorm) {
      throw new BadRequestException('word cannot be empty after normalization');
    }
    let initialLetter: string;
    try {
      initialLetter = initialLetterFromNormalizedWord(wordNorm);
    } catch {
      throw new BadRequestException('Could not derive initial_letter from word');
    }
    const cat = await this.categoriesRepository.findById(dto.category_id);
    if (!cat) {
      throw new NotFoundException('Category not found');
    }
    const audioTrim =
      dto.audio_url !== undefined ? dto.audio_url.trim() : undefined;
    const audioUrl = audioTrim === '' ? undefined : audioTrim;
    const status = dto.status ?? 'new';
    const langTrim =
      dto.language !== undefined ? dto.language.trim() : undefined;
    try {
      return await this.wordCardsRepository.create({
        studentId: dto.student_id,
        word: wordNorm,
        initialLetter,
        audioUrl,
        categoryId: dto.category_id,
        status,
        language: langTrim === '' ? undefined : langTrim,
        learningUnitId: dto.learning_unit_id,
      });
    } catch (e) {
      this.rethrowDuplicateStudentWord(e);
      throw e;
    }
  }

  async update(id: string, dto: UpdateWordCardDto): Promise<WordCardListed> {
    await this.getById(id);
    const touched =
      dto.word !== undefined ||
      dto.audio_url !== undefined ||
      dto.category_id !== undefined ||
      dto.status !== undefined ||
      dto.language !== undefined ||
      dto.learning_unit_id !== undefined;
    if (!touched) {
      throw new BadRequestException('At least one field to update is required');
    }
    const patch: WordCardPatchPayload = {};
    if (dto.word !== undefined) {
      const wordNorm = normalizeWordForStorage(dto.word);
      if (!wordNorm) {
        throw new BadRequestException(
          'word cannot be empty after normalization',
        );
      }
      patch.word = wordNorm;
      patch.initialLetter = initialLetterFromNormalizedWord(wordNorm);
    }
    if (dto.audio_url !== undefined) {
      const a = dto.audio_url.trim();
      if (!a) {
        throw new BadRequestException('audio_url cannot be empty');
      }
      patch.audioUrl = a;
    }
    if (dto.category_id !== undefined) {
      const c = await this.categoriesRepository.findById(dto.category_id);
      if (!c) {
        throw new NotFoundException('Category not found');
      }
      patch.categoryId = dto.category_id;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.language !== undefined) {
      patch.language = dto.language.trim();
    }
    if (dto.learning_unit_id !== undefined) {
      patch.learningUnitId = dto.learning_unit_id;
    }
    try {
      const updated = await this.wordCardsRepository.update(id, patch);
      if (!updated) {
        throw new NotFoundException('Word card not found');
      }
      return updated;
    } catch (e) {
      this.rethrowDuplicateStudentWord(e);
      throw e;
    }
  }

  async setCategory(
    wordCardId: string,
    dto: UpdateWordCardCategoryDto,
  ): Promise<WordCardListed> {
    if (!Types.ObjectId.isValid(wordCardId)) {
      throw new BadRequestException('Invalid word card id');
    }
    const card = await this.wordCardsRepository.findById(wordCardId);
    if (!card) {
      throw new NotFoundException('Word card not found');
    }
    const nextId = dto.category_id.trim();
    if (!Types.ObjectId.isValid(nextId)) {
      throw new BadRequestException('Invalid category_id');
    }
    const cat = await this.categoriesRepository.findById(nextId);
    if (!cat) {
      throw new BadRequestException(
        'Category not found: cannot associate (referential integrity)',
      );
    }
    const updated = await this.wordCardsRepository.updateCategoryId(
      wordCardId,
      nextId,
    );
    if (!updated) {
      throw new NotFoundException('Word card not found');
    }
    return updated;
  }

  private rethrowDuplicateStudentWord(err: unknown): void {
    if (
      err instanceof MongoServerError &&
      (err.code === 11000 || err.code === 11001)
    ) {
      const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
      if (keys.includes('student_id') && keys.includes('word')) {
        throw new ConflictException(
          'A word card with this word already exists for this student',
        );
      }
    }
  }
}
