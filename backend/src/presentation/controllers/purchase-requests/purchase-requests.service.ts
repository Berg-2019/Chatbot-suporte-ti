import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { PushService } from '../push/push.service';
import { CreatePurchaseRequestDto, QueryPurchaseRequestDto } from './purchase-requests.dto';
import { PurchaseRequestStatus, Sector, Prisma } from '@prisma/client';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
    private pushService: PushService,
  ) {}

  async create(dto: CreatePurchaseRequestDto, requestedById?: string) {
    return this.prisma.purchaseRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        quantity: dto.quantity || 1,
        estimatedValue: dto.estimatedValue ? new Prisma.Decimal(dto.estimatedValue) : undefined,
        justification: dto.justification,
        sector: dto.sector as Sector,
        requesterName: dto.requesterName,
        requesterPhone: dto.requesterPhone,
        requestedById,
        ticketId: dto.ticketId,
        status: PurchaseRequestStatus.PENDING,
      },
    });
  }

  async findAll(filters: QueryPurchaseRequestDto, userRole: string, userSector?: Sector) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    // ADMIN_COMPRAS sees all; others see only their sector
    if (userRole === 'ADMIN_COMPRAS') {
      if (filters.sector) where.sector = filters.sector;
    } else {
      where.sector = userSector || 'TI';
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
    });
    if (!pr) throw new NotFoundException('PurchaseRequest não encontrada');
    return pr;
  }

  async approve(id: string, approvedById: string, notes?: string) {
    const pr = await this.findById(id);

    if (pr.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('Apenas requisições pendentes podem ser aprovadas');
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseRequestStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
    });

    await this.notifyRequester(updated, 'approved', notes);
    await this.rabbitmq.publishNotification({
      type: 'purchase_request_updated',
      ticketId: updated.ticketId || undefined,
      payload: updated,
    });

    if (updated.requestedById) {
      await this.pushService.sendToUser(
        updated.requestedById,
        '✅ Requisição Aprovada',
        `PR #${id.slice(-6)}: ${updated.title} foi aprovada`,
        { prId: id, type: 'pr_approved' },
      );
    }

    return updated;
  }

  async reject(id: string, rejectedById: string, rejectionReason: string) {
    const pr = await this.findById(id);

    if (pr.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('Apenas requisições pendentes podem ser rejeitadas');
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseRequestStatus.REJECTED,
        rejectedById,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });

    await this.notifyRequester(updated, 'rejected');
    await this.rabbitmq.publishNotification({
      type: 'purchase_request_updated',
      ticketId: updated.ticketId || undefined,
      payload: updated,
    });

    if (updated.requestedById) {
      await this.pushService.sendToUser(
        updated.requestedById,
        '❌ Requisição Rejeitada',
        `PR #${id.slice(-6)}: ${updated.title} foi rejeitada - ${updated.rejectionReason}`,
        { prId: id, type: 'pr_rejected' },
      );
    }

    return updated;
  }

  async markPurchased(id: string, purchasedById: string) {
    const pr = await this.findById(id);

    if (pr.status !== PurchaseRequestStatus.APPROVED) {
      throw new BadRequestException('Apenas requisições aprovadas podem ser marcadas como compradas');
    }

    const purchased = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseRequestStatus.PURCHASED,
        purchasedById,
        purchasedAt: new Date(),
      },
    });
    await this.rabbitmq.publishNotification({
      type: 'purchase_request_updated',
      ticketId: purchased.ticketId || undefined,
      payload: purchased,
    });
    return purchased;
  }

  async markDelivered(id: string, deliveredById: string) {
    const pr = await this.findById(id);

    if (pr.status !== PurchaseRequestStatus.PURCHASED) {
      throw new BadRequestException('Apenas requisições compradas podem ser marcadas como entregues');
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseRequestStatus.DELIVERED,
        deliveredById,
        deliveredAt: new Date(),
      },
    });

    await this.notifyRequester(updated, 'delivered');
    await this.rabbitmq.publishNotification({
      type: 'purchase_request_updated',
      ticketId: updated.ticketId || undefined,
      payload: updated,
    });
    return updated;
  }

  async cancel(id: string, _userId?: string) {
    const pr = await this.findById(id);

    const cancellable: PurchaseRequestStatus[] = [PurchaseRequestStatus.PENDING, PurchaseRequestStatus.APPROVED];
    if (!cancellable.includes(pr.status)) {
      throw new BadRequestException('Não é possível cancelar uma requisição já comprada ou entregue');
    }

    const cancelled = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: PurchaseRequestStatus.CANCELLED },
    });
    await this.rabbitmq.publishNotification({
      type: 'purchase_request_updated',
      ticketId: cancelled.ticketId || undefined,
      payload: cancelled,
    });
    return cancelled;
  }

  private async notifyRequester(pr: any, event: 'approved' | 'rejected' | 'delivered', notes?: string) {
    if (!pr.requesterPhone) return;

    let message = '';
    switch (event) {
      case 'approved':
        message = `✅ *Requisição Aprovada!*\n\nSua requisição *#${pr.id.slice(-6)}* "${pr.title}" foi *APROVADA*.\n\n`;
        if (pr.estimatedValue) message += `Valor estimado: R$ ${pr.estimatedValue}\n`;
        if (notes) message += `Observação: ${notes}\n`;
        message += '\nA equipe de compras seguirá com a aquisição.';
        break;
      case 'rejected':
        message = `❌ *Requisição Rejeitada*\n\nSua requisição *#${pr.id.slice(-6)}* "${pr.title}" foi *REJEITADA*.\n\n`;
        if (pr.rejectionReason) message += `Motivo: ${pr.rejectionReason}\n`;
        message += '\nEm caso de dúvidas, entre em contato com a equipe de compras.';
        break;
      case 'delivered':
        message = `📦 *Requisição Entregue!*\n\nSua requisição *#${pr.id.slice(-6)}* "${pr.title}" foi *ENTREGUE*.\n\nPor favor, confirme o recebimento.`;
        break;
    }

    await this.rabbitmq.publishOutgoingMessage({
      to: pr.requesterPhone,
      text: message,
      ticketId: pr.ticketId,
    });
  }
}