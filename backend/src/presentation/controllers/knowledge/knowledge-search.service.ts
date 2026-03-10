/**
 * Knowledge Search Service
 * Intelligent FAQ search with intent detection
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IntentService } from '../intent/intent.service';

@Injectable()
export class KnowledgeSearchService {
  constructor(
    private prisma: PrismaService,
    private intentService: IntentService,
  ) {}

  /**
   * Suggest articles based on ticket message using intent detection
   */
  async suggestArticles(ticketMessage: string, limit: number = 5) {
    try {
      // 1. Classify intent
      const classification = await this.intentService.classify(ticketMessage, '');

      // 2. Extract keywords
      const keywords = this.extractKeywords(ticketMessage);

      // 3. Search by keywords
      const articles = await this.searchByKeywords(keywords, limit * 2); // Get more initially

      // 4. Filter by category based on intent
      const categoryMap: Record<string, string> = {
        abrir_ticket_ti: 'Troubleshooting',
        abrir_ticket_eletrica: 'Manutenção',
        reservar_equipamento: 'Procedimentos',
      };

      const category = categoryMap[classification.intent];
      if (category) {
        const filtered = articles.filter((a) => a.category === category);
        return filtered.slice(0, limit);
      }

      return articles.slice(0, limit);
    } catch (error) {
      // Fallback to simple keyword search if intent detection fails
      const keywords = this.extractKeywords(ticketMessage);
      return this.searchByKeywords(keywords, limit);
    }
  }

  /**
   * Search articles by keywords
   */
  private async searchByKeywords(keywords: string[], limit: number) {
    if (keywords.length === 0) return [];

    // Build OR conditions for each keyword
    const orConditions = keywords.flatMap((keyword) => [
      { title: { contains: keyword, mode: 'insensitive' as const } },
      { content: { contains: keyword, mode: 'insensitive' as const } },
      { tags: { has: keyword } },
    ]);

    return this.prisma.knowledgeArticle.findMany({
      where: {
        isPublic: true,
        OR: orConditions,
      },
      orderBy: [{ helpful: 'desc' }, { views: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        views: true,
        helpful: true,
      },
    });
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Portuguese stopwords
    const stopwords = [
      'o',
      'a',
      'de',
      'da',
      'do',
      'em',
      'é',
      'que',
      'para',
      'com',
      'não',
      'um',
      'uma',
      'os',
      'as',
      'no',
      'na',
      'por',
      'mais',
      'se',
      'ao',
      'como',
      'dos',
      'das',
      'seu',
      'sua',
      'ou',
      'quando',
      'muito',
      'nos',
      'já',
      'eu',
      'também',
      'só',
      'pelo',
      'pela',
      'até',
      'isso',
      'ela',
      'entre',
      'depois',
      'sem',
      'mesmo',
      'aos',
      'ter',
      'seus',
      'quem',
      'nas',
      'me',
      'esse',
      'eles',
      'você',
      'essa',
      'num',
      'nem',
      'suas',
      'meu',
      'às',
      'minha',
      'numa',
      'pelos',
      'elas',
      'qual',
      'nós',
      'lhe',
      'deles',
      'essas',
      'esses',
      'pelas',
      'este',
      'dele',
      'tu',
      'te',
      'vocês',
      'vos',
      'lhes',
      'meus',
      'minhas',
      'teu',
      'tua',
      'teus',
      'tuas',
      'nosso',
      'nossa',
      'nossos',
      'nossas',
    ];

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopwords.includes(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Search articles with similarity score
   */
  async searchSimilar(query: string, limit: number = 10) {
    const keywords = this.extractKeywords(query);
    return this.searchByKeywords(keywords, limit);
  }
}
