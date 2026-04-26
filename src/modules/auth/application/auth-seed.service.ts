import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Collection, Document } from 'mongodb';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../database/mongodb.providers';
import { hashPassword } from '../domain/password.util';

@Injectable()
export class AuthSeedService implements OnModuleInit {
  private readonly logger = new Logger(AuthSeedService.name);

  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
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

    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }

    const users = db.collection<Document>('users');
    await this.upsertDemoUser(users, {
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
    await this.upsertDemoUser(users, {
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
    await this.upsertDemoUser(users, {
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
    users: Collection<Document>,
    input: {
      email: string;
      password: string;
      displayName: string;
      roles: string[];
      label: string;
    },
  ): Promise<void> {
    const email = input.email.toLowerCase();
    const existing = await users.findOne({ email });
    if (existing) {
      return;
    }

    const now = new Date();
    await users.insertOne({
      email,
      display_name: input.displayName,
      roles: input.roles,
      status: 'active',
      password_hash: hashPassword(input.password),
      metadata: {
        seeded_by: 'AuthSeedService',
      },
      created_at: now,
      updated_at: now,
    });

    this.logger.log(`Seeded demo ${input.label} user: ${email}`);
  }
}
