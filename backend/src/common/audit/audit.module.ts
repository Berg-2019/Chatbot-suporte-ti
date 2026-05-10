import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }