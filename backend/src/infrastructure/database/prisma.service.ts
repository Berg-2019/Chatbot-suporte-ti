import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set(['User', 'Ticket', 'Message', 'Contact']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    // Soft-delete: `delete`/`deleteMany` viram update de `deletedAt`; os finds
    // filtram `deletedAt: null`. O callback de query re-entra via `ext` (o
    // client estendido capturado) — `this`/getExtensionContext não expõem o
    // delegate com .update aqui.
    const ext: any = this.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          async delete({ model, args, query }: any) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const key = model.charAt(0).toLowerCase() + model.slice(1);
            return (ext as any)[key].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          },
          async deleteMany({ model, args, query }: any) {
            if (!SOFT_DELETE_MODELS.has(model)) return query(args);
            const key = model.charAt(0).toLowerCase() + model.slice(1);
            return (ext as any)[key].updateMany({
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
    return ext as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma conectado ao banco de dados');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
