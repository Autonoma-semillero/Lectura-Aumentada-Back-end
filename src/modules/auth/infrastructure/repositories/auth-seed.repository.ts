import { Inject, Injectable } from '@nestjs/common';
import type { Collection, Document } from 'mongodb';
import { Connection } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import {
  AuthSeedUserInput,
  IAuthSeedRepository,
} from '../../domain/interfaces/auth-seed.repository.interface';

@Injectable()
export class AuthSeedRepository implements IAuthSeedRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
  ) {}

  private db() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }
    return db;
  }

  private usersCollection(): Collection<Document> {
    return this.db().collection<Document>('users');
  }

  async createDemoUserIfNotExists(input: AuthSeedUserInput): Promise<boolean> {
    const email = input.email.toLowerCase();
    const existing = await this.usersCollection().findOne({ email });
    if (existing) {
      return false;
    }

    const now = new Date();
    await this.usersCollection().insertOne({
      email,
      display_name: input.displayName,
      roles: input.roles,
      status: 'active',
      password_hash: input.passwordHash,
      metadata: {
        seeded_by: 'AuthSeedService',
      },
      created_at: now,
      updated_at: now,
    });
    return true;
  }
}
