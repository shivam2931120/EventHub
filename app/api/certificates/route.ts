import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List certificates for an event
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');
        const type = searchParams.get('type'); // participant, volunteer, winner

        const where: any = {};
        if (eventId) where.eventId = eventId;
        if (type) where.type = type;

        const certificates = await prisma.certificate.findMany({
            where,
            include: {
                event: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ certificates });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }
}

// POST - Create certificate record (tracking only, generation is separate)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, name, email, type, downloadUrl } = body;

        if (!eventId || !name) {
            return NextResponse.json({
                error: 'Missing required fields: eventId, name'
            }, { status: 400 });
        }

        const certificate = await prisma.certificate.create({
            data: {
                eventId,
                name,
                email,
                type: type || 'participant',
                downloadUrl,
            }
        });

        return NextResponse.json({ success: true, certificate }, { status: 201 });
    } catch (error) {
        console.error('Error creating certificate:', error);
        return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
    }
}

// DELETE - Delete certificates by event and type
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');
        const type = searchParams.get('type');

        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const where: any = { eventId };
        if (type) where.type = type;

        const deleted = await prisma.certificate.deleteMany({ where });

        return NextResponse.json({ success: true, deleted: deleted.count });
    } catch (error) {
        console.error('Error deleting certificates:', error);
        return NextResponse.json({ error: 'Failed to delete certificates' }, { status: 500 });
    }
}
