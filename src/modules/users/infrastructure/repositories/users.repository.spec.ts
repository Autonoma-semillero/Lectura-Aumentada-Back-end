import type { Document } from 'mongodb';
import { Types } from 'mongoose';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  it('omits optional undefined fields when inserting a user', async () => {
    let insertedDocument: Document | undefined;
    const insertedId = new Types.ObjectId();
    const collection = {
      insertOne: jest.fn(async (document: Document) => {
        insertedDocument = document;
        return { insertedId };
      }),
      findOne: jest.fn(async () => ({
        _id: insertedId,
        ...insertedDocument,
      })),
    };
    const connection = {
      db: { collection: jest.fn(() => collection) },
    };
    const usersRepository = new UsersRepository(connection as never);

    await usersRepository.create({
      email: 'ANA@EJEMPLO.COM',
      username: 'ANA.GARCIA',
      roles: ['student'],
      status: 'active',
      password_hash: 'scrypt:hash',
    });

    expect(insertedDocument).toMatchObject({
      email: 'ana@ejemplo.com',
      username: 'ana.garcia',
      roles: ['student'],
      status: 'active',
      password_hash: 'scrypt:hash',
    });
    expect(insertedDocument).not.toHaveProperty('display_name');
    expect(insertedDocument).not.toHaveProperty('metadata');
  });
});
