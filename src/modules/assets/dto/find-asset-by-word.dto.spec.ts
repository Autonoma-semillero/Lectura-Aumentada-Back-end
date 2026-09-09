import { validate } from 'class-validator';
import { FindAssetByWordDto } from './find-asset-by-word.dto';

describe('FindAssetByWordDto', () => {
  async function errorsFor(word: string) {
    const dto = new FindAssetByWordDto();
    dto.word = word;
    return validate(dto);
  }

  it.each(['Árbol', '  oso   polar ', "l'arbre", 'camión-azul'])(
    'accepts the OCR word %p',
    async (word) => {
      await expect(errorsFor(word)).resolves.toHaveLength(0);
    },
  );

  it.each(['   ', 'árbol!', 'a/b', 'a'.repeat(65)])(
    'rejects the invalid OCR word %p',
    async (word) => {
      expect(await errorsFor(word)).not.toHaveLength(0);
    },
  );
});
