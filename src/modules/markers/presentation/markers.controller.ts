import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { MarkersService } from '../application/markers.service';
import { CreateMarkerDto } from '../dto/create-marker.dto';
import { ListMarkersQueryDto } from '../dto/list-markers-query.dto';
import { MarkerResponseDto } from '../dto/marker-response.dto';
import { SetMarkerModelDto } from '../dto/set-marker-model.dto';
import { UpdateMarkerDto } from '../dto/update-marker.dto';

@ApiTags('markers')
@ApiBearerAuth()
@Controller('markers')
export class MarkersController {
  constructor(private readonly markersService: MarkersService) {}

  @Get()
  @ApiOkResponse({ type: MarkerResponseDto, isArray: true })
  async list(
    @Query() query: ListMarkersQueryDto,
  ): Promise<MarkerResponseDto[]> {
    return this.markersService.list(query);
  }

  @Get('code/:code')
  @ApiOkResponse({ type: MarkerResponseDto })
  async getByCode(@Param('code') code: string): Promise<MarkerResponseDto> {
    return this.markersService.getByCode(code);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: MarkerResponseDto })
  async create(
    @Body() dto: CreateMarkerDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<MarkerResponseDto> {
    return this.markersService.create(dto, req.user.userId);
  }

  @Get(':id')
  @ApiOkResponse({ type: MarkerResponseDto })
  async getById(@Param('id') id: string): Promise<MarkerResponseDto> {
    return this.markersService.getById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOkResponse({ type: MarkerResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMarkerDto,
  ): Promise<MarkerResponseDto> {
    return this.markersService.update(id, dto);
  }

  @Put(':id/model')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @ApiOkResponse({ type: MarkerResponseDto })
  async setModel(
    @Param('id') id: string,
    @Body() dto: SetMarkerModelDto,
  ): Promise<MarkerResponseDto> {
    return this.markersService.setModel(id, dto);
  }

  @Delete(':id/model')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeModel(@Param('id') id: string): Promise<void> {
    return this.markersService.removeModel(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@Param('id') id: string): Promise<void> {
    return this.markersService.archive(id);
  }
}
