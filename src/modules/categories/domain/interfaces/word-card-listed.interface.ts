/** Vista de `doman_word_cards` alineada al validador del script canónico. */
export interface WordCardListed {
  id: string;
  student_id: string;
  word: string;
  status: string;
  category_id?: string;
  learning_unit_id?: string;
  audio_url?: string;
  language?: string;
  initial_letter: string;
  times_shown: number;
  times_audio_played?: number;
  created_at: Date;
  updated_at: Date;
}
