import {
  Marker,
  MarkerModelFormat,
  MarkerStatus,
} from './marker.interface';

export interface MarkersListFilter {
  status?: MarkerStatus;
  with_model?: boolean;
  q?: string;
  limit?: number;
}

export interface CreateMarkerPayload {
  code: string;
  name: string;
  description?: string;
  model_3d_url?: string;
  model_3d_format?: MarkerModelFormat;
  model_3d_updated_at?: Date;
  status: MarkerStatus;
  created_by: string;
}

export interface UpdateMarkerPayload {
  name?: string;
  description?: string;
  status?: MarkerStatus;
}

export interface SetMarkerModelPayload {
  model_3d_url: string;
  model_3d_format: MarkerModelFormat;
  model_3d_updated_at: Date;
}

export interface IMarkersRepository {
  findAll(filter: MarkersListFilter): Promise<Marker[]>;
  findById(id: string): Promise<Marker | null>;
  findByCode(code: string): Promise<Marker | null>;
  create(payload: CreateMarkerPayload): Promise<Marker>;
  update(id: string, payload: UpdateMarkerPayload): Promise<Marker | null>;
  setModel(id: string, payload: SetMarkerModelPayload): Promise<Marker | null>;
  clearModel(id: string): Promise<Marker | null>;
  archive(id: string): Promise<boolean>;
  /**
   * Lectura sobre `learning_units` (índice `ix_learning_units_marker`) para
   * impedir que un mismo código tenga modelo 3D en las dos colecciones. Nunca
   * escribe esa colección.
   */
  existsLearningUnitWithMarkerCode(code: string): Promise<boolean>;
}
