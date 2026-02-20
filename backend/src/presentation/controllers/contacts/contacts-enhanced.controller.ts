import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ContactService } from '../../../infrastructure/services/contact.service';
import {
  CreateContactDto,
  UpdateContactDto,
  QueryContactDto,
} from '../../../domain/dtos/contact';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsEnhancedController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * GET /contacts
   * Listar todos os contatos com filtros e paginação
   */
  @Get()
  @Roles('ADMIN', 'AGENT')
  async findAll(@Query() query: QueryContactDto) {
    return this.contactService.findAll(query);
  }

  /**
   * GET /contacts/sectors
   * Listar setores únicos
   */
  @Get('sectors')
  @Roles('ADMIN', 'AGENT')
  async getSectors() {
    return this.contactService.getSectors();
  }

  /**
   * GET /contacts/:id
   * Buscar contato por ID
   */
  @Get(':id')
  @Roles('ADMIN', 'AGENT')
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  /**
   * GET /contacts/:id/tickets
   * Histórico de tickets do contato
   */
  @Get(':id/tickets')
  @Roles('ADMIN', 'AGENT')
  async getTicketHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.contactService.getTicketHistory(id, parsedLimit);
  }

  /**
   * GET /contacts/:id/stats
   * Estatísticas do contato
   */
  @Get(':id/stats')
  @Roles('ADMIN', 'AGENT')
  async getStats(@Param('id') id: string) {
    return this.contactService.getContactStats(id);
  }

  /**
   * GET /contacts/phone/:phoneNumber
   * Buscar contato por telefone
   */
  @Get('phone/:phoneNumber')
  @Roles('ADMIN', 'AGENT')
  async findByPhone(@Param('phoneNumber') phoneNumber: string) {
    return this.contactService.findByPhone(phoneNumber);
  }

  /**
   * GET /contacts/jid/:jid
   * Buscar contato por JID
   */
  @Get('jid/:jid')
  @Roles('ADMIN', 'AGENT')
  async findByJid(@Param('jid') jid: string) {
    return this.contactService.findByJid(decodeURIComponent(jid));
  }

  /**
   * POST /contacts
   * Criar novo contato
   */
  @Post()
  @Roles('ADMIN', 'AGENT')
  async create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  /**
   * POST /contacts/upsert/jid
   * Criar ou atualizar contato por JID
   */
  @Post('upsert/jid')
  @Roles('ADMIN', 'AGENT')
  async upsertByJid(
    @Body()
    dto: {
      jid: string;
      phoneNumber: string;
      name: string;
      email?: string;
      sector?: string;
      company?: string;
      department?: string;
      ramal?: string;
    },
  ) {
    const { jid, ...data } = dto;
    return this.contactService.upsertByJid(jid, data);
  }

  /**
   * POST /contacts/upsert/phone
   * Criar ou atualizar contato por telefone
   */
  @Post('upsert/phone')
  @Roles('ADMIN', 'AGENT')
  async upsertByPhone(
    @Body()
    dto: {
      phoneNumber: string;
      name: string;
      jid?: string;
      email?: string;
      sector?: string;
      company?: string;
    },
  ) {
    const { phoneNumber, ...data } = dto;
    return this.contactService.upsertByPhone(phoneNumber, data);
  }

  /**
   * POST /contacts/:id/merge/:mergeId
   * Merge de contatos duplicados
   */
  @Post(':id/merge/:mergeId')
  @Roles('ADMIN')
  async mergeContacts(@Param('id') keepId: string, @Param('mergeId') mergeId: string) {
    return this.contactService.mergeContacts(keepId, mergeId);
  }

  /**
   * PATCH /contacts/:id
   * Atualizar contato
   */
  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactService.update(id, dto);
  }

  /**
   * PATCH /contacts/:id/custom-attributes
   * Atualizar custom attributes (merge)
   */
  @Patch(':id/custom-attributes')
  @Roles('ADMIN', 'AGENT')
  async updateCustomAttributes(
    @Param('id') id: string,
    @Body() attributes: Record<string, any>,
  ) {
    return this.contactService.updateCustomAttributes(id, attributes);
  }

  /**
   * DELETE /contacts/:id
   * Deletar contato
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.contactService.delete(id);
  }
}
