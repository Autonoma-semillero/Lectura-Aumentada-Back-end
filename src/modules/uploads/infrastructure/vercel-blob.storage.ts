import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import type { IUploadsStorage } from '../domain/interfaces/uploads-storage.interface';

@Injectable()
export class VercelBlobStorage implements IUploadsStorage {
  async putAudio(input: { pathname: string; contentType: string; body: Buffer }): Promise<{ url: string }> {
    if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      throw new ServiceUnavailableException('Audio storage is not configured');
    }
    const blob = await put(input.pathname, input.body, { access: 'public', contentType: input.contentType, addRandomSuffix: true });
    return { url: blob.url };
  }

  async createAudioUpload(input: {
    pathname: string;
    contentType: string;
    maximumSizeInBytes: number;
    validUntil: number;
  }): Promise<{ uploadUrl: string }> {
    const token = this.requireToken();
    const signedToken = await issueSignedToken({
      token,
      pathname: input.pathname,
      operations: ['put'],
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maximumSizeInBytes,
      validUntil: input.validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: 'public',
      operation: 'put',
      pathname: input.pathname,
      allowedContentTypes: [input.contentType],
      maximumSizeInBytes: input.maximumSizeInBytes,
      validUntil: input.validUntil,
      addRandomSuffix: true,
    });
    return { uploadUrl: presignedUrl };
  }

  private requireToken(): string {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) throw new ServiceUnavailableException('Audio storage is not configured');
    return token;
  }
}
