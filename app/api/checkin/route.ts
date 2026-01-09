import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, token, action = 'checkin' } = body;

    if (!ticketId && !token) {
      return NextResponse.json(
        { error: 'Ticket ID or token is required' },
        { status: 400 }
      );
    }

    let ticket: any = null;
    let updatedTicket: any = null;

    // Try to find ticket in database first
    try {
      if (ticketId) {
        ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { event: true },
        });
      } else if (token) {
        ticket = await prisma.ticket.findFirst({
          where: { token },
          include: { event: true },
        });
      }

      if (ticket) {
        // Determine new check-in status based on action
        const newCheckedInStatus = action === 'undo' ? false : !ticket.checkedIn;

        updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            checkedIn: action === 'undo' ? false : true,
            checkedInAt: action === 'undo' ? null : new Date(),
          },
          include: { event: true },
        });

        return NextResponse.json({
          success: true,
          ticketId: updatedTicket.id,
          checkedIn: updatedTicket.checkedIn,
          action: action === 'undo' ? 'unchecked' : 'checked_in',
          attendeeName: updatedTicket.name,
          eventName: updatedTicket.event?.name,
          message: action === 'undo'
            ? `Check-in undone for ${updatedTicket.name}`
            : `${updatedTicket.name} checked in successfully!`,
        });
      }
    } catch (e) {
      console.log('Database not available, checking in-memory storage');
    }

    // Fallback to in-memory storage
    const memoryTicket = ticketId
      ? ticketStorage.get(ticketId)
      : ticketStorage.findByToken(token);

    if (memoryTicket) {
      const newCheckedInStatus = action === 'undo' ? false : true;
      ticketStorage.update(memoryTicket.id, {
        checkedIn: newCheckedInStatus,
      });

      return NextResponse.json({
        success: true,
        ticketId: memoryTicket.id,
        checkedIn: newCheckedInStatus,
        action: action === 'undo' ? 'unchecked' : 'checked_in',
        attendeeName: memoryTicket.name,
        message: action === 'undo'
          ? `Check-in undone for ${memoryTicket.name}`
          : `${memoryTicket.name} checked in successfully!`,
      });
    }

    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Check-in failed' },
      { status: 500 }
    );
  }
}

// GET - Verify ticket for check-in (used by QR scanner)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const ticketId = searchParams.get('ticketId');

    if (!token && !ticketId) {
      return NextResponse.json(
        { error: 'Token or ticket ID is required' },
        { status: 400 }
      );
    }

    let ticket: any = null;

    // Try database first
    try {
      if (ticketId) {
        ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { event: true },
        });
      } else if (token) {
        ticket = await prisma.ticket.findFirst({
          where: { token },
          include: { event: true },
        });
      }
    } catch (e) {
      console.log('Database not available');
    }

    // Fallback to memory
    if (!ticket) {
      ticket = ticketId
        ? ticketStorage.get(ticketId)
        : ticketStorage.findByToken(token || '');
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found', valid: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      ticketId: ticket.id,
      attendeeName: ticket.name,
      email: ticket.email,
      eventName: ticket.event?.name || 'Unknown Event',
      eventId: ticket.eventId,
      status: ticket.status,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
    });
  } catch (error) {
    console.error('Ticket verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', valid: false },
      { status: 500 }
    );
  }
}
