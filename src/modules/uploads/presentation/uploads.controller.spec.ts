import { UploadsController } from './uploads.controller';
import { UploadsService } from '../application/uploads.service';

describe('UploadsController', () => {
  const uploadsService = {
    uploadAudio: jest.fn(),
    createAudioUpload: jest.fn(),
  } as unknown as jest.Mocked<UploadsService>;
  const controller = new UploadsController(uploadsService);
  const request = { user: { userId: 'teacher-1', role: 'teacher' } } as never;

  beforeEach(() => jest.clearAllMocks());

  it('delegates the compatibility multipart endpoint with the authenticated owner', async () => {
    const file = { originalname: 'word.mp3' } as Express.Multer.File;
    await controller.uploadAudio(file, request);
    expect(uploadsService.uploadAudio).toHaveBeenCalledWith(file, 'teacher-1');
  });

  it('delegates direct upload authorization with the authenticated owner', async () => {
    const body = { original_name: 'word.mp3', mime_type: 'audio/mpeg', size_bytes: 12 };
    await controller.createAudioUpload(body, request);
    expect(uploadsService.createAudioUpload).toHaveBeenCalledWith(body, 'teacher-1');
  });
});
