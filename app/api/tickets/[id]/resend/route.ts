import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';

// Force cache reset
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ticketId = params.id;

        let ticket: any = null;
        let event: any = null;

        // Try database first
        try {
            ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { event: true },
            });
            if (ticket) {
                event = ticket.event;
            }
        } catch (e) {
            console.log('Database not available, checking memory');
        }

        // Fallback to memory
        if (!ticket) {
            ticket = ticketStorage.get(ticketId);
        }

        if (!ticket) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }

        if (!ticket.email) {
            return NextResponse.json(
                { error: 'No email address on this ticket' },
                { status: 400 }
            );
        }

        // Send email
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const emailResponse = await fetch(`${baseUrl}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: ticket.email,
                ticketId: ticket.id,
                token: ticket.token,
                eventName: event?.name || 'Event',
                attendeeName: ticket.name,
                eventDate: event?.date || 'TBA',
                venue: event?.venue || 'TBA',
                amountPaid: event?.price || 0,
                transactionId: ticket.razorpayPaymentId || 'N/A',
                orderId: ticket.razorpayOrderId || 'N/A',
                paymentDate: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
                paymentMode: ticket.razorpayPaymentId ? 'Online Payment' : 'Free Registration',
                isResend: true,
            }),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok) {
            return NextResponse.json({
                success: true,
                message: `Ticket resent to ${ticket.email}`,
            });
        } else {
            return NextResponse.json(
                { error: emailResult.error || 'Failed to send email' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Resend error:', error);
        return NextResponse.json(
            { error: 'Failed to resend ticket' },
            { status: 500 }
        );
    }
}
