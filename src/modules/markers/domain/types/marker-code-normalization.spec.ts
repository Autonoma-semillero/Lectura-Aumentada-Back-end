import {
  isValidMarkerCode,
  MAX_MARKER_CODE_LENGTH,
  normalizeMarkerCode,
} from './marker-code-normalization';

describe('normalizeMarkerCode', () => {
  it.each([
    ['  Aula3-GATO  ', 'aula3-gato'],
    ['Árbol', 'arbol'],
    ['NIÑO', 'nino'],
    ['marcador   con espacios', 'marcador-con-espacios'],
    ['demo-animales-gato', 'demo-animales-gato'],
  ])('normaliza %j a %j', (input, expected) => {
    expect(normalizeMarkerCode(input)).toBe(expected);
  });
});

describe('isValidMarkerCode', () => {
  it.each(['aula3-gato', 'a', 'demo.animales_gato', '0-marcador'])(
    'acepta %j',
    (code) => {
      expect(isValidMarkerCode(code)).toBe(true);
    },
  );

  it.each([
    ['', 'cadena vacía'],
    ['-empieza-con-guion', 'no empieza por letra o dígito'],
    ['con/barra', 'contiene una barra'],
    ['con espacio', 'contiene un espacio'],
    ['MAYUSCULAS', 'no está normalizado'],
  ])('rechaza %j (%s)', (code) => {
    expect(isValidMarkerCode(code)).toBe(false);
  });

  it('rechaza un código más largo que el máximo', () => {
    expect(isValidMarkerCode('a'.repeat(MAX_MARKER_CODE_LENGTH))).toBe(true);
    expect(isValidMarkerCode('a'.repeat(MAX_MARKER_CODE_LENGTH + 1))).toBe(
      false,
    );
  });
});
