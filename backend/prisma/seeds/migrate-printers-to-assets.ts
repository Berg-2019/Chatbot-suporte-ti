/**
 * Script de migração: Printer -> Asset
 *
 * Migra impressoras do model Printer para o model Asset (CMDB nativo).
 * Pode ser executado múltiplas vezes (idempotente).
 *
 * Uso:
 *   npx ts-node prisma/seeds/migrate-printers-to-assets.ts          # dry-run
 *   npx ts-node prisma/seeds/migrate-printers-to-assets.ts --apply   # aplica
 */

import { PrismaClient, AssetCategory, AssetLifecycle } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
  dryRun: boolean;
}

async function migratePrintersToAssets(apply = false): Promise<MigrationResult> {
  console.log(`\n🔄 Migração Printer → Asset (${apply ? 'LIVE' : 'DRY-RUN'})\n`);

  const printers = await prisma.printer.findMany({ where: { active: true } });
  const result: MigrationResult = { total: printers.length, migrated: 0, skipped: 0, errors: [], dryRun: !apply };

  for (const printer of printers) {
    try {
      const existing = await prisma.asset.findUnique({ where: { tag: `PRINTER-${printer.id}` } });
      if (existing) {
        console.log(`  ⏭️  Printer "${printer.name}" já migrado (asset: ${existing.id})`);
        result.skipped++;
        continue;
      }

      const asset = {
        tag: `PRINTER-${printer.id}`,
        serialNumber: printer.serialNumber,
        name: printer.name,
        category: AssetCategory.PRINTER,
        status: printer.lastStatus === 'offline' ? AssetLifecycle.IN_MAINTENANCE : AssetLifecycle.IN_USE,
        sector: 'TI' as const,
        location: printer.location,
        model: printer.model,
        notes: ` migrated from Printer(id=${printer.id}, ip=${printer.ip})`,
        purchaseDate: null,
        warrantyEndsAt: null,
      };

      if (apply) {
        await prisma.asset.create({ data: asset });
      }

      console.log(`  ✅ Printer "${printer.name}" → Asset "${asset.tag}"`);
      result.migrated++;
    } catch (err: any) {
      console.error(`  ❌ Erro no printer "${printer.name}": ${err.message}`);
      result.errors.push(`${printer.name}: ${err.message}`);
    }
  }

  console.log(`\n📊 Resultado: ${result.migrated} migrados, ${result.skipped} pulados, ${result.errors.length} erros`);
  if (!apply) {
    console.log('⚠️  Execute com --apply para aplicar as mudanças no banco.\n');
  }

  return result;
}

const apply = process.argv.includes('--apply');
migratePrintersToAssets(apply)
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());