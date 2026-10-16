import { Module } from '@nestjs/common';
import { UploadsService } from './application/uploads.service';
import { UPLOADS_STORAGE } from './domain/constants/uploads.tokens';
import { VercelBlobStorage } from './infrastructure/vercel-blob.storage';
import { UploadsController } from './presentation/uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, { provide: UPLOADS_STORAGE, useClass: VercelBlobStorage }],
})
export class UploadsModule {}
