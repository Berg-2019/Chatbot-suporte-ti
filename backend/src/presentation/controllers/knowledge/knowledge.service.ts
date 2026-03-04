/**
 * Knowledge Service - Base de Conhecimento / Wiki
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateArticleDto {
  title: string;
  content: string;
  category: string;
  isPublic?: boolean;
  isInternal?: boolean;
  tags?: string[];
  authorId: string;
}

interface UpdateArticleDto {
  title?: string;
  content?: string;
  category?: string;
  isPublic?: boolean;
  isInternal?: boolean;
  tags?: string[];
}

interface ArticleQueryDto {
  category?: string;
  isPublic?: boolean;
  status?: string;
  tag?: string;
  search?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateArticleDto) {
    const slug = this.generateSlug(dto.title);

    return this.prisma.knowledgeArticle.create({
      data: {
        ...dto,
        tags: dto.tags || [],
      },
      include: { author: { select: { name: true, email: true } } },
    });
  }

  async findAll(filters: ArticleQueryDto = {}) {
    const where: any = {};

    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where,
        include: { author: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 20,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return { articles, total };
  }

  async findById(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, email: true } },
        feedback: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Increment views
    await this.prisma.knowledgeArticle.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: dto,
      include: { author: { select: { name: true, email: true } } },
    });
  }

  async delete(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.prisma.knowledgeArticle.delete({
      where: { id },
    });

    return { message: 'Article deleted successfully' };
  }

  async markHelpful(articleId: string, userId: string, helpful: boolean, comment?: string) {
    await this.prisma.articleFeedback.create({
      data: { articleId, userId, helpful, comment },
    });

    // Update counter
    await this.prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: helpful
        ? { helpful: { increment: 1 } }
        : { helpful: { decrement: 1 } }, // Using decrement to track "not helpful"
    });

    return { success: true };
  }

  async getPopular(limit: number = 10) {
    return this.prisma.knowledgeArticle.findMany({
      where: { isPublic: true },
      orderBy: [{ views: 'desc' }, { helpful: 'desc' }],
      take: limit,
      include: { author: { select: { name: true } } },
    });
  }

  async getRelated(articleId: string, limit: number = 5) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) return [];

    // Find articles with similar tags
    return this.prisma.knowledgeArticle.findMany({
      where: {
        id: { not: articleId },
        tags: { hasSome: article.tags },
        isPublic: true,
      },
      take: limit,
      orderBy: { views: 'desc' },
      include: { author: { select: { name: true } } },
    });
  }

  async getCategories() {
    const articles = await this.prisma.knowledgeArticle.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    return articles.map((a) => ({
      category: a.category,
      count: a._count.category,
    }));
  }

  async getTags() {
    const articles = await this.prisma.knowledgeArticle.findMany({
      select: { tags: true },
    });

    // Flatten and count tags
    const tagMap = new Map<string, number>();
    articles.forEach((article) => {
      article.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
