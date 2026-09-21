import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { isMongoObjectId } from '../../../common/utils/object-id';
import { MARKERS_REPOSITORY } from '../domain/constants/markers.tokens';
import { Marker } from '../domain/interfaces/marker.interface';
import {
  CreateMarkerPayload,
  IMarkersRepository,
  MarkersListFilter,
} from '../domain/interfaces/markers.repository.interface';
import {
  isValidMarkerCode,
  MAX_MARKER_CODE_LENGTH,
  normalizeMarkerCode,
} from '../domain/types/marker-code-normalization';
import { CreateMarkerDto } from '../dto/create-marker.dto';
import { ListMarkersQueryDto } from '../dto/list-markers-query.dto';
import { SetMarkerModelDto } from '../dto/set-marker-model.dto';
import { UpdateMarkerDto } from '../dto/update-marker.dto';

@Injectable()
export class MarkersService {
  constructor(
    @Inject(MARKERS_REPOSITORY)
    private readonly markersRepository: IMarkersRepository,
  ) {}

  async list(query: ListMarkersQueryDto): Promise<Marker[]> {
    const filter: MarkersListFilter = {
      status: query.status,
      with_model: query.with_model,
      q: query.q?.trim() || undefined,
      limit: query.limit ?? 50,
    };
    return this.markersRepository.findAll(filter);
  }

  async getById(id: string): Promise<Marker> {
    this.assertObjectId(id);
    const marker = await this.markersRepository.findById(id);
    if (!marker) {
      throw new NotFoundException('Marker not found');
    }
    return marker;
  }

  async getByCode(code: string): Promise<Marker> {
    const normalized = this.assertCode(code);
    const marker = await this.markersRepository.findByCode(normalized);
    if (!marker) {
      throw new NotFoundException('Marker not found');
    }
    return marker;
  }

  async create(dto: CreateMarkerDto, createdBy: string): Promise<Marker> {
    const code = this.assertCode(dto.code);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name must not be empty');
    }

    const duplicate = await this.markersRepository.findByCode(code);
    if (duplicate) {
      throw new ConflictException('Marker code already in use');
    }

    // Un código pertenece al catálogo `markers` o a `learning_units`, nunca a
    // los dos: así no hay dos modelos 3D en conflicto para el mismo marcador.
    const usedByLearningUnit =
      await this.markersRepository.existsLearningUnitWithMarkerCode(code);
    if (usedByLearningUnit) {
      throw new ConflictException(
        'Marker code already belongs to a learning unit',
      );
    }

    const payload: CreateMarkerPayload = {
      code,
      name,
      description: dto.description?.trim() || undefined,
      status: dto.status ?? 'active',
      created_by: createdBy,
    };
    if (dto.model_3d_url !== undefined) {
      payload.model_3d_url = this.assertModelUrl(dto.model_3d_url);
      payload.model_3d_format = dto.model_3d_format ?? 'glb';
      payload.model_3d_updated_at = new Date();
    }

    try {
      return await this.markersRepository.create(payload);
    } catch (err) {
      this.rethrowDuplicateCode(err);
      throw err;
    }
  }

  async update(id: string, dto: UpdateMarkerDto): Promise<Marker> {
    this.assertObjectId(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('name must not be empty');
    }

    const updated = await this.markersRepository.update(id, {
      name,
      description: dto.description?.trim(),
      status: dto.status,
    });
    if (!updated) {
      throw new NotFoundException('Marker not found');
    }
    return updated;
  }

  async setModel(id: string, dto: SetMarkerModelDto): Promise<Marker> {
    const marker = await this.getById(id);
    if (marker.status === 'archived') {
      throw new ConflictException(
        'Cannot set a 3D model on an archived marker',
      );
    }

    const updated = await this.markersRepository.setModel(id, {
      model_3d_url: this.assertModelUrl(dto.model_3d_url),
      model_3d_format: dto.model_3d_format ?? 'glb',
      model_3d_updated_at: new Date(),
    });
    if (!updated) {
      throw new NotFoundException('Marker not found');
    }
    return updated;
  }

  async removeModel(id: string): Promise<void> {
    this.assertObjectId(id);
    const updated = await this.markersRepository.clearModel(id);
    if (!updated) {
      throw new NotFoundException('Marker not found');
    }
  }

  async archive(id: string): Promise<void> {
    this.assertObjectId(id);
    const archived = await this.markersRepository.archive(id);
    if (!archived) {
      throw new NotFoundException('Marker not found');
    }
  }

  private assertObjectId(id: string): void {
    if (!isMongoObjectId(id)) {
      throw new BadRequestException('Invalid marker id');
    }
  }

  private assertCode(code: string): string {
    const normalized = normalizeMarkerCode(code ?? '');
    if (!isValidMarkerCode(normalized)) {
      throw new BadRequestException(
        `code must start with a letter or digit and use only letters, digits, '.', '_' or '-' (max ${MAX_MARKER_CODE_LENGTH} chars)`,
      );
    }
    return normalized;
  }

  private assertModelUrl(url: string): string {
    const trimmed = url.trim();
    // El cliente Android rechaza tráfico en claro en release, así que el modelo
    // debe servirse por HTTPS o como ruta relativa del propio backend.
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      throw new BadRequestException(
        'model_3d_url must be an https:// URL or an absolute path starting with /',
      );
    }
    return trimmed;
  }

  private rethrowDuplicateCode(err: unknown): void {
    if (
      err instanceof MongoServerError &&
      (err.code === 11000 || err.code === 11001)
    ) {
      throw new ConflictException('Marker code already in use');
    }
  }
}
