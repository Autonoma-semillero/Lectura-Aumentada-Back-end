import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AcknowledgeLiveSessionDto, CreateLiveCardDto, CreateLiveSessionDto, CreateRepertoireDto, LiveSessionCommandDto } from './live-doman.dto';

const objectId = '507f1f77bcf86cd799439011';

describe('Live Doman DTO contract', () => {
  async function errors(type: new () => object, value: object) {
    return validate(plainToInstance(type, value));
  }

  it('accepts bounded content and rejects missing or malformed ids', async () => {
    expect(await errors(CreateLiveCardDto, { word: 'gato', category_id: objectId })).toHaveLength(0);
    expect(await errors(CreateLiveCardDto, { word: '', category_id: 'invalid' })).not.toHaveLength(0);
    expect(await errors(CreateRepertoireDto, { name: 'Animales', category_id: objectId, stage: 'single_words', card_ids: [objectId] })).toHaveLength(0);
    expect(await errors(CreateRepertoireDto, { name: 'Animales', category_id: objectId, stage: 'single_words', card_ids: [] })).not.toHaveLength(0);
  });

  it('requires legal session pacing, sequence and idempotency command data', async () => {
    expect(await errors(CreateLiveSessionDto, { group_id: objectId, repertoire_id: objectId, pacing: 'teacher_controlled', display_ms: 1000 })).toHaveLength(0);
    expect(await errors(CreateLiveSessionDto, { group_id: objectId, repertoire_id: objectId, pacing: 'free' })).not.toHaveLength(0);
    expect(await errors(LiveSessionCommandDto, { action: 'next', expected_sequence: 0, command_id: 'd4f7c1c9-560c-4d89-9c7d-8cec44e2b32e' })).toHaveLength(0);
    expect(await errors(LiveSessionCommandDto, { action: 'skip', expected_sequence: -1, command_id: 'not-a-uuid' })).not.toHaveLength(0);
    expect(await errors(AcknowledgeLiveSessionDto, { sequence: 0 })).not.toHaveLength(0);
  });
});
