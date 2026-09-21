export const MARKER_STATUSES = ['active', 'archived'] as const;
export type MarkerStatus = (typeof MARKER_STATUSES)[number];

export const MARKER_MODEL_FORMATS = ['glb', 'gltf'] as const;
export type MarkerModelFormat = (typeof MARKER_MODEL_FORMATS)[number];

/**
 * Marcador AR del catálogo docente.
 *
 * `code` es la clave natural que emite el motor AR (el mismo valor que viaja en
 * `learning_units.marker_id`) y es inmutable tras la creación. La colección
 * `markers` es independiente de `learning_units`: un código pertenece a una o a
 * la otra, nunca a las dos (ver `US-BE-markers.md`).
 */
export interface Marker {
  id: string;
  code: string;
  name: string;
  description?: string;
  model_3d_url?: string;
  model_3d_format?: MarkerModelFormat;
  model_3d_updated_at?: Date;
  status: MarkerStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
