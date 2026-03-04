/**
 * Contacts Controller - CRUD de contatos por setor
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactsService } from './contacts.service';
import { UpsertContactDto, CreateContactDto, UpdateContactDto } from './contacts.dto';

@Controller('contacts')
@UseGuards(AuthGuard('jwt'))
export class ContactsController {
    constructor(private contactsService: ContactsService) { }

    @Get()
    async findAll(@Query('sector') sector?: string) {
        return this.contactsService.findAll(sector);
    }

    @Get('sectors')
    async getSectors() {
        return this.contactsService.getSectors();
    }

    @Get('by-jid/:jid')
    async findByJid(@Param('jid') jid: string) {
        return this.contactsService.findByJid(decodeURIComponent(jid));
    }

    @Post()
    async create(@Body() dto: CreateContactDto) {
        return this.contactsService.create(dto);
    }

    /**
     * Upsert contact by JID - Create or Update
     * Used by WhatsApp bot to auto-create/update contacts
     */
    @Post('upsert')
    @SetMetadata('isPublic', true) // Allow bot to call without JWT
    async upsert(@Body() dto: UpsertContactDto) {
        const { jid, ...contactData } = dto;
        return this.contactsService.upsertByJid(jid, contactData);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactsService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.contactsService.delete(id);
    }
}
