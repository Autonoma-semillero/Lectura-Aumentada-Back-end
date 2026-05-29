export interface CategoryProgressSummary {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  total: number;
  byStatus: {
    new: number;
    active: number;
    completed: number;
    archived: number;
  };
  phase2Ready: boolean;
}

export interface CompletedCardItem {
  id: string;
  word: string;
  audioUrl?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  timesShown: number;
  timesAudioPlayed: number;
  completedAt?: Date;
}

export interface CompletedCardsPaginated {
  data: CompletedCardItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentSummary {
  id: string;
  displayName?: string;
  email: string;
}
