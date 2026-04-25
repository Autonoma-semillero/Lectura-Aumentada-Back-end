export interface LearningUnitAssets {
  model_3d?: string;
  audio_pronunciacion?: string;
}

export interface LearningUnit {
  id: string;
  word: string;
  category_id?: string;
  marker_id: string;
  assets: LearningUnitAssets;
  metadata_accessibility?: Record<string, unknown>;
  language?: string;
  created_at: Date;
  updated_at: Date;
}
