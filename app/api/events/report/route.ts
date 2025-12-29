import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';

// Fallback events
const FALLBACK_EVENTS = [
    { id: 'event-1', name: 'Tech Conference 2025', price: 50000, capacity: 500 },
    { id: 'event-2', name: 'Music Festival Night', price: 200000, capacity: 1000 },
    { id: 'event-3', name: 'Startup Meetup', price: 20000, capacity: 200 },
    { id: 'event-4', name: 'Art Exhibition Opening', price: 30000, capacity: 150 },
];

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const eventId = url.searchParams.get('eventId');
        const format = url.searchParams.get('format') || 'json';

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Get event data
        let event = null;
        let tickets: any[] = [];

        try {
            event = await prisma.event.findUnique({ where: { id: eventId } });
            tickets = await prisma.ticket.findMany({ where: { eventId } });
        } catch (e) {
            event = FALLBACK_EVENTS.find(e => e.id === eventId) || null;
            tickets = ticketStorage.getAll().filter(t => t.eventId === eventId);
        }

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Generate report data
        const paidTickets = tickets.filter(t => t.status === 'paid');
        const checkedIn = tickets.filter(t => t.checkedIn);
        const refunded = tickets.filter(t => t.status === 'refunded');
        const pending = tickets.filter(t => t.status === 'pending');

        const report = {
            event: {
                id: event.id,
                name: event.name,
                price: event.price,
                capacity: (event as any).capacity || 0,
            },
            summary: {
                totalTickets: tickets.length,
                paidTickets: paidTickets.length,
                checkedIn: checkedIn.length,
                checkInRate: paidTickets.length > 0
                    ? ((checkedIn.length / paidTickets.length) * 100).toFixed(1) + '%'
                    : '0%',
                refunded: refunded.length,
                pending: pending.length,
                revenue: (paidTickets.length * event.price) / 100,
                refundedAmount: (refunded.length * event.price) / 100,
                netRevenue: ((paidTickets.length - refunded.length) * event.price) / 100,
            },
            attendees: paidTickets.map(t => ({
                name: t.name,
                email: t.email,
                phone: t.phone,
                checkedIn: t.checkedIn,
                checkedInAt: t.checkedInAt,
                purchasedAt: t.createdAt,
            })),
            generatedAt: new Date().toISOString(),
        };

        // Return as CSV if requested
        if (format === 'csv') {
            const headers = ['Name', 'Email', 'Phone', 'Checked In', 'Checked In At', 'Purchased At'];
            const rows = report.attendees.map(a => [
                a.name,
                a.email || '',
                a.phone || '',
                a.checkedIn ? 'Yes' : 'No',
                a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : '',
                new Date(a.purchasedAt).toLocaleString(),
            ]);

            const csvContent = [
                `Event Report: ${event.name}`,
                `Generated: ${new Date().toLocaleString()}`,
                '',
                `Total Tickets: ${report.summary.totalTickets}`,
                `Paid: ${report.summary.paidTickets}`,
                `Checked In: ${report.summary.checkedIn} (${report.summary.checkInRate})`,
                `Revenue: ₹${report.summary.revenue.toLocaleString()}`,
                '',
                headers.join(','),
                ...rows.map(r => r.map(c => `"${c}"`).join(',')),
            ].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="event-report-${eventId}.csv"`,
                },
            });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Report generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate report' },
            { status: 500 }
        );
    }
}
