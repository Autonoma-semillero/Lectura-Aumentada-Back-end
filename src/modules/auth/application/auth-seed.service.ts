import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Document } from 'mongodb';
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

    const email =
      this.configService.get<string>('env.demoStudentEmail') ?? 'student@lectura.app';
    const password =
      this.configService.get<string>('env.demoStudentPassword') ?? 'Lectura123!';
    const displayName =
      this.configService.get<string>('env.demoStudentDisplayName') ?? 'Demo Student';

    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }

    const users = db.collection<Document>('users');
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return;
    }

    const now = new Date();
    await users.insertOne({
      email: email.toLowerCase(),
      display_name: displayName,
      roles: ['student'],
      status: 'active',
      password_hash: hashPassword(password),
      metadata: {
        seeded_by: 'AuthSeedService',
      },
      created_at: now,
      updated_at: now,
    });

    this.logger.log(`Seeded demo student user: ${email.toLowerCase()}`);
  }
}
