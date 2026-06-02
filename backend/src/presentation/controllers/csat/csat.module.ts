import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { CsatController } from './csat.controller';
import { CsatService } from './csat.service';

@Module({
  imports: [PrismaModule],
  controllers: [CsatController],
  providers: [CsatService],
  exports: [CsatService],
})
export class CsatModule {}
