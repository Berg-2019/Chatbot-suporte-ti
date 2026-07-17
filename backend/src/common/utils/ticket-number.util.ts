import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Gera o próximo número sequencial do ano corrente (TK-YYYY-NNNN). */
export async function generateTicketNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TK-${year}-`;
  const last = await prisma.ticket.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const next = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Executa `createFn` com um número recém-gerado, e faz retry (gerando um
 * número novo) se colidir com o unique index — mitiga a race condition
 * inerente ao "ler o último e +1" sob criação concorrente (bot do WhatsApp
 * pode criar tickets em paralelo).
 */
export async function createWithTicketNumber<T>(
  prisma: PrismaService,
  createFn: (number: string) => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const number = await generateTicketNumber(prisma);
    try {
      return await createFn(number);
    } catch (err: any) {
      const isNumberConflict = err?.code === 'P2002' && err?.meta?.target?.includes?.('number');
      if (!isNumberConflict) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}
