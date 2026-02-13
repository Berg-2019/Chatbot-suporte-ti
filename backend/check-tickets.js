
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Load .env manually from parent directory
const envPath = path.resolve(__dirname, '../.env');
console.log('Procurando .env em:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ Arquivo .env encontrado.');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        // Ignore comments
        if (line.trim().startsWith('#')) return;

        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
            const val = value.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
                process.env[key.trim()] = val;
            }
        }
    });
} else {
    console.log('❌ Arquivo .env NÃO encontrado.');
}

if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL está definida:', process.env.DATABASE_URL.substring(0, 15) + '...');
} else {
    console.log('❌ DATABASE_URL NÃO está definida.');
}

// Pass URL explicitly just in case
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ Abortando: DATABASE_URL ausente.');
        return;
    }

    console.log('🔍 Buscando os últimos 50 tickets...');

    try {
        const tickets = await prisma.ticket.findMany({
            take: 50,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                assignedTo: {
                    select: { name: true },
                },
            },
        });

        console.log(`\nEncontrados ${tickets.length} tickets.\n`);
        console.log('ID       | GLPI   | Data             | Status     | Solicitante     | Atribuído       | Título');
        console.log('-'.repeat(100));

        tickets.forEach(t => {
            const date = t.createdAt.toISOString().replace('T', ' ').substring(0, 16);
            const glpi = t.glpiId ? `#${t.glpiId}` : '---';
            const assigned = t.assignedTo ? t.assignedTo.name : 'NÃO ATRIBUÍDO';
            const title = t.title.length > 30 ? t.title.substring(0, 27) + '...' : t.title;

            // Highlight potential "lost" tickets (New, no assignee, created by bot likely has phone)
            const isSuspicious = t.status === 'NEW' && !t.assignedToId && t.phoneNumber;
            const prefix = isSuspicious ? '⚠️ ' : '   ';
            const id = t.id.substring(0, 8);

            console.log(`${prefix}${id} | ${glpi.padEnd(6)} | ${date} | ${t.status.padEnd(10)} | ${(t.customerName || '').substring(0, 15).padEnd(15)} | ${assigned.substring(0, 15).padEnd(15)} | ${title}`);
        });

    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
