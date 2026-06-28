import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Sector } from '@prisma/client';

export interface MessengerUser {
  id: string;
  role: string;
  sector?: Sector | string | null;
}

function sectorLabel(sector?: Sector | null): string {
  switch (sector) {
    case 'ELECTRIC':
      return 'Equipe Elétrica';
    case 'COMPRAS':
      return 'Equipe Compras';
    default:
      return 'Equipe TI';
  }
}

/**
 * Messenger interno (grupos de setor + DMs 1:1). O envio em tempo real é feito
 * pelo EventsGateway (`chat:send`); este service cobre listagem, histórico,
 * leitura, abertura de DM e contatos. Setor vem do JWT — DM só entre o mesmo
 * setor (ADMIN global é cross-setor).
 */
@Injectable()
export class MessengerService {
  constructor(private prisma: PrismaService) {}

  /** Garante a conversa de grupo do setor + participação do usuário. */
  async ensureSectorGroup(user: MessengerUser) {
    if (!user.sector) return null;
    const sector = user.sector as Sector;
    let group = await this.prisma.chatConversation.findFirst({
      where: { type: 'GROUP', sector },
    });
    if (!group) {
      group = await this.prisma.chatConversation.create({
        data: { type: 'GROUP', sector },
      });
    }
    await this.prisma.chatParticipant.upsert({
      where: { conversationId_userId: { conversationId: group.id, userId: user.id } },
      create: { conversationId: group.id, userId: user.id },
      update: {},
    });
    return group;
  }

  async listConversations(user: MessengerUser) {
    await this.ensureSectorGroup(user);

    const parts = await this.prisma.chatParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, role: true, status: true } } },
            },
          },
        },
      },
    });

    const items = await Promise.all(
      parts.map(async (p) => {
        const conv = p.conversation;
        const last = await this.prisma.chatMessage.findFirst({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { name: true } } },
        });
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.id },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        });
        const other =
          conv.type === 'DIRECT'
            ? conv.participants.find((pp) => pp.userId !== user.id)?.user
            : null;
        return {
          id: conv.id,
          type: conv.type,
          sector: conv.sector,
          title: conv.type === 'GROUP' ? sectorLabel(conv.sector) : other?.name ?? 'Conversa',
          otherUser: other ? { id: other.id, name: other.name, status: other.status } : null,
          lastMessage: last
            ? { content: last.content, senderName: last.sender?.name ?? null, createdAt: last.createdAt }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
        };
      }),
    );

    // Grupo sempre no topo; depois por última atividade.
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'GROUP' ? -1 : 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
    return items;
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const part = await this.prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!part) throw new ForbiddenException('Você não participa desta conversa');
    return part;
  }

  async getMessages(user: MessengerUser, conversationId: string) {
    await this.assertParticipant(user.id, conversationId);
    const msgs = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { select: { id: true, name: true } } },
    });
    return msgs.reverse();
  }

  async markRead(user: MessengerUser, conversationId: string) {
    await this.assertParticipant(user.id, conversationId);
    await this.prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async openDirect(user: MessengerUser, targetUserId: string) {
    if (targetUserId === user.id) {
      throw new BadRequestException('Não é possível conversar consigo mesmo');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    const isGlobalAdmin = user.role === 'ADMIN';
    if (!isGlobalAdmin && target.sector !== user.sector) {
      throw new ForbiddenException('Só é possível conversar com colegas do mesmo setor');
    }

    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
    });
    if (existing) return { conversationId: existing.id };

    const conv = await this.prisma.chatConversation.create({
      data: {
        type: 'DIRECT',
        participants: { create: [{ userId: user.id }, { userId: targetUserId }] },
      },
    });
    return { conversationId: conv.id };
  }

  /** Usuários do mesmo setor (ou todos, se ADMIN global) para iniciar uma DM. */
  async getContacts(user: MessengerUser) {
    const isGlobalAdmin = user.role === 'ADMIN';
    return this.prisma.user.findMany({
      where: {
        active: true,
        id: { not: user.id },
        ...(isGlobalAdmin ? {} : { sector: user.sector as Sector }),
      },
      select: { id: true, name: true, role: true, status: true, sector: true },
      orderBy: { name: 'asc' },
    });
  }
}
