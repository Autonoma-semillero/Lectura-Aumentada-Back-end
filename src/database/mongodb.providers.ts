import { ConfigService } from '@nestjs/config';
import { Connection, createConnection } from 'mongoose';

export const MONGO_CONNECTION = 'MONGO_CONNECTION';

export const mongodbProviders = [
  {
    provide: MONGO_CONNECTION,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService): Promise<Connection> => {
      const uri = configService.get<string>('database.uri');
      if (!uri) {
        throw new Error('Missing database.uri configuration');
      }
      return createConnection(uri).asPromise();
    },
  },
];
