/**
 * Services Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertService } from './alert.service';
import { GlpiSyncService } from './glpi-sync.service';
import { PrismaModule } from '../database/prisma.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
import { ExternalModule } from '../external/external.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        forwardRef(() => RabbitMQModule),
        ExternalModule,
    ],
    providers: [AlertService, GlpiSyncService],
    exports: [AlertService, GlpiSyncService],
})
export class ServicesModule { }

