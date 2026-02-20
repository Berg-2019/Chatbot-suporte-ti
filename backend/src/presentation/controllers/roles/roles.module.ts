import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RoleService } from '../../../infrastructure/services/role.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RolesModule {}
