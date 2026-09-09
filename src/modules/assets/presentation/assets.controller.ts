import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AssetsService } from '../application/assets.service';
import { ArModelOptionResponseDto } from '../dto/ar-model-option-response.dto';
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

  @Get('models')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOkResponse({ type: [ArModelOptionResponseDto] })
  async listModels(): Promise<ArModelOptionResponseDto[]> {
    return this.assetsService.listModels();
  }

  @Get('marker/:markerId')
  @ApiParam({
    name: 'markerId',
    description: 'Identificador estable detectado por el motor AR',
  })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({
    description: 'El marcador no tiene una unidad de aprendizaje asociada',
  })
  async findByMarker(
    @Param('markerId') markerId: string,
  ): Promise<AssetResponseDto> {
    return this.assetsService.findByMarker(markerId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  async create(@Body() dto: CreateAssetDto): Promise<unknown> {
    return this.assetsService.create(dto);
  }
}
