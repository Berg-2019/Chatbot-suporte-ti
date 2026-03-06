/**
 * Notification Preferences Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class NotificationPreferencesService {
    constructor(private prisma: PrismaService) {}

    /**
     * Get user notification preferences
     */
    async getPreferences(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                notificationSound: true,
                customSoundUrl: true,
                soundEnabled: true,
                soundVolume: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    /**
     * Update user notification preferences
     */
    async updatePreferences(userId: string, data: Partial<{
        notificationSound: string;
        customSoundUrl: string | null;
        soundEnabled: boolean;
        soundVolume: number;
    }>) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                notificationSound: true,
                customSoundUrl: true,
                soundEnabled: true,
                soundVolume: true,
            },
        });
    }

    /**
     * Get available sound options
     */
    getAvailableSounds() {
        return {
            sounds: [
                {
                    id: 'default',
                    name: 'Padrão',
                    description: 'Som de notificação padrão do sistema',
                    previewUrl: '/sounds/default.mp3',
                },
                {
                    id: 'bell',
                    name: 'Sino',
                    description: 'Som de sino suave',
                    previewUrl: '/sounds/bell.mp3',
                },
                {
                    id: 'chime',
                    name: 'Chime',
                    description: 'Som de chime agradável',
                    previewUrl: '/sounds/chime.mp3',
                },
                {
                    id: 'ping',
                    name: 'Ping',
                    description: 'Som curto e discreto',
                    previewUrl: '/sounds/ping.mp3',
                },
                {
                    id: 'custom',
                    name: 'Personalizado',
                    description: 'Faça upload do seu próprio som',
                    previewUrl: null,
                },
            ],
        };
    }
}
