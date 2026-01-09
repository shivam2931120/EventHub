import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificate, saveCertificateToDisk, CertificateSettings } from '@/lib/certificateService';

// POST - Generate certificate PDF
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            eventId,
            name,
            email,
            type = 'participant',
            templatePath,
            settings,
            saveToDb = true
        } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Get event details for certificate settings
        let event = null;
        let effectiveTemplatePath = templatePath;
        let effectiveSettings: CertificateSettings = settings || {};

        if (eventId) {
            event = await prisma.event.findUnique({
                where: { id: eventId },
                select: {
                    id: true,
                    name: true,
                    certificateTemplate: true,
                    certificateSettings: true
                }
            });

            if (event) {
                // Use event-specific template and settings if not provided
                if (!effectiveTemplatePath && event.certificateTemplate) {
                    effectiveTemplatePath = event.certificateTemplate;
                }
                if (!settings && event.certificateSettings) {
                    effectiveSettings = event.certificateSettings as CertificateSettings;
                }
            }
        }

        // Fallback to default template
        if (!effectiveTemplatePath) {
            effectiveTemplatePath = 'templates/default-certificate.pdf';
        }

        // Generate the PDF
        const pdfBytes = await generateCertificate(
            effectiveTemplatePath,
            name,
            effectiveSettings
        );

        // Save to disk if event provided
        let downloadUrl: string | null = null;
        if (event) {
            downloadUrl = await saveCertificateToDisk(
                effectiveTemplatePath,
                name,
                event.name,
                effectiveSettings
            );
        }

        // Save certificate record to database
        if (saveToDb && eventId) {
            await prisma.certificate.create({
                data: {
                    eventId,
                    name,
                    email,
                    type,
                    downloadUrl,
                }
            });
        }

        // Return PDF as response
        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9\s]/g, '')}_certificate.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating certificate:', error);
        return NextResponse.json({
            error: 'Failed to generate certificate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
