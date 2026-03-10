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
        const now = new Date();

        // Buscar contato existente para verificar se já existe
        const existing = await this.prisma.contact.findUnique({
            where: { jid },
        });

        const dtoWithAttributes = dto as any;

        return this.prisma.contact.upsert({
            where: { jid },
            create: {
                jid,
                ...dto,
                firstContactAt: now,
                lastContactAt: now,
                totalTickets: 0,
                customAttributes: dtoWithAttributes.customAttributes || {},
            },
            update: {
                ...dto,
                lastContactAt: now, // Sempre atualiza último contato
                totalTickets: existing ? { increment: 1 } : 1, // Incrementa contador
                customAttributes: dtoWithAttributes.customAttributes || existing?.customAttributes || {},
            },
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

    // =====================================================
    // Spam & Blocking Management
    // =====================================================

    /**
     * Block a contact manually
     */
    async blockContact(id: string, blockedBy: string, reason?: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

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

    /**
     * Unblock a contact
     */
    async unblockContact(id: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return this.prisma.contact.update({
            where: { id },
            data: {
                isBlocked: false,
                blockedAt: null,
                blockedBy: null,
                blockReason: null,
                spamScore: 0, // Reset spam score on unblock
            },
        });
    }

    /**
     * Check if contact is blocked
     */
    async isBlocked(jid: string): Promise<boolean> {
        const contact = await this.prisma.contact.findUnique({
            where: { jid },
            select: { isBlocked: true },
        });

        return contact?.isBlocked || false;
    }

    /**
     * Get all blocked contacts
     */
    async getBlockedContacts() {
        return this.prisma.contact.findMany({
            where: { isBlocked: true },
            orderBy: { blockedAt: 'desc' },
        });
    }

    /**
     * Increment spam score for contact
     * Auto-blocks if score reaches threshold
     */
    async incrementSpamScore(jid: string, points: number = 10) {
        const contact = await this.prisma.contact.findUnique({
            where: { jid },
        });

        if (!contact) {
            return null; // Contact doesn't exist yet
        }

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

    /**
     * Detect spam patterns in message
     */
    detectSpamPatterns(message: string): { isSpam: boolean; score: number; reasons: string[] } {
        let spamScore = 0;
        const reasons: string[] = [];

        // Pattern 1: Excessive caps (>70% uppercase)
        const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
        if (capsRatio > 0.7 && message.length > 10) {
            spamScore += 15;
            reasons.push('Excesso de letras maiúsculas');
        }

        // Pattern 2: Excessive emojis (>30% emojis)
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
        const emojiCount = (message.match(emojiRegex) || []).length;
        if (emojiCount > message.length * 0.3 && message.length > 5) {
            spamScore += 15;
            reasons.push('Excesso de emojis');
        }

        // Pattern 3: Repeated characters (e.g., "aaaaaaaa", "!!!!!!")
        if (/(.)\1{5,}/.test(message)) {
            spamScore += 20;
            reasons.push('Caracteres repetidos em excesso');
        }

        // Pattern 4: URLs or links
        if (/(https?:\/\/|www\.|bit\.ly|goo\.gl)/i.test(message)) {
            spamScore += 25;
            reasons.push('Contém links externos');
        }

        // Pattern 5: Phone numbers (multiple)
        const phoneMatches = message.match(/\d{4,}/g) || [];
        if (phoneMatches.length > 2) {
            spamScore += 15;
            reasons.push('Múltiplos números de telefone');
        }

        // Pattern 6: Promotional words
        const promoWords = ['compre', 'grátis', 'desconto', 'promoção', 'ganhe', 'clique', 'urgente', 'oferta'];
        const hasPromoWords = promoWords.some(word => message.toLowerCase().includes(word));
        if (hasPromoWords) {
            spamScore += 20;
            reasons.push('Palavras promocionais detectadas');
        }

        // Pattern 7: Very long messages (>1000 chars) - potential flooding
        if (message.length > 1000) {
            spamScore += 10;
            reasons.push('Mensagem muito longa');
        }

        return {
            isSpam: spamScore >= 40, // Threshold for spam detection
            score: Math.min(spamScore, 100),
            reasons,
        };
    }

    /**
     * Get spam statistics
     */
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

    // =====================================================
    // Profile Picture Management
    // =====================================================

    /**
     * Fetch profile picture from bot service and update contact
     */
    async fetchProfilePicture(contactId: string): Promise<{ profilePicUrl: string | null }> {
        const contact = await this.prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        try {
            // Call bot service to fetch profile picture
            const botUrl = process.env.BOT_URL || 'http://localhost:3002';
            const response = await fetch(`${botUrl}/api/profile-picture/${encodeURIComponent(contact.jid)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile picture from bot');
            }

            const data = await response.json();

            // Update contact with profile picture URL
            await this.prisma.contact.update({
                where: { id: contactId },
                data: {
                    profilePicUrl: data.profilePicUrl,
                    profilePicUpdatedAt: new Date(),
                },
            });

            return { profilePicUrl: data.profilePicUrl };
        } catch (error) {
            console.error(`Error fetching profile picture for ${contact.jid}:`, error);
            return { profilePicUrl: null };
        }
    }

    /**
     * Fetch profile picture by JID
     */
    async fetchProfilePictureByJid(jid: string): Promise<{ profilePicUrl: string | null }> {
        const contact = await this.prisma.contact.findUnique({
            where: { jid },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return this.fetchProfilePicture(contact.id);
    }

    /**
     * Update profile picture URL manually
     */
    async updateProfilePicture(contactId: string, profilePicUrl: string | null) {
        const contact = await this.prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return this.prisma.contact.update({
            where: { id: contactId },
            data: {
                profilePicUrl,
                profilePicUpdatedAt: new Date(),
            },
        });
    }
}
