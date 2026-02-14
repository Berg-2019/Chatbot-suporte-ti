import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://helpdesk:helpdesk123@localhost:5432/helpdesk',
        },
    },
});

async function main() {
    const glpiIds = [627521, 711542];
    console.log('Searching for tickets with GLPI IDs:', glpiIds);

    const tickets = await prisma.ticket.findMany({
        where: {
            glpiId: { in: glpiIds },
        },
        include: {
            assignedTo: true
        }
    });

    if (tickets.length === 0) {
        console.log('❌ No tickets found with these GLPI IDs.');
        // Check recent tickets to see if they exist without GLPI ID
        const recent = await prisma.ticket.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Recent tickets:', recent.map(t => ({ id: t.id, glpiId: t.glpiId, title: t.title, createdAt: t.createdAt })));
    } else {
        console.log('✅ Found tickets:');
        tickets.forEach(t => {
            console.log(`- ID: ${t.id}, GLPI: ${t.glpiId}, Status: ${t.status}, Title: ${t.title}, Assigned: ${t.assignedTo?.name}`);
        });
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
