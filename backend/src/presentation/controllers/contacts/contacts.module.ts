/**
 * Contacts Module
 */

import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsEnhancedController } from './contacts-enhanced.controller';
import { ContactsService } from './contacts.service';
import { ContactService } from '../../../infrastructure/services/contact.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    controllers: [
        ContactsController,
        ContactsEnhancedController,
    ],
    providers: [
        ContactsService,
        ContactService,
    ],
    exports: [ContactsService, ContactService],
})
export class ContactsModule { }
