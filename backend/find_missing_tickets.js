const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://helpdesk:helpdesk123@localhost:5432/helpdesk',
        },
    },
});

async function main() {
    const glpiIds = [627521, 711542];
    console.log('Searching for tickets with GLPI IDs or content:', glpiIds);

    console.log('Searching for tickets with GLPI IDs, content, or suffix:', glpiIds);

    const tickets = await prisma.ticket.findMany({
        where: {
            OR: [
                { glpiId: { in: glpiIds } },
                { title: { contains: '627521' } },
                { title: { contains: '711542' } },
                { description: { contains: '627521' } },
                { description: { contains: '711542' } },
                { id: { endsWith: '627521' } }, // Check for UUID suffix
                { id: { endsWith: '711542' } },
            ]
        },
        include: {
            assignedTo: true
        }
    });

    console.log('Searching in Messages...');
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { content: { contains: '627521' } },
                { content: { contains: '711542' } }
            ]
        },
        include: {
            ticket: true
        }
    });

    if (messages.length > 0) {
        console.log('✅ Found messages with these numbers:');
        messages.forEach(m => console.log(`- Msg: ${m.content}, Ticket: ${m.ticketId}, Date: ${m.createdAt}`));
    } else {
        console.log('❌ No messages found.');
    }

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
