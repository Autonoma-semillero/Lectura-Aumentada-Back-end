import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssetsService } from '../application/assets.service';
import { CreateAssetDto } from '../dto/create-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  async findAll(): Promise<unknown> {
    return this.service.findAll();
  }

  @Get('marker/:markerId')
  async findByMarker(@Param('markerId') markerId: string): Promise<unknown> {
    return this.service.findByMarker(markerId);
  }

  @Post()
  async create(@Body() dto: CreateAssetDto): Promise<unknown> {
    return this.service.create(dto);
  }
}
