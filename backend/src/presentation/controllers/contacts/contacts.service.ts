/**
 * Contacts Service - Gerenciamento de contatos por setor
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateContactDto {
    jid: string;
    phoneNumber?: string;
    name: string;
    sector: string;
    department?: string;
    ramal?: string;
}

interface UpdateContactDto {
    phoneNumber?: string;
    name?: string;
    sector?: string;
    department?: string;
    ramal?: string;
}

@Injectable()
export class ContactsService {
    constructor(private prisma: PrismaService) { }

    async findAll(sector?: string) {
        const where = sector ? { sector } : {};
        return this.prisma.contact.findMany({
            where,
            orderBy: [{ sector: 'asc' }, { name: 'asc' }],
        });
    }

    async findByJid(jid: string) {
        return this.prisma.contact.findUnique({
            where: { jid },
        });
    }

    async create(dto: CreateContactDto) {
        // Verificar se já existe
        const existing = await this.prisma.contact.findUnique({
            where: { jid: dto.jid },
        });

        if (existing) {
            throw new ConflictException('Contato já cadastrado');
        }

        return this.prisma.contact.create({
            data: dto,
        });
    }

    async update(id: string, dto: UpdateContactDto) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return this.prisma.contact.update({
            where: { id },
            data: dto,
        });
    }

    async upsertByJid(jid: string, dto: Omit<CreateContactDto, 'jid'>) {
        return this.prisma.contact.upsert({
            where: { jid },
            create: { jid, ...dto },
            update: dto,
        });
    }

    async delete(id: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        await this.prisma.contact.delete({
            where: { id },
        });

        return { message: 'Contato removido' };
    }

    async getSectors() {
        const contacts = await this.prisma.contact.groupBy({
            by: ['sector'],
            _count: { sector: true },
        });

        return contacts.map((c) => ({
            sector: c.sector,
            count: c._count.sector,
        }));
    }
}
