import { BadRequestException, Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UPLOADS_STORAGE } from '../domain/constants/uploads.tokens';
import type { IUploadsStorage } from '../domain/interfaces/uploads-storage.interface';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg']);
const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class UploadsService {
  constructor(@Inject(UPLOADS_STORAGE) private readonly uploadsStorage: IUploadsStorage) {}

  async uploadAudio(file: Express.Multer.File | undefined, requesterId: string): Promise<{ audio_url: string; mime_type: string; size_bytes: number; original_name: string }> {
    if (!file) throw new BadRequestException('An audio file is required');
    const audio = this.validateAudio(file.originalname, file.mimetype, file.size);
    const stored = await this.uploadsStorage.putAudio({
      pathname: `audio/${requesterId}/${randomUUID()}-${audio.originalName}`,
      contentType: audio.mimeType,
      body: file.buffer,
    });
    return { audio_url: stored.url, mime_type: audio.mimeType, size_bytes: audio.sizeBytes, original_name: audio.originalName };
  }

  async createAudioUpload(
    input: { original_name: string; mime_type: string; size_bytes: number },
    requesterId: string,
  ): Promise<{ upload_url: string; mime_type: string; size_bytes: number; original_name: string; expires_at: string }> {
    const audio = this.validateAudio(input.original_name, input.mime_type, input.size_bytes);
    const validUntil = Date.now() + UPLOAD_TOKEN_TTL_MS;
    const upload = await this.uploadsStorage.createAudioUpload({
      pathname: `audio/${requesterId}/${randomUUID()}-${audio.originalName}`,
      contentType: audio.mimeType,
      maximumSizeInBytes: audio.sizeBytes,
      validUntil,
    });
    return {
      upload_url: upload.uploadUrl,
      mime_type: audio.mimeType,
      size_bytes: audio.sizeBytes,
      original_name: audio.originalName,
      expires_at: new Date(validUntil).toISOString(),
    };
  }

  private validateAudio(originalName: string, mimeType: string, sizeBytes: number) {
    if (typeof originalName !== 'string' || !originalName.trim()) throw new BadRequestException('An audio file name is required');
    if (typeof mimeType !== 'string') throw new BadRequestException('Unsupported audio type');
    if (!AUDIO_MIME_TYPES.has(mimeType)) throw new BadRequestException('Unsupported audio type');
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) throw new BadRequestException('The audio file is empty');
    if (sizeBytes > MAX_AUDIO_BYTES) throw new PayloadTooLargeException('Audio files must be at most 10 MB');
    return { originalName: this.safeName(originalName), mimeType, sizeBytes };
  }

  private safeName(value: string): string {
    const safe = value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
    return safe || 'audio.m4a';
  }
}
