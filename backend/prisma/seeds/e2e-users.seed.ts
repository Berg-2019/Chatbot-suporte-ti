/**
 * Seed idempotente de usuários para os testes E2E (Playwright).
 *
 * Garante um conjunto fixo de contas com senhas conhecidas, em qualquer banco.
 * Rodar antes da suíte: `npm run seed:e2e` (na pasta backend) — o global-setup
 * do Playwright também tenta rodar isto automaticamente (best-effort).
 *
 * Senha de todos: `password123`. NÃO usar em produção.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = process.env.E2E_SEED_PASSWORD || 'password123';

const USERS: Array<{
  email: string;
  name: string;
  role: 'AGENT' | 'ADMIN' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
  sector: 'TI' | 'ELECTRIC' | 'COMPRAS';
}> = [
  { email: 'ti_agent@helpdesk.com', name: 'TI Agent (E2E)', role: 'AGENT', sector: 'TI' },
  { email: 'electric_agent@helpdesk.com', name: 'Electric Agent (E2E)', role: 'AGENT', sector: 'ELECTRIC' },
  { email: 'compras_admin@helpdesk.com', name: 'Compras Admin (E2E)', role: 'ADMIN_COMPRAS', sector: 'COMPRAS' },
  { email: 'e2e_admin@helpdesk.com', name: 'E2E Admin', role: 'ADMIN', sector: 'TI' },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hash,
        role: u.role as any,
        sector: u.sector as any,
        active: true,
        activatedAt: new Date(),
        deletedAt: null, // reativa caso tenha sido soft-deletado
      },
      create: {
        email: u.email,
        name: u.name,
        password: hash,
        role: u.role as any,
        sector: u.sector as any,
        active: true,
        activatedAt: new Date(),
      },
    });
    console.log(`  ✓ seed e2e: ${u.email} (${u.role}/${u.sector})`);
  }
  console.log(`Seed E2E concluído (${USERS.length} usuários, senha=${PASSWORD}).`);
}

main()
  .catch((e) => {
    console.error('Falha no seed E2E:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
