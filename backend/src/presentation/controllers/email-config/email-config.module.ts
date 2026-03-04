/**
 * Email Config Module
 */

import { Module } from '@nestjs/common';
import { EmailConfigController } from './email-config.controller';
import { EmailConfigService } from './email-config.service';
import { EmailIngestionService } from '../../../infrastructure/email/email-ingestion.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TicketsModule } from '../tickets/tickets.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [TicketsModule, ContactsModule],
  controllers: [EmailConfigController],
  providers: [EmailConfigService, EmailIngestionService, PrismaService],
  exports: [EmailConfigService, EmailIngestionService],
})
export class EmailConfigModule {}
