export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
  word_cards_count?: number;
  created_at: Date;
  updated_at: Date;
}
