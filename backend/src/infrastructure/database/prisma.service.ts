import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set(['User', 'Ticket', 'Message', 'Contact']);

const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      async delete({ model, args, query }: any) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
        const client = this as any;
        return client[modelKey].update({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany({ model, args, query }: any) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
        const client = this as any;
        return client[modelKey].updateMany({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async findUnique({ model, args, query }: any) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({ ...args, where: { ...args.where, deletedAt: null } });
      },
      async findFirst({ model, args, query }: any) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({ ...args, where: { ...args.where, deletedAt: null } });
      },
      async findMany({ model, args, query }: any) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        const where = { ...(args?.where || {}), deletedAt: null };
        return query({ ...args, where });
      },
    },
  },
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    return this.$extends(softDeleteExtension) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma conectado ao banco de dados');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
