const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                createdAt: {
                    gte: new Date('2026-02-01')
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${tickets.length} tickets from Feb 2026:`);
        tickets.forEach(t => {
            console.log(`[${t.id}] ${t.title} (${t.createdAt}) - GLPI ID: ${t.glpiId}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
