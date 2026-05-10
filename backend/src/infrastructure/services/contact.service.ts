import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Sector } from '@prisma/client';
import { redactPhone, redactName } from '../logger/redact';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos os contatos com filtros e paginação
   */
  async findAll(filters?: {
    sector?: Sector;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {};

    if (filters?.sector) {
      where.sector = filters.sector as Sector;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastContactAt: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar contato por ID
   */
  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID "${id}" not found`);
    }

    return contact;
  }

  /**
   * Buscar por JID do WhatsApp
   */
  async findByJid(jid: string) {
    return this.prisma.contact.findUnique({
      where: { jid },
    });
  }

  /**
   * Buscar por número de telefone
   */
  async findByPhone(phoneNumber: string) {
    return this.prisma.contact.findFirst({
      where: { phoneNumber },
    });
  }

  /**
   * Criar novo contato
   */
  async create(data: {
    jid?: string;
    phoneNumber: string;
    name: string;
    email?: string;
    sector?: Sector;
    company?: string;
    department?: string;
    ramal?: string;
    customAttributes?: Record<string, any>;
  }) {
    this.logger.log(`Creating contact: ${redactName(data.name)} (${redactPhone(data.phoneNumber)})`);

    const contact = await this.prisma.contact.create({
      data: {
        jid: data.jid || `${data.phoneNumber}@s.whatsapp.net`,
        phoneNumber: data.phoneNumber,
        name: data.name,
        email: data.email,
        sector: (data.sector || 'TI') as Sector,
        company: data.company,
        department: data.department,
        ramal: data.ramal,
        customAttributes: data.customAttributes || {},
        firstContactAt: new Date(),
        lastContactAt: new Date(),
        totalTickets: 0,
      },
    });

    this.logger.log(`Contact created: ${contact.id}`);
    return contact;
  }

  /**
   * Atualizar contato
   */
  async update(
    id: string,
    data: {
      phoneNumber?: string;
      name?: string;
      email?: string;
      sector?: Sector;
      company?: string;
      department?: string;
      ramal?: string;
      customAttributes?: Record<string, any>;
    },
  ) {
    this.logger.log(`Updating contact: ${id}`);

    // Verificar se existe
    await this.findOne(id);

    const updateData: Prisma.ContactUpdateInput = {};

    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.sector !== undefined) updateData.sector = data.sector as Sector;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.ramal !== undefined) updateData.ramal = data.ramal;
    if (data.customAttributes !== undefined) {
      updateData.customAttributes = data.customAttributes;
    }

    const contact = await this.prisma.contact.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Contact updated: ${id}`);
    return contact;
  }

  /**
   * Deletar contato
   */
  async delete(id: string) {
    this.logger.log(`Deleting contact: ${id}`);

    // Verificar se existe
    await this.findOne(id);

    await this.prisma.contact.delete({
      where: { id },
    });

    this.logger.log(`Contact deleted: ${id}`);
    return { success: true, message: 'Contact deleted successfully' };
  }

  /**
   * Criar ou atualizar contato (upsert) por JID
   */
  async upsertByJid(
    jid: string,
    data: {
      phoneNumber: string;
      name: string;
      email?: string;
      sector?: Sector;
      company?: string;
      department?: string;
      ramal?: string;
    },
  ) {
    this.logger.debug(`Upserting contact by JID: ${jid}`);

    const contact = await this.prisma.contact.upsert({
      where: { jid },
      create: {
        jid,
        phoneNumber: data.phoneNumber,
        name: data.name,
        email: data.email,
        sector: (data.sector || 'TI') as Sector,
        company: data.company,
        department: data.department,
        ramal: data.ramal,
        customAttributes: {},
        firstContactAt: new Date(),
        lastContactAt: new Date(),
        totalTickets: 0,
      },
      update: {
        phoneNumber: data.phoneNumber,
        name: data.name,
        email: data.email,
        ...(data.sector && { sector: data.sector as Sector }),
        company: data.company,
        department: data.department,
        ramal: data.ramal,
        lastContactAt: new Date(),
      },
    });

    return contact;
  }

  /**
   * Criar ou atualizar contato por telefone
   */
  async upsertByPhone(
    phoneNumber: string,
    data: {
      name: string;
      jid?: string;
      email?: string;
      sector?: Sector;
      company?: string;
    },
  ) {
    this.logger.debug(`Upserting contact by phone: ${redactPhone(phoneNumber)}`);

    const existing = await this.findByPhone(phoneNumber);

    if (existing) {
      return this.update(existing.id, {
        name: data.name,
        email: data.email,
        sector: data.sector,
        company: data.company,
      });
    }

    return this.create({
      phoneNumber,
      jid: data.jid,
      name: data.name,
      email: data.email,
      sector: data.sector,
      company: data.company,
    });
  }

  /**
   * Atualizar customAttributes (merge)
   */
  async updateCustomAttributes(
    id: string,
    attributes: Record<string, any>,
  ) {
    const contact = await this.findOne(id);

    const currentAttributes = (contact.customAttributes as Record<string, any>) || {};
    const mergedAttributes = { ...currentAttributes, ...attributes };

    return this.prisma.contact.update({
      where: { id },
      data: {
        customAttributes: mergedAttributes,
      },
    });
  }

  /**
   * Atualizar lastContactAt
   */
  async touchContact(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: {
        lastContactAt: new Date(),
      },
    });
  }

  /**
   * Incrementar contador de tickets
   */
  async incrementTicketCount(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: {
        totalTickets: { increment: 1 },
      },
    });
  }

  /**
   * Obter histórico de tickets do contato
   */
  async getTicketHistory(id: string, limit = 10) {
    const contact = await this.findOne(id);

    if (!contact.phoneNumber) {
      return [];
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        phoneNumber: contact.phoneNumber,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tickets;
  }

  /**
   * Obter estatísticas do contato
   */
  async getContactStats(id: string) {
    const contact = await this.findOne(id);

    if (!contact.phoneNumber) {
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        openTickets: 0,
        resolutionRate: 0,
        lastTicketAt: null,
        daysSinceLastContact: Math.floor(
          (new Date().getTime() - contact.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    }

    const [totalTickets, resolvedTickets, avgResolutionTime] = await Promise.all([
      this.prisma.ticket.count({
        where: { phoneNumber: contact.phoneNumber },
      }),
      this.prisma.ticket.count({
        where: {
          phoneNumber: contact.phoneNumber,
          status: 'RESOLVED',
        },
      }),
      this.prisma.ticket.aggregate({
        where: {
          phoneNumber: contact.phoneNumber,
          status: 'RESOLVED',
          closedAt: { not: null },
        },
        _avg: {
          // Calcular tempo médio (createdAt até closedAt)
          // Nota: Prisma não suporta diretamente, então retornaremos null
        },
      }),
    ]);

    const lastTicket = await this.prisma.ticket.findFirst({
      where: { phoneNumber: contact.phoneNumber },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalTickets,
      resolvedTickets,
      openTickets: totalTickets - resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      lastTicketAt: lastTicket?.createdAt || null,
      daysSinceLastContact: contact.lastContactAt
        ? Math.floor(
            (Date.now() - new Date(contact.lastContactAt).getTime()) / (1000 * 60 * 60 * 24),
          )
        : null,
    };
  }

  /**
   * Listar setores únicos
   */
  async getSectors() {
    const contacts = await this.prisma.contact.groupBy({
      by: ['sector'],
      where: {},
      _count: true,
      orderBy: {
        _count: {
          sector: 'desc',
        },
      },
    });

    return contacts.map((c) => ({
      sector: c.sector,
      count: c._count,
    }));
  }

  /**
   * Buscar contatos similares (para evitar duplicatas)
   */
  async findSimilar(name: string, phoneNumber?: string) {
    const where: Prisma.ContactWhereInput = {
      OR: [
        {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      ],
    };

    if (phoneNumber) {
      where.OR!.push({
        phoneNumber: {
          contains: phoneNumber,
        },
      });
    }

    return this.prisma.contact.findMany({
      where,
      take: 5,
      orderBy: { lastContactAt: 'desc' },
    });
  }

  /**
   * Merge de contatos duplicados
   */
  async mergeContacts(keepId: string, mergeId: string) {
    this.logger.log(`Merging contacts: keeping ${keepId}, merging ${mergeId}`);

    const [keepContact, mergeContact] = await Promise.all([
      this.findOne(keepId),
      this.findOne(mergeId),
    ]);

    // Merge custom attributes
    const mergedAttributes = {
      ...(mergeContact.customAttributes as Record<string, any>),
      ...(keepContact.customAttributes as Record<string, any>),
    };

    // Atualizar tickets do contato mesclado (apenas se ambos tiverem phoneNumber)
    if (mergeContact.phoneNumber && keepContact.phoneNumber) {
      await this.prisma.ticket.updateMany({
        where: { phoneNumber: mergeContact.phoneNumber },
        data: { phoneNumber: keepContact.phoneNumber },
      });
    }

    // Atualizar contato principal
    await this.prisma.contact.update({
      where: { id: keepId },
      data: {
        customAttributes: mergedAttributes,
        totalTickets: {
          increment: mergeContact.totalTickets,
        },
        firstContactAt:
          new Date(mergeContact.firstContactAt) < new Date(keepContact.firstContactAt)
            ? mergeContact.firstContactAt
            : keepContact.firstContactAt,
      },
    });

    // Deletar contato mesclado
    await this.prisma.contact.delete({
      where: { id: mergeId },
    });

    this.logger.log(`Contacts merged successfully`);
    return this.findOne(keepId);
  }

  async blockContact(id: string, blockedBy: string, reason?: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contato não encontrado');

    return this.prisma.contact.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy,
        blockReason: reason || 'Bloqueio manual',
      },
    });
  }

  async unblockContact(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contato não encontrado');

    return this.prisma.contact.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
        spamScore: 0,
      },
    });
  }

  async isBlocked(jid: string): Promise<boolean> {
    const contact = await this.prisma.contact.findUnique({
      where: { jid },
      select: { isBlocked: true },
    });
    return contact?.isBlocked || false;
  }

  async getBlockedContacts() {
    return this.prisma.contact.findMany({
      where: { isBlocked: true },
      orderBy: { blockedAt: 'desc' },
    });
  }

  async incrementSpamScore(jid: string, points: number = 10) {
    const contact = await this.prisma.contact.findUnique({ where: { jid } });
    if (!contact) return null;

    const newSpamScore = Math.min(contact.spamScore + points, 100);
    const shouldAutoBlock = newSpamScore >= 80 && !contact.isBlocked;

    return this.prisma.contact.update({
      where: { jid },
      data: {
        spamScore: newSpamScore,
        ...(shouldAutoBlock && {
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: 'system',
          blockReason: `Bloqueio automático - Score de spam: ${newSpamScore}`,
        }),
      },
    });
  }

  detectSpamPatterns(message: string): { isSpam: boolean; score: number; reasons: string[] } {
    let spamScore = 0;
    const reasons: string[] = [];

    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.7 && message.length > 10) {
      spamScore += 15;
      reasons.push('Excesso de letras maiúsculas');
    }

    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiCount = (message.match(emojiRegex) || []).length;
    if (emojiCount > message.length * 0.3 && message.length > 5) {
      spamScore += 15;
      reasons.push('Excesso de emojis');
    }

    if (/(.)\1{5,}/.test(message)) {
      spamScore += 20;
      reasons.push('Caracteres repetidos em excesso');
    }

    if (/(https?:\/\/|www\.|bit\.ly|goo\.gl)/i.test(message)) {
      spamScore += 25;
      reasons.push('Contém links externos');
    }

    const phoneMatches = message.match(/\d{4,}/g) || [];
    if (phoneMatches.length > 2) {
      spamScore += 15;
      reasons.push('Múltiplos números de telefone');
    }

    const promoWords = ['compre', 'grátis', 'desconto', 'promoção', 'ganhe', 'clique', 'urgente', 'oferta'];
    if (promoWords.some(word => message.toLowerCase().includes(word))) {
      spamScore += 20;
      reasons.push('Palavras promocionais detectadas');
    }

    if (message.length > 1000) {
      spamScore += 10;
      reasons.push('Mensagem muito longa');
    }

    return {
      isSpam: spamScore >= 40,
      score: Math.min(spamScore, 100),
      reasons,
    };
  }

  async getSpamStats() {
    const [totalContacts, blockedContacts, highRiskContacts] = await Promise.all([
      this.prisma.contact.count(),
      this.prisma.contact.count({ where: { isBlocked: true } }),
      this.prisma.contact.count({ where: { spamScore: { gte: 60 }, isBlocked: false } }),
    ]);

    const avgSpamScore = await this.prisma.contact.aggregate({
      _avg: { spamScore: true },
    });

    return {
      totalContacts,
      blockedContacts,
      highRiskContacts,
      blockRate: totalContacts > 0 ? (blockedContacts / totalContacts) * 100 : 0,
      averageSpamScore: avgSpamScore._avg.spamScore || 0,
    };
  }
}
