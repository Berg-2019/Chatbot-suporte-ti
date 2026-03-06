/**
 * Notification Preferences Controller
 */

import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './notification-preferences.dto';

@Controller('notification-preferences')
@UseGuards(AuthGuard('jwt'))
export class NotificationPreferencesController {
    constructor(private preferencesService: NotificationPreferencesService) {}

    @Get('sounds')
    getAvailableSounds() {
        return this.preferencesService.getAvailableSounds();
    }

    @Get(':userId')
    getPreferences(@Param('userId') userId: string) {
        return this.preferencesService.getPreferences(userId);
    }

    @Put(':userId')
    updatePreferences(
        @Param('userId') userId: string,
        @Body() dto: UpdateNotificationPreferencesDto,
    ) {
        return this.preferencesService.updatePreferences(userId, dto);
    }
}
