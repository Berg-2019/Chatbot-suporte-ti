
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Buscando os últimos 50 tickets...');

    const tickets = await prisma.ticket.findMany({
        take: 50,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            assignedTo: {
                select: { name: true },
            },
            messages: {
                take: 1,
            },
        },
    });

    console.log(`\nEncontrados ${tickets.length} tickets.\n`);
    console.log('ID | GLPI | Data | Status | Solicitante | Atribuído | Título');
    console.log('-'.repeat(100));

    tickets.forEach(t => {
        const date = t.createdAt.toISOString().replace('T', ' ').substring(0, 16);
        const glpi = t.glpiId ? `#${t.glpiId}` : '---';
        const assigned = t.assignedTo?.name || 'NÃO ATRIBUÍDO';
        const title = t.title.length > 30 ? t.title.substring(0, 27) + '...' : t.title;

        // Highlight potential "lost" tickets (New, no assignee, created by bot likely has phone)
        const isSuspicious = t.status === 'NEW' && !t.assignedToId && t.phoneNumber;
        const prefix = isSuspicious ? '⚠️ ' : '   ';

        console.log(`${prefix}${t.id.substring(0, 8)} | ${glpi.padEnd(6)} | ${date} | ${t.status.padEnd(10)} | ${t.customerName?.substring(0, 15).padEnd(15)} | ${assigned.substring(0, 15).padEnd(15)} | ${title}`);
    });

    const suspiciousCount = tickets.filter(t => t.status === 'NEW' && !t.assignedToId && t.phoneNumber).length;
    console.log(`\n⚠️  Tickets suspeitos (Novos, sem técnico, com telefone): ${suspiciousCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
