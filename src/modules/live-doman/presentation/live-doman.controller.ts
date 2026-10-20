import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthRequestUser } from '../../auth/dto/auth-request-user.dto';
import { LiveDomanService } from '../application/live-doman.service';
import { AcknowledgeLiveSessionDto, CreateLiveCardDto, CreateLiveObservationDto, CreateLiveSessionDto, CreateRepertoireDto, LiveSessionCommandDto, UpdateLiveCardDto } from '../dto/live-doman.dto';

@ApiTags('live-doman')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('student', 'teacher', 'admin')
@Controller('doman')
export class LiveDomanController {
  constructor(private readonly liveDomanService: LiveDomanService) {}

  @Get('cards') @Roles('teacher', 'admin')
  listCards(@Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.listCards(this.requester(req)); }

  @Post('cards') @Roles('teacher', 'admin') @HttpCode(HttpStatus.CREATED)
  createCard(@Body() dto: CreateLiveCardDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.createCard(dto, this.requester(req)); }

  @Patch('cards/:id') @Roles('teacher', 'admin')
  updateCard(@Param('id') id: string, @Body() dto: UpdateLiveCardDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.updateCard(id, dto, this.requester(req)); }

  @Get('repertoires') @Roles('teacher', 'admin')
  listRepertoires(@Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.listRepertoires(this.requester(req)); }

  @Post('repertoires') @Roles('teacher', 'admin') @HttpCode(HttpStatus.CREATED)
  createRepertoire(@Body() dto: CreateRepertoireDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.createRepertoire(dto, this.requester(req)); }

  @Post('live-sessions') @Roles('teacher', 'admin') @HttpCode(HttpStatus.CREATED)
  createSession(@Body() dto: CreateLiveSessionDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.createSession(dto, this.requester(req)); }

  @Get('live-sessions') @Roles('teacher', 'admin')
  listSessions(@Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.listSessions(this.requester(req)); }

  @Get('live-sessions/current') @Roles('student')
  current(@Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.getCurrentSessions(this.requester(req)); }

  @Post('live-realtime-token') @Roles('student') @HttpCode(HttpStatus.OK)
  studentFeedRealtimeToken(@Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.getStudentFeedRealtimeToken(this.requester(req)); }

  /** Called by Vercel Cron with CRON_SECRET; it expires stale rooms and retries the durable realtime outbox. */
  @Post('live-sessions/maintenance') @Public() @HttpCode(HttpStatus.OK)
  maintenance(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || authorization !== `Bearer ${secret}`) throw new UnauthorizedException('Invalid maintenance credential');
    return this.liveDomanService.runMaintenance();
  }

  @Get('live-sessions/:id')
  getSession(@Param('id') id: string, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.getSession(id, this.requester(req)); }

  @Post('live-sessions/:id/join') @Roles('student')
  join(@Param('id') id: string, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.joinSession(id, this.requester(req)); }

  @Post('live-sessions/:id/heartbeat') @Roles('student') @HttpCode(HttpStatus.NO_CONTENT)
  heartbeat(@Param('id') id: string, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.heartbeat(id, this.requester(req)); }

  @Post('live-sessions/:id/realtime-token') @HttpCode(HttpStatus.OK)
  realtimeToken(@Param('id') id: string, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.getRealtimeToken(id, this.requester(req)); }

  @Post('live-sessions/:id/commands') @Roles('teacher', 'admin')
  command(@Param('id') id: string, @Body() dto: LiveSessionCommandDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.command(id, dto, this.requester(req)); }

  @Post('live-sessions/:id/acknowledge') @Roles('student') @HttpCode(HttpStatus.NO_CONTENT)
  acknowledge(@Param('id') id: string, @Body() dto: AcknowledgeLiveSessionDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.acknowledge(id, dto, this.requester(req)); }

  @Post('live-sessions/:id/observations') @Roles('teacher', 'admin') @HttpCode(HttpStatus.NO_CONTENT)
  observe(@Param('id') id: string, @Body() dto: CreateLiveObservationDto, @Req() req: Request & { user: AuthRequestUser }) { return this.liveDomanService.observe(id, dto, this.requester(req)); }

  private requester(req: Request & { user: AuthRequestUser }) { return { userId: req.user.userId, role: req.user.role }; }
}
