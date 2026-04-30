import { WordCardListed } from '../../../categories/domain/interfaces/word-card-listed.interface';

export interface DomanSessionCard {
  id: string;
  session_id: string;
  word_card_id: string;
  order_index: number;
  displayed_at?: Date;
  audio_played_at?: Date;
  created_at: Date;
  word_card?: WordCardListed;
}
