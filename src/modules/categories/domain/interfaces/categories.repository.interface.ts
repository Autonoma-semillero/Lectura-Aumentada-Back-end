import { Category } from './category.interface';

export type CategoryParentFilter = {
  /** Raíz: sin padre o parent_id null */
  parent_id?: string | null;
};

export interface ICategoriesRepository {
  findAll(filter: CategoryParentFilter): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByIds(ids: string[]): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
  maxSortOrder(parent: CategoryParentFilter): Promise<number>;
  create(
    payload: Pick<Category, 'name' | 'slug'> &
      Partial<Pick<Category, 'description' | 'icon' | 'parent_id' | 'sort_order'>>,
  ): Promise<Category>;
  update(id: string, payload: Partial<Category>): Promise<Category | null>;
  delete(id: string): Promise<boolean>;
  setSortOrders(orderedIds: string[], parent: CategoryParentFilter): Promise<void>;
  countIncomingReferences(categoryId: string): Promise<number>;
  countWordCardsByCategory(): Promise<Map<string, number>>;
}
