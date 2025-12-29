import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding events...');

    // Create sample events
    const events = await Promise.all([
        prisma.event.upsert({
            where: { id: 'event-1' },
            update: {},
            create: {
                id: 'event-1',
                name: 'Tech Conference 2025',
                description: 'Annual technology conference featuring industry leaders and innovative workshops',
                date: new Date('2025-02-15T09:00:00Z'),
                venue: 'Convention Center, Bangalore',
                price: 50000, // ₹500
                isActive: true,
            },
        }),
        prisma.event.upsert({
            where: { id: 'event-2' },
            update: {},
            create: {
                id: 'event-2',
                name: 'Music Festival Night',
                description: 'Live performances by top artists with food and entertainment',
                date: new Date('2025-01-25T18:00:00Z'),
                venue: 'Stadium Ground, Mumbai',
                price: 200000, // ₹2000
                isActive: true,
            },
        }),
        prisma.event.upsert({
            where: { id: 'event-3' },
            update: {},
            create: {
                id: 'event-3',
                name: 'Startup Meetup',
                description: 'Network with founders and investors in the startup ecosystem',
                date: new Date('2025-01-20T16:00:00Z'),
                venue: 'WeWork, Delhi',
                price: 20000, // ₹200
                isActive: true,
            },
        }),
        prisma.event.upsert({
            where: { id: 'event-4' },
            update: {},
            create: {
                id: 'event-4',
                name: 'Art Exhibition Opening',
                description: 'Exclusive preview of contemporary art collection',
                date: new Date('2025-02-01T17:00:00Z'),
                venue: 'Art Gallery, Chennai',
                price: 30000, // ₹300
                isActive: true,
            },
        }),
    ]);

    console.log(`Created ${events.length} events:`);
    events.forEach((event) => {
        console.log(`  - ${event.name} (₹${event.price / 100})`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
