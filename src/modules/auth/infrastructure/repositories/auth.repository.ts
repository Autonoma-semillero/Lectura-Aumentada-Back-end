import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Document } from 'mongodb';
import { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { MONGO_CONNECTION } from '../../../../database/mongodb.providers';
import { IAuthRepository } from '../../domain/interfaces/auth.repository.interface';
import { verifyPassword } from '../../domain/password.util';
import { AuthPayload, AuthTokens, SessionUser } from '../../domain/types/auth.types';

/**
 * Capa infrastructure: acceso a usuarios y emisión de tokens.
 */
@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Connection,
    private readonly jwtService: JwtService,
  ) {}

  private db() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }
    return db;
  }

  private usersCollection() {
    return this.db().collection<Document>('users');
  }

  private sessionsCollection() {
    return this.db().collection<Document>('sessions');
  }

  private toSessionUser(doc: Document): SessionUser {
    const id = doc._id as Types.ObjectId;
    return {
      id: id.toHexString(),
      email: doc.email as string,
      display_name: doc.display_name as string | undefined,
      roles: (doc.roles as string[] | undefined) ?? ['student'],
      status: doc.status as SessionUser['status'],
    };
  }

  async validateUser(email: string, password: string): Promise<SessionUser | null> {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return null;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length === 0) {
      return null;
    }

    const userDoc = await this.usersCollection().findOne({ email: normalizedEmail });
    if (!userDoc) {
      return null;
    }

    const status = userDoc.status as string | undefined;
    if (status && status !== 'active') {
      return null;
    }

    const storedHash = userDoc.password_hash as string | undefined;
    if (!verifyPassword(password, storedHash)) {
      return null;
    }

    return this.toSessionUser(userDoc);
  }

  async createSession(userId: string, token: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      return;
    }

    const now = new Date();
    await this.sessionsCollection().insertOne({
      user_id: new Types.ObjectId(userId),
      session_type: 'app',
      started_at: now,
      status: 'open',
      client_metadata: {
        access_token: token,
      },
      created_at: now,
      updated_at: now,
    });
  }

  async revokeSession(token: string): Promise<void> {
    await this.sessionsCollection().updateMany(
      {
        'client_metadata.access_token': token,
        status: 'open',
      },
      {
        $set: {
          status: 'closed',
          ended_at: new Date(),
          updated_at: new Date(),
        },
      },
    );
  }

  async issueTokens(payload: AuthPayload): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
