import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditService, AuditInterceptor],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule { }