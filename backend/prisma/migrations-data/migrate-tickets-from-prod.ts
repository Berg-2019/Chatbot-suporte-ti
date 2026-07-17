/**
 * ETL: migra tickets + mensagens do banco de produção antigo (schema `develop`)
 * para o banco do sistema novo (schema atual). Usuários NÃO são migrados —
 * são recriados do zero, então `assignedToId`/`senderId` saem sempre `null`.
 *
 * Origem lida via SQL bruto (SOURCE_DATABASE_URL) — imune ao descasamento de
 * schema entre as duas versões. Destino escrito via Prisma Client tipado
 * (DATABASE_URL), preservando `id`/`glpiId` para manter idempotência.
 *
 * Uso:
 *   SOURCE_DATABASE_URL=postgresql://... npx tsx prisma/migrations-data/migrate-tickets-from-prod.ts [--dry-run]
 */
import { PrismaClient, Sector } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
if (!SOURCE_URL) {
  console.error('❌ SOURCE_DATABASE_URL não definida (string de conexão do banco antigo).');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const dest = new PrismaClient();

interface OldTicketRow {
  id: string;
  glpiId: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  phoneNumber: string | null;
  customerName: string | null;
  sector: string | null;
  category: string | null;
  solution: string | null;
  solutionType: string | null;
  timeWorked: number | null;
  rating: number | null;
  ratedAt: Date | null;
  awaitingRating: boolean;
  type: string;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  escalatedAt: Date | null;
}

interface OldMessageRow {
  id: string;
  ticketId: string;
  content: string;
  type: string;
  direction: string;
  waMessageId: string | null;
  isInternal: boolean;
  mentions: string[];
  createdAt: Date;
}

const unmappedSectors = new Map<string, number>();

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .trim()
    .toLowerCase();
}

function mapSector(raw: string | null): Sector | null {
  if (!raw) return null;
  const n = normalize(raw);

  if (n === 'ti' || n === 't.i' || n.startsWith('ti -') || n.startsWith('ti-') || n.includes('tecnologia')) {
    return Sector.TI;
  }
  if (n.includes('eletric') || n.includes('eletrica')) {
    return Sector.ELECTRIC;
  }
  if (n.includes('compra')) {
    return Sector.COMPRAS;
  }

  unmappedSectors.set(raw, (unmappedSectors.get(raw) ?? 0) + 1);
  return null;
}

async function migrateTickets(): Promise<Map<string, string>> {
  const rows = await source.$queryRawUnsafe<OldTicketRow[]>(`
    SELECT id, "glpiId", title, description, status, priority, "phoneNumber",
           "customerName", sector, category, solution, "solutionType", "timeWorked",
           rating, "ratedAt", "awaitingRating", type, location,
           "createdAt", "updatedAt", "closedAt", "escalatedAt"
    FROM tickets
    ORDER BY "createdAt" ASC
  `);

  console.log(`📋 ${rows.length} tickets encontrados na origem.`);

  const idMap = new Map<string, string>(); // old id -> new id (sempre igual, mas explícito)

  // Number (TK-YYYY-NNNN) sequencial por ano de createdAt — pré-carrega o
  // maior número já existente no destino pra não colidir em reexecuções.
  const countersByYear = new Map<number, number>();
  const existingNumbers = await dest.ticket.findMany({ select: { number: true } });
  for (const t of existingNumbers) {
    const m = t.number.match(/^TK-(\d{4})-(\d+)$/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const seq = parseInt(m[2], 10);
    countersByYear.set(year, Math.max(countersByYear.get(year) || 0, seq));
  }
  function nextNumberFor(createdAt: Date): string {
    const year = createdAt.getFullYear();
    const next = (countersByYear.get(year) || 0) + 1;
    countersByYear.set(year, next);
    return `TK-${year}-${String(next).padStart(4, '0')}`;
  }

  for (const row of rows) {
    const sector = mapSector(row.sector);
    idMap.set(row.id, row.id);

    if (DRY_RUN) continue;

    await dest.ticket.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        number: nextNumberFor(row.createdAt),
        glpiId: row.glpiId,
        title: row.title,
        description: row.description,
        status: row.status as any,
        priority: row.priority as any,
        phoneNumber: row.phoneNumber,
        customerName: row.customerName,
        sector: sector ?? undefined,
        category: row.category,
        solution: row.solution,
        solutionType: row.solutionType,
        timeWorked: row.timeWorked,
        rating: row.rating,
        ratedAt: row.ratedAt,
        awaitingRating: row.awaitingRating,
        assignedToId: null,
        type: row.type as any,
        location: row.location,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        closedAt: row.closedAt,
        escalatedAt: row.escalatedAt,
      },
      update: {
        // re-rodar não duplica; atualiza só os campos migrados (não mexe em
        // dados que o sistema novo já tenha criado pra esse ticket)
        title: row.title,
        description: row.description,
        status: row.status as any,
        sector: sector ?? undefined,
      },
    });
  }

  if (unmappedSectors.size > 0) {
    console.warn('⚠️  Setores não mapeados (ficaram NULL):');
    for (const [val, count] of [...unmappedSectors.entries()].sort((a, b) => b[1] - a[1])) {
      console.warn(`   ${count.toString().padStart(4)}x  "${val}"`);
    }
  }

  return idMap;
}

async function migrateMessages(ticketIds: Map<string, string>): Promise<void> {
  const rows = await source.$queryRawUnsafe<OldMessageRow[]>(`
    SELECT id, "ticketId", content, type, direction, "waMessageId",
           "isInternal", mentions, "createdAt"
    FROM messages
    ORDER BY "createdAt" ASC
  `);

  console.log(`💬 ${rows.length} mensagens encontradas na origem.`);

  let skipped = 0;
  for (const row of rows) {
    if (!ticketIds.has(row.ticketId)) {
      skipped++;
      continue; // ticket órfão na origem; não deveria acontecer, mas não derruba o ETL
    }

    if (DRY_RUN) continue;

    await dest.message.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        ticketId: row.ticketId,
        content: row.content,
        type: row.type as any,
        direction: row.direction as any,
        senderId: null,
        waMessageId: row.waMessageId,
        isInternal: row.isInternal,
        mentions: row.mentions ?? [],
        createdAt: row.createdAt,
      },
      update: {
        content: row.content,
      },
    });
  }

  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} mensagens ignoradas (ticket de origem não encontrado).`);
  }
}

async function main() {
  console.log(DRY_RUN ? '🧪 DRY-RUN — nenhuma escrita será feita.\n' : '🚀 Migrando tickets + mensagens...\n');

  const ticketIds = await migrateTickets();
  await migrateMessages(ticketIds);

  console.log(DRY_RUN ? '\n✅ Dry-run concluído.' : '\n✅ Migração concluída.');
}

main()
  .catch((err) => {
    console.error('❌ Falha no ETL:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await dest.$disconnect();
  });
