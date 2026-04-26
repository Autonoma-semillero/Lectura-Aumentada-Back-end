import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_SEED_REPOSITORY } from '../domain/constants/auth.tokens';
import { IAuthSeedRepository } from '../domain/interfaces/auth-seed.repository.interface';
import { hashPassword } from '../domain/password.util';

@Injectable()
export class AuthSeedService implements OnModuleInit {
  private readonly logger = new Logger(AuthSeedService.name);

  constructor(
    @Inject(AUTH_SEED_REPOSITORY)
    private readonly authSeedRepository: IAuthSeedRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get<string>('env.nodeEnv') ?? 'development';
    const shouldSeed =
      nodeEnv !== 'production' &&
      (this.configService.get<string>('env.authDemoSeedEnabled') ?? 'true') === 'true';

    if (!shouldSeed) {
      return;
    }

    await this.upsertDemoUser({
      email:
        this.configService.get<string>('env.demoStudentEmail') ??
        'student@lectura.app',
      password:
        this.configService.get<string>('env.demoStudentPassword') ??
        'Lectura123!',
      displayName:
        this.configService.get<string>('env.demoStudentDisplayName') ??
        'Demo Student',
      roles: ['student'],
      label: 'student',
    });
    await this.upsertDemoUser({
      email:
        this.configService.get<string>('env.demoStudentTwoEmail') ??
        'student2@lectura.app',
      password:
        this.configService.get<string>('env.demoStudentTwoPassword') ??
        'Lectura123!',
      displayName:
        this.configService.get<string>('env.demoStudentTwoDisplayName') ??
        'Demo Student 2',
      roles: ['student'],
      label: 'student-2',
    });
    await this.upsertDemoUser({
      email:
        this.configService.get<string>('env.demoTeacherEmail') ??
        'teacher@lectura.app',
      password:
        this.configService.get<string>('env.demoTeacherPassword') ??
        'Lectura123!',
      displayName:
        this.configService.get<string>('env.demoTeacherDisplayName') ??
        'Demo Teacher',
      roles: ['teacher'],
      label: 'teacher',
    });
  }

  private async upsertDemoUser(
    input: {
      email: string;
      password: string;
      displayName: string;
      roles: string[];
      label: string;
    },
  ): Promise<void> {
    const created = await this.authSeedRepository.createDemoUserIfNotExists({
      email: input.email,
      passwordHash: hashPassword(input.password),
      displayName: input.displayName,
      roles: input.roles,
    });
    if (!created) {
      return;
    }
    const email = input.email.toLowerCase();
    this.logger.log(`Seeded demo ${input.label} user: ${email}`);
  }
}
