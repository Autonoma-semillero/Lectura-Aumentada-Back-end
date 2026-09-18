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

/**
 * Fila de `doman_session_cards` capturada antes de una regeneración
 * destructiva. Excluye la tarjeta expandida por `$lookup` porque la
 * restauración solo reinserta la fila puente, nunca la tarjeta.
 */
export type DomanSessionCardSnapshot = Omit<DomanSessionCard, 'word_card'>;
