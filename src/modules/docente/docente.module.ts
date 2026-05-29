import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../database/mongodb.module';
import { DocenteService } from './application/docente.service';
import { DOCENTE_REPOSITORY } from './domain/constants/docente.tokens';
import { DocenteRepository } from './infrastructure/repositories/docente.repository';
import { DocenteController } from './presentation/docente.controller';

@Module({
  imports: [MongoDbModule],
  controllers: [DocenteController],
  providers: [
    DocenteService,
    {
      provide: DOCENTE_REPOSITORY,
      useClass: DocenteRepository,
    },
  ],
})
export class DocenteModule {}
