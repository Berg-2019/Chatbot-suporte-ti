/**
 * FAQ Service - Base de Conhecimento
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateFaqDto {
  question: string;
  answer: string;
  keywords: string;
  category?: string;
}

interface UpdateFaqDto {
  question?: string;
  answer?: string;
  keywords?: string;
  category?: string;
  active?: boolean;
}

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { active: true };
    
    return this.prisma.faq.findMany({
      where,
      orderBy: { views: 'desc' },
    });
  }

  async findById(id: string) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ não encontrada');
    return faq;
  }

  /**
   * Busca FAQs por palavras-chave
   * Retorna FAQs que contenham qualquer uma das palavras buscadas
   */
  async search(query: string, limit = 3) {
    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignorar palavras muito curtas
    
    if (words.length === 0) return [];

    // Buscar FAQs onde keywords ou question contenham alguma palavra
    const faqs = await this.prisma.faq.findMany({
      where: {
        active: true,
        OR: words.map(word => ({
          OR: [
            { keywords: { contains: word, mode: 'insensitive' as const } },
            { question: { contains: word, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: [
        { helpful: 'desc' },
        { views: 'desc' },
      ],
      take: limit,
    });

    return faqs;
  }

  async create(dto: CreateFaqDto) {
    return this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        keywords: dto.keywords.toLowerCase(),
        category: dto.category,
      },
    });
  }

  async update(id: string, dto: UpdateFaqDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.keywords) {
      data.keywords = dto.keywords.toLowerCase();
    }

    return this.prisma.faq.update({
      where: { id },
      data,
    });
  }

  async incrementViews(id: string) {
    return this.prisma.faq.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  async markHelpful(id: string) {
    return this.prisma.faq.update({
      where: { id },
      data: { helpful: { increment: 1 } },
    });
  }

  async deactivate(id: string) {
    return this.prisma.faq.update({
      where: { id },
      data: { active: false },
    });
  }
}
