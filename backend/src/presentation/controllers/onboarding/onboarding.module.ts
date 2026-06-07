import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../../infrastructure/mail/mail.module';
import { WhatsAppModule } from '../../../infrastructure/whatsapp/whatsapp.module';
import { UserOnboardingService } from './user-onboarding.service';

/**
 * OnboardingModule — exporta UserOnboardingService para UsersModule/AdminModule.
 *
 * PrismaService é injetável globalmente (PrismaModule é @Global()).
 */
@Module({
  imports: [ConfigModule, MailModule, WhatsAppModule],
  providers: [UserOnboardingService],
  exports: [UserOnboardingService],
})
export class OnboardingModule {}
