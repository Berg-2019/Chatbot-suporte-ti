/**
 * Contacts Module
 */

import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsEnhancedController } from './contacts-enhanced.controller';
import { ContactsService } from './contacts.service';
import { ContactService } from '../../../infrastructure/services/contact.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
// import { RolesModule } from '../roles/roles.module';  // DISABLED - requires customRole model

@Module({
    // imports: [PrismaModule, RolesModule],  // DISABLED - requires customRole model
    controllers: [
        ContactsController, // Controller legado (compatibilidade)
        ContactsEnhancedController, // Novo controller melhorado
    ],
    providers: [
        ContactsService, // Service legado (compatibilidade)
        ContactService, // Novo service melhorado
    ],
    exports: [ContactsService, ContactService],
})
export class ContactsModule { }
