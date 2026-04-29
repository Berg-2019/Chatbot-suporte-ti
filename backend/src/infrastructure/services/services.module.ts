/**
 * Services Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertService } from './alert.service';
import { PrismaModule } from '../database/prisma.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
import { ExternalModule } from '../external/external.module';
import { MessagesModule } from '../../presentation/controllers/messages/messages.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        forwardRef(() => RabbitMQModule),
        ExternalModule,
        MessagesModule,
    ],
    providers: [AlertService],
    exports: [AlertService],
})
export class ServicesModule { }

