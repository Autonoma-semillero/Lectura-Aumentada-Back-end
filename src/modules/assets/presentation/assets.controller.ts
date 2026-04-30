import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetsService } from '../application/assets.service';
import { CreateAssetDto } from '../dto/create-asset.dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async findAll(): Promise<unknown> {
    return this.assetsService.findAll();
  }

  @Get('marker/:markerId')
  async findByMarker(@Param('markerId') markerId: string): Promise<unknown> {
    return this.assetsService.findByMarker(markerId);
  }

  @Post()
  async create(@Body() dto: CreateAssetDto): Promise<unknown> {
    return this.assetsService.create(dto);
  }
}
