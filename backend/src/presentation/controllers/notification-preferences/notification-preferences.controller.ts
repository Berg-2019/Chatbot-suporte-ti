import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
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

    @Get()
    getPreferences(@Req() req: any) {
        return this.preferencesService.getPreferences(req.user.id);
    }

    @Put()
    updatePreferences(
        @Req() req: any,
        @Body() dto: UpdateNotificationPreferencesDto,
    ) {
        return this.preferencesService.updatePreferences(req.user.id, dto);
    }
}
