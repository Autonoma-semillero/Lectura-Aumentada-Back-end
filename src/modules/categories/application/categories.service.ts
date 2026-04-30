import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import {
  CATEGORIES_REPOSITORY,
  WORD_CARDS_REPOSITORY,
} from '../domain/constants/categories.tokens';
import { Category } from '../domain/interfaces/category.interface';
import {
  CategoryParentFilter,
  ICategoriesRepository,
} from '../domain/interfaces/categories.repository.interface';
import { IWordCardsRepository } from '../domain/interfaces/word-cards.repository.interface';
import { CategoryWithWordCardAvailability } from '../domain/types/category-with-word-cards';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ListCategoriesQueryDto } from '../dto/list-categories-query.dto';
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: ICategoriesRepository,
    @Inject(WORD_CARDS_REPOSITORY)
    private readonly wordCardsRepository: IWordCardsRepository,
  ) {}

  async findAll(query: ListCategoriesQueryDto): Promise<Category[]> {
    const parent = this.parentFilterFromQuery(query);
    return this.categoriesRepository.findAll(parent);
  }

  async findWithAvailableWordCardsForStudent(
    studentId: string,
  ): Promise<CategoryWithWordCardAvailability[]> {
    if (!isMongoObjectId(studentId)) {
      throw new BadRequestException('Invalid student_id');
    }
    const rows =
      await this.wordCardsRepository.countWordCardsByCategoryForStudent(
        studentId,
      );
    if (rows.length === 0) {
      return [];
    }
    const categories = await this.categoriesRepository.findByIds(
      rows.map((r) => r.categoryId),
    );
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ordered: CategoryWithWordCardAvailability[] = [];
    for (const row of rows) {
      const c = byId.get(row.categoryId);
      if (c) {
        ordered.push({
          ...c,
          available_word_cards_count: row.count,
        });
      }
    }
    return ordered;
  }

  async findById(id: string): Promise<Category> {
    if (!isMongoObjectId(id)) {
      throw new BadRequestException('Invalid category id');
    }
    const c = await this.categoriesRepository.findById(id);
    if (!c) {
      throw new NotFoundException('Category not found');
    }
    return c;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = this.normalizeSlug(dto.slug);
    const name = dto.name.trim();
    const icon = dto.icon?.trim() || undefined;
    if (!name || !slug) {
      throw new BadRequestException('name and slug are required');
    }
    const dup = await this.categoriesRepository.findBySlug(slug);
    if (dup) {
      throw new ConflictException('Slug already in use');
    }
    if (dto.parent_id) {
      await this.findById(dto.parent_id);
    }
    const parent = this.parentFilterFromParentId(dto.parent_id);
    const max = await this.categoriesRepository.maxSortOrder(parent);
    const sortOrder =
      dto.sort_order !== undefined ? dto.sort_order : max + 1;
    try {
      return await this.categoriesRepository.create({
        name,
        slug,
        description: dto.description?.trim(),
        icon,
        parent_id: dto.parent_id,
        sort_order: sortOrder,
      });
    } catch (e) {
      this.rethrowDuplicateSlug(e);
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findById(id);
    const patch: Partial<Category> = {};
    if (dto.name !== undefined) {
      const n = dto.name.trim();
      if (!n) {
        throw new BadRequestException('name must not be empty');
      }
      patch.name = n;
    }
    if (dto.slug !== undefined) {
      const s = this.normalizeSlug(dto.slug);
      if (!s) {
        throw new BadRequestException('slug must not be empty');
      }
      const other = await this.categoriesRepository.findBySlug(s);
      if (other && other.id !== id) {
        throw new ConflictException('Slug already in use');
      }
      patch.slug = s;
    }
    if (dto.description !== undefined) {
      patch.description = dto.description.trim();
    }
    if (dto.icon !== undefined) {
      patch.icon = dto.icon.trim() || undefined;
    }
    if (dto.sort_order !== undefined) {
      patch.sort_order = dto.sort_order;
    }
    if (dto.parent_id !== undefined) {
      if (dto.parent_id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      if (dto.parent_id === '') {
        (patch as { parent_id?: string | null }).parent_id = null;
      } else {
        await this.findById(dto.parent_id);
        patch.parent_id = dto.parent_id;
      }
    }
    try {
      const updated = await this.categoriesRepository.update(id, patch);
      if (!updated) {
        throw new NotFoundException('Category not found');
      }
      return updated;
    } catch (e) {
      this.rethrowDuplicateSlug(e);
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    const refs = await this.categoriesRepository.countIncomingReferences(id);
    if (refs > 0) {
      throw new ConflictException(
        'Category is still referenced (word cards, learning units, plans, sessions or child categories)',
      );
    }
    const ok = await this.categoriesRepository.delete(id);
    if (!ok) {
      throw new NotFoundException('Category not found');
    }
  }

  async reorder(dto: ReorderCategoriesDto): Promise<Category[]> {
    const parent = this.parentFilterFromParentId(dto.parent_id);
    const existing = await this.categoriesRepository.findAll(parent);
    const ids = new Set(existing.map((c) => c.id));
    if (dto.ordered_ids.length !== ids.size) {
      throw new BadRequestException(
        'ordered_ids must list every sibling category id exactly once',
      );
    }
    for (const cid of dto.ordered_ids) {
      if (!ids.has(cid)) {
        throw new BadRequestException(`Invalid or out-of-scope category id: ${cid}`);
      }
    }
    try {
      await this.categoriesRepository.setSortOrders(dto.ordered_ids, parent);
    } catch (e) {
      this.rethrowDuplicateSlug(e);
      throw e;
    }
    return this.categoriesRepository.findAll(parent);
  }

  private parentFilterFromQuery(query: ListCategoriesQueryDto): CategoryParentFilter {
    if (query.parent_id !== undefined && query.parent_id !== '') {
      return { parent_id: query.parent_id };
    }
    return { parent_id: null };
  }

  private parentFilterFromParentId(
    parentId?: string,
  ): CategoryParentFilter {
    if (parentId !== undefined && parentId !== '') {
      return { parent_id: parentId };
    }
    return { parent_id: null };
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private rethrowDuplicateSlug(err: unknown): void {
    if (
      err instanceof MongoServerError &&
      (err.code === 11000 || err.code === 11001)
    ) {
      throw new ConflictException('Slug already in use');
    }
  }
}
