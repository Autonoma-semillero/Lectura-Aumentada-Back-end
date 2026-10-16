import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import type { IUploadsStorage } from '../domain/interfaces/uploads-storage.interface';

describe('UploadsService', () => {
  const storage: jest.Mocked<IUploadsStorage> = {
    putAudio: jest.fn(),
    createAudioUpload: jest.fn(),
  };
  const service = new UploadsService(storage);

  beforeEach(() => {
    storage.putAudio.mockReset();
    storage.createAudioUpload.mockReset();
    storage.putAudio.mockResolvedValue({ url: 'https://blob.example/audio/word.mp3' });
    storage.createAudioUpload.mockResolvedValue({ uploadUrl: 'https://blob.example/presigned-upload' });
  });

  it('stores an allowed audio file under the requesting teacher namespace', async () => {
    const result = await service.uploadAudio(
      {
        originalname: 'mi audio!.mp3',
        mimetype: 'audio/mpeg',
        size: 3,
        buffer: Buffer.from('mp3'),
      } as Express.Multer.File,
      'teacher-1',
    );

    expect(storage.putAudio).toHaveBeenCalledWith(expect.objectContaining({
      pathname: expect.stringMatching(/^audio\/teacher-1\/[\w-]+-mi-audio-.mp3$/),
      contentType: 'audio/mpeg',
      body: Buffer.from('mp3'),
    }));
    expect(result).toEqual({
      audio_url: 'https://blob.example/audio/word.mp3',
      mime_type: 'audio/mpeg',
      size_bytes: 3,
      original_name: 'mi-audio-.mp3',
    });
  });

  it('issues a short-lived constrained URL for direct client uploads', async () => {
    const result = await service.createAudioUpload({
      original_name: 'palabra.mp3', mime_type: 'audio/mpeg', size_bytes: 1_024,
    }, 'teacher-1');

    expect(storage.createAudioUpload).toHaveBeenCalledWith(expect.objectContaining({
      pathname: expect.stringMatching(/^audio\/teacher-1\//),
      contentType: 'audio/mpeg',
      maximumSizeInBytes: 1_024,
      validUntil: expect.any(Number),
    }));
    expect(result).toMatchObject({
      upload_url: 'https://blob.example/presigned-upload',
      mime_type: 'audio/mpeg', size_bytes: 1_024, original_name: 'palabra.mp3',
    });
  });

  it.each([
    [undefined, BadRequestException],
    [{ originalname: 'word.txt', mimetype: 'text/plain', size: 1, buffer: Buffer.from('x') }, BadRequestException],
    [{ originalname: 'empty.mp3', mimetype: 'audio/mpeg', size: 0, buffer: Buffer.alloc(0) }, BadRequestException],
    [{ originalname: 'large.mp3', mimetype: 'audio/mpeg', size: 10 * 1024 * 1024 + 1, buffer: Buffer.alloc(1) }, PayloadTooLargeException],
  ])('rejects an invalid audio input', async (file, exception) => {
    await expect(service.uploadAudio(file as Express.Multer.File | undefined, 'teacher-1')).rejects.toBeInstanceOf(exception);
    expect(storage.putAudio).not.toHaveBeenCalled();
  });
});
