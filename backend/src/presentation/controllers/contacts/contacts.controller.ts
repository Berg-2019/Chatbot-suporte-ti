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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactsService } from './contacts.service';

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
    async create(
        @Body()
        dto: {
            jid: string;
            phoneNumber?: string;
            name: string;
            sector: string;
            department?: string;
            ramal?: string;
        },
    ) {
        return this.contactsService.create(dto);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body()
        dto: {
            phoneNumber?: string;
            name?: string;
            sector?: string;
            department?: string;
            ramal?: string;
        },
    ) {
        return this.contactsService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.contactsService.delete(id);
    }
}
