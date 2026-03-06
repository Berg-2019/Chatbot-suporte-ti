/**
 * Notification Preferences Module
 */

import { Module } from '@nestjs/common';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NotificationPreferencesController],
    providers: [NotificationPreferencesService],
    exports: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
