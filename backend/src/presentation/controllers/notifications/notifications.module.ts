import { Module } from '@nestjs/common';
import { MailModule } from '../../../infrastructure/mail/mail.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [MailModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
