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
    Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { UpsertContactDto, CreateContactDto, UpdateContactDto, BlockContactDto, DetectSpamDto, IncrementSpamScoreDto, UpdateProfilePictureDto } from './contacts.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(private contactsService: ContactsService) { }

    @Get()
    async findAll(@Query('sector') sector?: string) {
        return this.contactsService.findAll(sector as any);
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
        return this.contactsService.create(dto as any);
    }

    /**
     * Upsert contact by JID - Create or Update
     * Used by WhatsApp bot to auto-create/update contacts
     */
    @Post('upsert')
    @SetMetadata('isPublic', true) // Allow bot to call without JWT
    async upsert(@Body() dto: UpsertContactDto) {
        const { jid, ...contactData } = dto;
        return this.contactsService.upsertByJid(jid, contactData as any);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactsService.update(id, dto as any);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.contactsService.delete(id);
    }

    // =====================================================
    // Spam & Blocking Endpoints
    // =====================================================

    @Get('blocked')
    async getBlockedContacts() {
        return this.contactsService.getBlockedContacts();
    }

    @Get('spam/stats')
    async getSpamStats() {
        return this.contactsService.getSpamStats();
    }

    @Post(':id/block')
    async blockContact(
        @Param('id') id: string,
        @Body() body: BlockContactDto,
    ) {
        return this.contactsService.blockContact(id, body.blockedBy, body.reason);
    }

    @Post(':id/unblock')
    async unblockContact(@Param('id') id: string) {
        return this.contactsService.unblockContact(id);
    }

    @Get('jid/:jid/is-blocked')
    @SetMetadata('isPublic', true) // Allow bot to check
    async isBlocked(@Param('jid') jid: string) {
        const blocked = await this.contactsService.isBlocked(decodeURIComponent(jid));
        return { jid, isBlocked: blocked };
    }

    @Post('spam/detect')
    @SetMetadata('isPublic', true) // Allow bot to use
    async detectSpam(@Body() body: DetectSpamDto) {
        return this.contactsService.detectSpamPatterns(body.message);
    }

    @Patch('jid/:jid/spam-score')
    @SetMetadata('isPublic', true) // Allow bot to increment
    async incrementSpamScore(
        @Param('jid') jid: string,
        @Body() body: IncrementSpamScoreDto,
    ) {
        return this.contactsService.incrementSpamScore(
            decodeURIComponent(jid),
            body.points || 10,
        );
    }

}
