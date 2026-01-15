/**
 * Services Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaModule } from '../database/prisma.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => RabbitMQModule),
    ],
    providers: [AlertService],
    exports: [AlertService],
})
export class ServicesModule { }
