import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List groups for an event
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        const where = eventId ? { eventId } : {};

        const groups = await prisma.group.findMany({
            where,
            include: {
                event: {
                    select: { id: true, name: true }
                },
                tickets: {
                    select: { id: true, name: true, email: true, checkedIn: true }
                },
                _count: {
                    select: { tickets: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ groups });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

// POST - Create a new group registration
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name,
            contactName,
            contactEmail,
            contactPhone,
            eventId,
            discount,
            notes,
            attendees // Array of { name, email, phone }
        } = body;

        if (!name || !contactName || !contactEmail || !eventId) {
            return NextResponse.json({
                error: 'Missing required fields: name, contactName, contactEmail, eventId'
            }, { status: 400 });
        }

        // Check if event exists
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Create group
        const group = await prisma.group.create({
            data: {
                name,
                contactName,
                contactEmail,
                contactPhone,
                eventId,
                discount: discount || 0,
                notes,
            }
        });

        // Create tickets for all attendees in the group
        let ticketIds: string[] = [];
        if (attendees && Array.isArray(attendees) && attendees.length > 0) {
            const ticketData = attendees.map((attendee: { name: string; email?: string; phone?: string }) => ({
                name: attendee.name || contactName,
                email: attendee.email || contactEmail,
                phone: attendee.phone || contactPhone,
                eventId,
                groupId: group.id,
                status: 'pending',
                purchaseGroupId: group.id, // Use group ID for purchase tracking
            }));

            // Create all tickets
            const createdTickets = await Promise.all(
                ticketData.map(data => prisma.ticket.create({ data }))
            );
            ticketIds = createdTickets.map(t => t.id);
        }

        return NextResponse.json({
            success: true,
            group,
            ticketIds,
            ticketCount: ticketIds.length
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}
