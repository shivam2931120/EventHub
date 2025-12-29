import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const showAll = url.searchParams.get('all') === 'true';

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    try {
        const photos = await prisma.photo.findMany({
            where: {
                eventId,
                ...(showAll ? {} : { approved: true }),
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ photos });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, imageUrl, uploaderName, caption } = body;

        if (!eventId || !imageUrl || !uploaderName) {
            return NextResponse.json(
                { error: 'Event ID, image URL, and uploader name are required' },
                { status: 400 }
            );
        }

        const photo = await prisma.photo.create({
            data: {
                eventId,
                imageUrl,
                uploaderName,
                caption,
                approved: false,
                likes: 0,
            },
        });

        return NextResponse.json({
            success: true,
            photo,
            message: 'Photo uploaded! It will appear after admin approval.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { photoId, action, approved } = body;

        if (action === 'approve') {
            const photo = await prisma.photo.update({
                where: { id: photoId },
                data: { approved: approved !== false },
            });
            return NextResponse.json({ success: true, photo });
        }

        if (action === 'like') {
            const photo = await prisma.photo.update({
                where: { id: photoId },
                data: { likes: { increment: 1 } },
            });
            return NextResponse.json({ success: true, likes: photo.likes });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const url = new URL(request.url);
    const photoId = url.searchParams.get('photoId');

    if (!photoId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await prisma.photo.delete({ where: { id: photoId } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 404 });
    }
}
