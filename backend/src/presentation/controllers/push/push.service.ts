import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayloadInput {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:dev@helpdeskmsm.com.br';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
      this.logger.log('VAPID configured — push notifications ativas');
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — push notifications inativas',
      );
    }
  }

  async subscribe(userId: string, data: PushSubscriptionData) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
    });

    if (existing) {
      if (existing.userId !== userId) {
        await this.prisma.pushSubscription.update({
          where: { endpoint: data.endpoint },
          data: { userId, p256dh: data.keys.p256dh, auth: data.keys.auth },
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

    await this.prisma.pushSubscription.delete({ where: { endpoint } });
    this.logger.log(`Push subscription removed`);
    return { success: true };
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({ where: { userId } });
  }

  async sendToUser(userId: string, payload: PushPayloadInput) {
    const subscriptions = await this.getUserSubscriptions(userId);
    if (subscriptions.length === 0) return { sent: 0, failed: 0, skipped: 0 };
    return this.sendToSubscriptions(subscriptions, payload);
  }

  async sendToSector(sector: string, payload: PushPayloadInput) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { user: { sector: sector as any, active: true } },
    });
    if (subscriptions.length === 0) return { sent: 0, failed: 0, skipped: 0 };
    return this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToSubscriptions(
    subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayloadInput,
  ) {
    if (!this.vapidConfigured) {
      this.logger.warn(`Push skipped (VAPID off) — title="${payload.title}"`);
      return { sent: 0, failed: 0, skipped: subscriptions.length };
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data ?? {},
    });

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            stale.push(sub.endpoint);
          } else {
            failed++;
            this.logger.error(`Push failed (${status}): ${err?.message ?? err}`);
          }
        }
      }),
    );

    if (stale.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: stale } },
      });
      this.logger.log(`Cleaned ${stale.length} stale push subscription(s)`);
    }

    return { sent, failed, skipped: stale.length };
  }
}
