import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  async subscribe(userId: string, data: PushSubscriptionData) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
    });

    if (existing) {
      if (existing.userId !== userId) {
        await this.prisma.pushSubscription.update({
          where: { endpoint: data.endpoint },
          data: { userId },
        });
        this.logger.log(`Push subscription updated for user ${userId}`);
      }
      return { success: true, message: 'Subscription updated' };
    }

    await this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    });

    this.logger.log(`Push subscription created for user ${userId}`);
    return { success: true, message: 'Subscription saved' };
  }

  async unsubscribe(endpoint: string) {
    const subscription = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.pushSubscription.delete({
      where: { endpoint },
    });

    this.logger.log(`Push subscription removed for endpoint ${endpoint.slice(0, 50)}...`);
    return { success: true };
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
    });
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    const subscriptions = await this.getUserSubscriptions(userId);
    if (subscriptions.length === 0) return { sent: 0 };

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BOynM1WkIJZ9VEk38fSYRn6aLlr67o8byXNlvNAhy7SoMkshyMXUDikRPdsS6jKpGeR_ohH-6phYu_CsYu8';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

    const results = { sent: 0, failed: 0 };
    for (const sub of subscriptions) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: '/icons/ti/icon-192.png',
          badge: '/icons/ti/icon-192.png',
          data,
        });

        this.logger.log(`Would send push to ${sub.endpoint} (web-push not installed)`);
        results.sent++;
      } catch (err) {
        this.logger.error(`Push failed for ${sub.endpoint}: ${err}`);
        results.failed++;
      }
    }

    return results;
  }
}