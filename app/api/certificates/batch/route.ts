import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { generateCertificate } from '@/lib/certificateService';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            eventId,
            names,
            type = 'participant',
            settings = {},
            includeFromAttendees = false
        } = body;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Collect names to generate certificates for
        let certificateNames: string[] = names || [];

        // If includeFromAttendees, fetch all attendees for this event
        if (includeFromAttendees) {
            try {
                const tickets = await prisma.ticket.findMany({
                    where: {
                        eventId,
                        status: 'paid'
                    },
                    select: { name: true }
                });
                const attendeeNames = tickets.map((t: { name: string }) => t.name);
                certificateNames = [...new Set([...certificateNames, ...attendeeNames])];
            } catch (e) {
                console.log('Database not available, using provided names only');
            }
        }

        if (certificateNames.length === 0) {
            return NextResponse.json(
                { error: 'No names provided for certificate generation' },
                { status: 400 }
            );
        }

        // Limit to prevent server overload
        const MAX_CERTIFICATES = 100;
        if (certificateNames.length > MAX_CERTIFICATES) {
            return NextResponse.json(
                { error: `Maximum ${MAX_CERTIFICATES} certificates per batch. You requested ${certificateNames.length}.` },
                { status: 400 }
            );
        }

        // Get event details
        let eventName = 'Event Certificate';
        try {
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: { name: true }
            });
            if (event) {
                eventName = event.name;
            }
        } catch (e) {
            console.log('Could not fetch event name');
        }

        // Create ZIP file
        const zip = new JSZip();
        const certificatesFolder = zip.folder('certificates');

        if (!certificatesFolder) {
            return NextResponse.json(
                { error: 'Failed to create ZIP folder' },
                { status: 500 }
            );
        }

        // Generate certificates
        const results: { name: string; success: boolean; error?: string }[] = [];

        for (const name of certificateNames) {
            try {
                // Generate PDF - use default template path
                const templatePath = `public/templates/${type}_certificate.pdf`;
                const pdfBytes = await generateCertificate(
                    templatePath,
                    name,
                    settings
                );

                // Add to ZIP - sanitize filename
                const safeName = name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
                const filename = `${safeName}_${type}_certificate.pdf`;
                certificatesFolder.file(filename, pdfBytes);

                results.push({ name, success: true });
            } catch (err: any) {
                console.error(`Failed to generate certificate for ${name}:`, err);
                results.push({ name, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;

        if (successCount === 0) {
            return NextResponse.json(
                { error: 'Failed to generate any certificates' },
                { status: 500 }
            );
        }

        // Generate ZIP buffer
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        // Create response with ZIP file
        const response = new NextResponse(Buffer.from(zipBuffer));
        response.headers.set('Content-Type', 'application/zip');
        response.headers.set('Content-Disposition', `attachment; filename="${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${type}_certificates.zip"`);
        response.headers.set('X-Certificates-Generated', successCount.toString());
        response.headers.set('X-Certificates-Total', certificateNames.length.toString());

        return response;
    } catch (error) {
        console.error('Batch certificate generation failed:', error);
        return NextResponse.json(
            { error: 'Failed to generate certificate batch' },
            { status: 500 }
        );
    }
}
