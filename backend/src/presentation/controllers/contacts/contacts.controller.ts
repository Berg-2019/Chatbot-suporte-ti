import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ContactService } from '../../../infrastructure/services/contact.service';
import {
    CreateContactDto,
    UpdateContactDto,
    QueryContactDto,
} from '../../../domain/dtos/contact';
import {
    UpsertContactDto,
    BlockContactDto,
    DetectSpamDto,
    IncrementSpamScoreDto,
} from './contacts.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
    constructor(private readonly contactService: ContactService) { }

    @Get('sectors')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async getSectors() {
        return this.contactService.getSectors();
    }

    @Get('blocked')
    @Roles('ADMIN', 'ADMIN_TI')
    async getBlockedContacts() {
        return this.contactService.getBlockedContacts();
    }

    @Get('spam/stats')
    @Roles('ADMIN', 'ADMIN_TI')
    async getSpamStats() {
        return this.contactService.getSpamStats();
    }

    @Get('phone/:phoneNumber')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async findByPhone(@Param('phoneNumber') phoneNumber: string) {
        return this.contactService.findByPhone(phoneNumber);
    }

    @Get('jid/:jid/is-blocked')
    async isBlocked(@Param('jid') jid: string) {
        const blocked = await this.contactService.isBlocked(decodeURIComponent(jid));
        return { jid, isBlocked: blocked };
    }

    @Get('jid/:jid')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async findByJid(@Param('jid') jid: string) {
        return this.contactService.findByJid(decodeURIComponent(jid));
    }

    @Get()
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async findAll(@Query() query: QueryContactDto) {
        return this.contactService.findAll(query as any);
    }

    @Get(':id')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }

    @Get(':id/tickets')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async getTicketHistory(@Param('id') id: string, @Query('limit') limit?: string) {
        return this.contactService.getTicketHistory(id, limit ? parseInt(limit, 10) : 10);
    }

    @Get(':id/stats')
    @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
    async getStats(@Param('id') id: string) {
        return this.contactService.getContactStats(id);
    }

    @Post()
    @Roles('ADMIN', 'ADMIN_TI')
    async create(@Body() dto: CreateContactDto) {
        return this.contactService.create(dto as any);
    }

    @Post('upsert')
    async upsert(@Body() dto: UpsertContactDto) {
        const { jid, ...contactData } = dto;
        return this.contactService.upsertByJid(jid, contactData as any);
    }

    @Post('upsert/jid')
    @Roles('ADMIN', 'ADMIN_TI')
    async upsertByJid(
        @Body() dto: { jid: string; phoneNumber: string; name: string; email?: string; sector?: string; company?: string; department?: string; ramal?: string },
    ) {
        const { jid, ...data } = dto;
        return this.contactService.upsertByJid(jid, { ...data, sector: data.sector as any });
    }

    @Post('upsert/phone')
    @Roles('ADMIN', 'ADMIN_TI')
    async upsertByPhone(
        @Body() dto: { phoneNumber: string; name: string; jid?: string; email?: string; sector?: string; company?: string },
    ) {
        const { phoneNumber, ...data } = dto;
        return this.contactService.upsertByPhone(phoneNumber, data as any);
    }

    @Post('spam/detect')
    async detectSpam(@Body() body: DetectSpamDto) {
        return this.contactService.detectSpamPatterns(body.message);
    }

    @Post(':id/block')
    @Roles('ADMIN', 'ADMIN_TI')
    async blockContact(@Param('id') id: string, @Body() body: BlockContactDto) {
        return this.contactService.blockContact(id, body.blockedBy, body.reason);
    }

    @Post(':id/unblock')
    @Roles('ADMIN', 'ADMIN_TI')
    async unblockContact(@Param('id') id: string) {
        return this.contactService.unblockContact(id);
    }

    @Post(':id/merge/:mergeId')
    @Roles('ADMIN', 'ADMIN_TI')
    async mergeContacts(@Param('id') keepId: string, @Param('mergeId') mergeId: string) {
        return this.contactService.mergeContacts(keepId, mergeId);
    }

    @Patch('jid/:jid/spam-score')
    async incrementSpamScore(@Param('jid') jid: string, @Body() body: IncrementSpamScoreDto) {
        return this.contactService.incrementSpamScore(decodeURIComponent(jid), body.points || 10);
    }

    @Put(':id')
    @Roles('ADMIN', 'ADMIN_TI')
    async updatePut(@Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactService.update(id, dto as any);
    }

    @Patch(':id')
    @Roles('ADMIN', 'ADMIN_TI')
    async updatePatch(@Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactService.update(id, dto as any);
    }

    @Patch(':id/custom-attributes')
    @Roles('ADMIN', 'ADMIN_TI')
    async updateCustomAttributes(@Param('id') id: string, @Body() attributes: Record<string, any>) {
        return this.contactService.updateCustomAttributes(id, attributes);
    }

    @Delete(':id')
    @Roles('ADMIN', 'ADMIN_TI')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string) {
        await this.contactService.delete(id);
    }
}
