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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { GroupsService } from '../application/groups.service';
import type { GroupsRequester } from '../domain/types/groups-requester.type';
import { AddGroupMembersDto } from '../dto/add-group-members.dto';
import {
  AudienceSearchResponseDto,
  GroupAudienceItemDto,
  StudentAudienceItemDto,
} from '../dto/audience-search-response.dto';
import { CreateGroupDto } from '../dto/create-group.dto';
import { GroupResponseDto } from '../dto/group-response.dto';
import { ListGroupsQueryDto } from '../dto/list-groups-query.dto';
import { SearchAudienceQueryDto } from '../dto/search-audience-query.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@ApiExtraModels(StudentAudienceItemDto, GroupAudienceItemDto)
@UseGuards(RolesGuard)
@Roles('teacher', 'admin')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOkResponse({ type: GroupResponseDto, isArray: true })
  async list(
    @Query() query: ListGroupsQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<GroupResponseDto[]> {
    return this.groupsService.list(query, this.toRequester(req));
  }

  @Get('audience/search')
  @ApiOkResponse({ type: AudienceSearchResponseDto })
  async searchAudience(
    @Query() query: SearchAudienceQueryDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<AudienceSearchResponseDto> {
    return this.groupsService.searchAudience(query, this.toRequester(req));
  }

  @Get(':id')
  @ApiOkResponse({ type: GroupResponseDto })
  async getById(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<GroupResponseDto> {
    return this.groupsService.getById(id, this.toRequester(req));
  }

  @Post()
  @ApiOkResponse({ type: GroupResponseDto })
  async create(
    @Body() dto: CreateGroupDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<GroupResponseDto> {
    return this.groupsService.create(dto, this.toRequester(req));
  }

  @Patch(':id')
  @ApiOkResponse({ type: GroupResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, dto, this.toRequester(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.groupsService.archive(id, this.toRequester(req));
  }

  @Post(':id/members')
  @ApiOkResponse({ type: GroupResponseDto })
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddGroupMembersDto,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<GroupResponseDto> {
    return this.groupsService.addMembers(id, dto, this.toRequester(req));
  }

  @Delete(':id/members/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Req() req: Request & { user: AuthRequestUser },
  ): Promise<void> {
    return this.groupsService.removeMember(
      id,
      studentId,
      this.toRequester(req),
    );
  }

  private toRequester(
    req: Request & { user: AuthRequestUser },
  ): GroupsRequester {
    return {
      userId: req.user.userId,
      role: req.user.role as 'teacher' | 'admin',
    };
  }
}
