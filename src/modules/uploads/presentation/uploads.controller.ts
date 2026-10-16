import { Body, Controller, HttpCode, HttpStatus, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { UploadsService } from '../application/uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('teacher', 'admin')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('audio')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  uploadAudio(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request & { user: AuthRequestUser }) {
    return this.uploadsService.uploadAudio(file, req.user.userId);
  }

  @Post('audio/presigned')
  createAudioUpload(
    @Body() body: { original_name: string; mime_type: string; size_bytes: number },
    @Req() req: Request & { user: AuthRequestUser },
  ) {
    return this.uploadsService.createAudioUpload(body, req.user.userId);
  }
}
