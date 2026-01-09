import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET - Get group details
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                event: {
                    select: { id: true, name: true, date: true, venue: true, price: true }
                },
                tickets: true,
            }
        });

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ group });
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}

// PUT - Update group
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const group = await prisma.group.update({
            where: { id },
            data: body,
        });

        return NextResponse.json({ success: true, group });
    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}

// DELETE - Delete group and disassociate tickets
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        // First, disassociate tickets from this group (don't delete them)
        await prisma.ticket.updateMany({
            where: { groupId: id },
            data: { groupId: null }
        });

        // Then delete the group
        await prisma.group.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting group:', error);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
