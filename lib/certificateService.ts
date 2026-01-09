import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

export interface CertificateSettings {
    nameX?: number;       // X position (percentage from left, default 50 = center)
    nameY?: number;       // Y position (pixels from bottom)
    fontSize?: number;    // Font size
    fontColor?: string;   // Hex color like #FDB515
    fontFamily?: string;  // Font name
}

const DEFAULT_SETTINGS: CertificateSettings = {
    nameX: 50,
    nameY: 335,
    fontSize: 42,
    fontColor: '#FDB515', // Gold color
    fontFamily: 'Times-BoldItalic',
};

/**
 * Parse hex color to RGB values (0-1 range)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        };
    }
    return { r: 0, g: 0, b: 0 };
}

/**
 * Generate a certificate PDF with the given name
 */
export async function generateCertificate(
    templatePath: string,
    name: string,
    settings: CertificateSettings = {}
): Promise<Uint8Array> {
    const config = { ...DEFAULT_SETTINGS, ...settings };

    // Load the template PDF
    let templateBytes: Uint8Array;

    if (templatePath.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(templatePath);
        templateBytes = new Uint8Array(await response.arrayBuffer());
    } else {
        // Read from file system
        const fullPath = path.join(process.cwd(), 'public', templatePath);
        templateBytes = fs.readFileSync(fullPath);
    }

    const pdfDoc = await PDFDocument.load(templateBytes);

    // Register fontkit for custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed font - use standard font (TimesRomanBoldItalic)
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // Calculate text width and position
    const fontSize = config.fontSize || 42;
    const textWidth = font.widthOfTextAtSize(name, fontSize);

    // X position: percentage from left (50 = center)
    const xPosition = ((config.nameX || 50) / 100) * width - textWidth / 2;

    // Y position: pixels from bottom
    const yPosition = config.nameY || 335;

    // Parse color
    const color = hexToRgb(config.fontColor || '#FDB515');

    // Draw the name
    firstPage.drawText(name, {
        x: xPosition,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

/**
 * Generate multiple certificates and return as array of {name, pdfBytes}
 */
export async function generateBatchCertificates(
    templatePath: string,
    names: string[],
    settings: CertificateSettings = {}
): Promise<Array<{ name: string; pdfBytes: Uint8Array }>> {
    const results: Array<{ name: string; pdfBytes: Uint8Array }> = [];

    for (const name of names) {
        const pdfBytes = await generateCertificate(templatePath, name, settings);
        results.push({ name, pdfBytes });
    }

    return results;
}

/**
 * Save certificate to disk and return the file path
 */
export async function saveCertificateToDisk(
    templatePath: string,
    name: string,
    eventName: string,
    settings: CertificateSettings = {}
): Promise<string> {
    const pdfBytes = await generateCertificate(templatePath, name, settings);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'certificates', eventName.replace(/[^a-zA-Z0-9]/g, '_'));
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the file
    const sanitizedName = name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const fileName = `${sanitizedName}_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, pdfBytes);

    // Return relative URL path
    return `/certificates/${eventName.replace(/[^a-zA-Z0-9]/g, '_')}/${fileName}`;
}
