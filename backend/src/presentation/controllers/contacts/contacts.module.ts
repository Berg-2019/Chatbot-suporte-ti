import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactService } from '../../../infrastructure/services/contact.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    controllers: [ContactsController],
    providers: [ContactService],
    exports: [ContactService],
})
export class ContactsModule { }
