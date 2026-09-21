export const MAX_MARKER_CODE_LENGTH = 128;

const MARKER_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * Normaliza un código de marcador a una forma estable y segura para URL:
 * recorta, elimina diacríticos, pasa a minúsculas y convierte los espacios en
 * guiones. El código viaja en `GET /api/markers/code/:code`, de ahí la
 * restricción de caracteres.
 */
export function normalizeMarkerCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function isValidMarkerCode(value: string): boolean {
  if (value.length === 0 || value.length > MAX_MARKER_CODE_LENGTH) {
    return false;
  }
  return MARKER_CODE_PATTERN.test(value);
}
