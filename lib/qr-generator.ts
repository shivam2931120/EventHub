import QRCode from 'qrcode';

export interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
}

/**
 * Generate a QR code as a base64 data URL
 */
export async function generateQRCodeDataURL(
    data: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
        ...options,
    };

    try {
        return await QRCode.toDataURL(data, defaultOptions);
    } catch (error) {
        console.error('QR code generation failed:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Generate a QR code as a base64 string (without data URL prefix)
 */
export async function generateQRCodeBase64(
    data: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const dataUrl = await generateQRCodeDataURL(data, options);
    // Remove the data URL prefix to get just the base64 string
    return dataUrl.replace(/^data:image\/png;base64,/, '');
}

/**
 * Generate ticket verification URL
 */
export function generateTicketVerificationURL(
    ticketId: string,
    token: string,
    baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
): string {
    return `${baseUrl}/ticket/${ticketId}?token=${token}`;
}
