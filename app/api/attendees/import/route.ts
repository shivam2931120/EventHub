import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import { ticketStorage } from '@/lib/ticket-storage';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, csvData } = body;

        if (!eventId || !csvData) {
            return NextResponse.json(
                { error: 'Event ID and CSV data are required' },
                { status: 400 }
            );
        }

        // Parse CSV
        const { data, errors } = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.toLowerCase().trim()
        });

        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Invalid CSV format', details: errors },
                { status: 400 }
            );
        }

        if (data.length === 0) {
            return NextResponse.json(
                { error: 'No data found in CSV' },
                { status: 400 }
            );
        }

        const rows = data as any[];
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Process each row
        for (const row of rows) {
            // Flexible header matching
            const name = row['name'] || row['attendee'] || row['full name'];
            const email = row['email'] || row['email address'];
            const phone = row['phone'] || row['mobile'] || row['contact'] || '';

            if (!name) {
                results.failed++;
                results.errors.push(`Row missing name: ${JSON.stringify(row)}`);
                continue;
            }

            try {
                // Check for duplicate (email + event)
                let existingTicket = null;
                if (email) {
                    existingTicket = await prisma.ticket.findFirst({
                        where: { eventId, email }
                    });
                }

                if (existingTicket) {
                    results.failed++;
                    results.errors.push(`Duplicate email for event: ${email}`);
                    continue;
                }

                // Create Ticket
                const ticket = await prisma.ticket.create({
                    data: {
                        name,
                        email: email || `no-email-${Date.now()}-${Math.random()}@placeholder.com`,
                        phone,
                        eventId,
                        status: 'paid', // Assuming imported attendees are confirmed
                        checkedIn: false,
                        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
                    }
                });

                // Add to memory storage
                ticketStorage.set(ticket.id, {
                    ...ticket,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'paid'
                });

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: `Import processed: ${results.success} succeeded, ${results.failed} failed`,
            results
        });

    } catch (error) {
        console.error('Import failed:', error);
        return NextResponse.json(
            { error: 'Import failed' },
            { status: 500 }
        );
    }
}
