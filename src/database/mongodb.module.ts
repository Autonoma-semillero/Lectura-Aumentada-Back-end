import { Global, Module } from '@nestjs/common';
import { mongodbProviders } from './mongodb.providers';

/**
 * Módulo global de infraestructura para conexión a MongoDB.
 */
@Global()
@Module({
  providers: [...mongodbProviders],
  exports: [...mongodbProviders],
})
export class MongoDbModule {}
