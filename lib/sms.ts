/**
 * SMS Service using Fast2SMS (Free for transactional SMS in India)
 * 
 * Setup:
 * 1. Register at https://www.fast2sms.com/
 * 2. Get your API key from Settings > API Keys
 * 3. Add FAST2SMS_API_KEY to your .env file
 */

export interface SMSMessage {
    to: string; // Phone number with country code (e.g., "919876543210")
    message: string;
}

export interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Check if Fast2SMS is configured
 */
export function isSMSConfigured(): boolean {
    return !!process.env.FAST2SMS_API_KEY;
}

/**
 * Format phone number for Fast2SMS (Indian numbers without +91)
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading 91 or +91
    if (cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = cleaned.slice(2);
    }

    // Ensure 10 digit number
    if (cleaned.length !== 10) {
        throw new Error('Invalid phone number format');
    }

    return cleaned;
}

/**
 * Send SMS using Fast2SMS Quick API
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!isSMSConfigured()) {
        console.log('[SMS] Fast2SMS not configured, logging message:');
        console.log(`[SMS] To: ${message.to}`);
        console.log(`[SMS] Message: ${message.message}`);
        return {
            success: true,
            messageId: 'demo-' + Date.now(),
            error: 'SMS service not configured - message logged to console',
        };
    }

    try {
        const phoneNumber = formatPhoneNumber(message.to);

        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY!,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                route: 'q', // Quick SMS route (transactional)
                message: message.message,
                language: 'english',
                flash: 0,
                numbers: phoneNumber,
            }),
        });

        const data = await response.json();

        if (data.return === true) {
            return {
                success: true,
                messageId: data.request_id,
            };
        } else {
            return {
                success: false,
                error: data.message || 'Failed to send SMS',
            };
        }
    } catch (error: any) {
        console.error('[SMS] Error sending SMS:', error);
        return {
            success: false,
            error: error.message || 'SMS service error',
        };
    }
}

/**
 * Send ticket confirmation SMS
 */
export async function sendTicketConfirmationSMS(data: {
    phone: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    ticketId: string;
}): Promise<SMSResult> {
    const message = `Hi ${data.attendeeName}! Your ticket for ${data.eventName} on ${data.eventDate} is confirmed. Ticket ID: ${data.ticketId.slice(-8).toUpperCase()}. Show QR code at entry.`;

    return sendSMS({
        to: data.phone,
        message,
    });
}

/**
 * Send event reminder SMS
 */
export async function sendEventReminderSMS(data: {
    phone: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    venue: string;
}): Promise<SMSResult> {
    const message = `Reminder: ${data.eventName} is tomorrow at ${data.venue}! Don't forget your ticket. See you there, ${data.attendeeName}!`;

    return sendSMS({
        to: data.phone,
        message,
    });
}
