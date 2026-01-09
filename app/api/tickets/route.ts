import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TicketFormData } from '@/types';
import { ticketStorage } from '@/lib/ticket-storage';

// Fallback events data (same as events/route.ts)
const FALLBACK_EVENTS: Record<string, { name: string; price: number }> = {
  'event-1': { name: 'Tech Conference 2025', price: 50000 },
  'event-2': { name: 'Music Festival Night', price: 200000 },
  'event-3': { name: 'Startup Meetup', price: 20000 },
  'event-4': { name: 'Art Exhibition Opening', price: 30000 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both single and multi-ticket purchase
    const quantity = body.quantity || 1;
    const attendees = body.attendees || [{ name: body.name, email: body.email, phone: body.phone }];

    // Validate required fields
    if (attendees.length === 0 || !attendees[0].name || !body.eventId) {
      return NextResponse.json(
        { error: 'Name and event are required' },
        { status: 400 }
      );
    }

    // Check fallback events first
    const fallbackEvent = FALLBACK_EVENTS[body.eventId];

    // Try database first, then fallback
    let event = null;
    let eventName = '';
    let eventPrice = 0;

    try {
      event = await prisma.event.findUnique({
        where: { id: body.eventId },
      });
      if (event) {
        eventName = event.name;
        eventPrice = event.price;
      }
    } catch (e) {
      console.log('Database not available, using fallback events');
    }

    // Use fallback if no database event
    if (!event && fallbackEvent) {
      eventName = fallbackEvent.name;
      eventPrice = fallbackEvent.price;
    } else if (!event && !fallbackEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Create tickets for all attendees
    const ticketIds: string[] = [];
    const tokens: string[] = [];

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      let ticketId: string;
      // Generate token for free tickets
      const token = body.isFree
        ? require('crypto').createHmac('sha256', process.env.TICKET_SECRET_KEY || 'default-secret-key-for-demo')
          .update(`ticket-${Date.now()}-${i}`)
          .digest('hex')
        : null;

      try {
        const ticket = await prisma.ticket.create({
          data: {
            name: attendee.name,
            email: attendee.email || body.email || null,
            phone: attendee.phone || body.phone || null,
            eventId: body.eventId,
            status: body.isFree ? 'paid' : 'pending', // Free tickets are auto-confirmed
            token: token,
          },
        });
        ticketId = ticket.id;
        console.log(`Ticket ${i + 1}/${attendees.length} created in database:`, ticketId);
      } catch (e) {
        // Fallback to in-memory storage
        ticketId = `ticket-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
        ticketStorage.set(ticketId, {
          id: ticketId,
          name: attendee.name,
          email: attendee.email || body.email || null,
          phone: attendee.phone || body.phone || null,
          eventId: body.eventId,
          status: body.isFree ? 'paid' : 'pending',
          token: token,
          checkedIn: false,
          createdAt: new Date(),
        });
        console.log(`Ticket ${i + 1}/${attendees.length} created in memory:`, ticketId);
      }

      ticketIds.push(ticketId);
      if (token) tokens.push(token);
    }

    // Send confirmation email for FREE tickets
    if (body.isFree && ticketIds.length > 0) {
      const primaryEmail = attendees[0]?.email || body.email;
      if (primaryEmail) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          console.log('Sending free ticket confirmation email to:', primaryEmail);

          fetch(`${baseUrl}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: primaryEmail,
              ticketId: ticketIds[0],
              token: tokens[0],
              eventName: eventName || 'Event',
              attendeeName: attendees[0]?.name || 'Guest',
              eventDate: body.eventDate || 'TBA',
              venue: body.venue || 'TBA',
              amountPaid: 0,
              transactionId: 'FREE',
              orderId: 'FREE-' + ticketIds[0],
              paymentDate: new Date().toISOString(),
              paymentMode: 'Free Registration',
            }),
          }).catch(err => console.warn('Email send failed:', err));
        } catch (emailError) {
          console.warn('Email sending error:', emailError);
        }
      }
    }

    return NextResponse.json({
      ticketId: ticketIds[0], // Primary ticket ID for backwards compatibility
      ticketIds, // All ticket IDs for multi-ticket
      quantity: ticketIds.length,
      eventName,
      price: eventPrice,
      totalPrice: eventPrice * ticketIds.length,
    });
  } catch (error: any) {
    console.error('Error creating ticket(s):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket(s)' },
      { status: 500 }
    );
  }
}

// GET /api/tickets - Get all tickets (for admin)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    let tickets: any[] = [];

    try {
      tickets = await prisma.ticket.findMany({
        where: eventId ? { eventId } : {},
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // Return in-memory tickets if database not available
      tickets = ticketStorage.getAll();
      if (eventId) {
        tickets = tickets.filter(t => t.eventId === eventId);
      }
    }

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
