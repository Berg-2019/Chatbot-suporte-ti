import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CannedResponseService {
  private readonly logger = new Logger(CannedResponseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todas as respostas prontas com filtros opcionais
   */
  async findAll(filters?: {
    category?: string;
    search?: string;
    createdBy?: string;
  }) {
    const where: Prisma.CannedResponseWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters?.search) {
      where.OR = [
        { shortcode: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const responses = await this.prisma.cannedResponse.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        // Priorizar shortcode que começa com a busca
        ...(filters?.search
          ? [{ shortcode: 'asc' as const }]
          : []),
        { createdAt: 'desc' as const },
      ],
    });

    return responses;
  }

  /**
   * Buscar por shortcode (usado ao digitar / no chat)
   */
  async findByShortcode(shortcode: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { shortcode },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!response) {
      throw new NotFoundException(`Canned response with shortcode "${shortcode}" not found`);
    }

    return response;
  }

  /**
   * Buscar por ID
   */
  async findOne(id: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!response) {
      throw new NotFoundException(`Canned response with ID "${id}" not found`);
    }

    return response;
  }

  /**
   * Criar nova resposta pronta
   */
  async create(data: {
    shortcode: string;
    content: string;
    category?: string;
    createdBy: string;
  }) {
    this.logger.log(`Creating canned response: ${data.shortcode}`);

    const response = await this.prisma.cannedResponse.create({
      data: {
        shortcode: data.shortcode.toLowerCase(), // Sempre lowercase
        content: data.content,
        category: data.category,
        createdBy: data.createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Canned response created: ${response.id}`);
    return response;
  }

  /**
   * Atualizar resposta pronta
   */
  async update(
    id: string,
    data: {
      shortcode?: string;
      content?: string;
      category?: string;
    },
  ) {
    this.logger.log(`Updating canned response: ${id}`);

    // Verificar se existe
    await this.findOne(id);

    const updateData: Prisma.CannedResponseUpdateInput = {};

    if (data.shortcode) {
      updateData.shortcode = data.shortcode.toLowerCase();
    }

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    const response = await this.prisma.cannedResponse.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Canned response updated: ${id}`);
    return response;
  }

  /**
   * Deletar resposta pronta
   */
  async delete(id: string) {
    this.logger.log(`Deleting canned response: ${id}`);

    // Verificar se existe
    await this.findOne(id);

    await this.prisma.cannedResponse.delete({
      where: { id },
    });

    this.logger.log(`Canned response deleted: ${id}`);
    return { success: true, message: 'Canned response deleted successfully' };
  }

  /**
   * Interpolar variáveis no conteúdo
   * Variáveis suportadas: {{contact_name}}, {{contact_phone}}, {{agent_name}}, etc.
   */
  interpolateContent(content: string, variables: Record<string, any>): string {
    let interpolated = content;

    // Substituir variáveis no formato {{variable}}
    // Usa replaceAll com string literal para evitar ReDoS (sem construir RegExp com input externo)
    Object.entries(variables).forEach(([key, value]) => {
      interpolated = interpolated.replaceAll(`{{${key}}}`, String(value || ''));
    });

    // Remover variáveis não substituídas
    interpolated = interpolated.replace(/{{\w+}}/g, '');

    return interpolated;
  }

  /**
   * Obter resposta pronta interpolada
   */
  async getInterpolated(shortcode: string, variables: Record<string, any>) {
    const response = await this.findByShortcode(shortcode);

    return {
      ...response,
      content: this.interpolateContent(response.content, variables),
    };
  }

  /**
   * Listar categorias únicas
   */
  async getCategories() {
    const responses = await this.prisma.cannedResponse.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    return responses
      .map((r) => r.category)
      .filter((c): c is string => c !== null)
      .sort();
  }

  /**
   * Buscar sugestões baseadas em texto (para autocomplete)
   */
  async suggest(query: string, limit = 5) {
    const responses = await this.prisma.cannedResponse.findMany({
      where: {
        OR: [
          { shortcode: { startsWith: query.toLowerCase(), mode: 'insensitive' } },
          { shortcode: { contains: query.toLowerCase(), mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        shortcode: true,
        content: true,
        category: true,
      },
      take: limit,
      orderBy: [
        // Priorizar matches exatos de shortcode
        { shortcode: 'asc' },
      ],
    });

    return responses.map((r) => ({
      ...r,
      // Truncar conteúdo para preview
      contentPreview: r.content.length > 100
        ? r.content.substring(0, 100) + '...'
        : r.content,
    }));
  }
}
