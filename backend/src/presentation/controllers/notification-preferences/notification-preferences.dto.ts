/**
 * Notification Preferences DTOs
 */

import { IsString, IsBoolean, IsInt, Min, Max, IsOptional, IsIn } from 'class-validator';

export class UpdateNotificationPreferencesDto {
    @IsOptional()
    @IsString()
    @IsIn(['default', 'bell', 'chime', 'ping', 'custom'])
    notificationSound?: string;

    @IsOptional()
    @IsString()
    customSoundUrl?: string;

    @IsOptional()
    @IsBoolean()
    soundEnabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    soundVolume?: number;
}
