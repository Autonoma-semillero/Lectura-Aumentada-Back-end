import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AssetsService } from '../application/assets.service';
import { AssetResponseDto } from '../dto/asset-response.dto';
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
  @ApiParam({ name: 'markerId', description: 'Identificador estable detectado por el motor AR' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'El marcador no tiene una unidad de aprendizaje asociada' })
  async findByMarker(@Param('markerId') markerId: string): Promise<AssetResponseDto> {
    return this.assetsService.findByMarker(markerId);
  }

  @Post()
  async create(@Body() dto: CreateAssetDto): Promise<unknown> {
    return this.assetsService.create(dto);
  }
}
