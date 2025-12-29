import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail, isBrevoConfigured } from '@/lib/brevo';
import { generateTicketPDF } from '@/lib/pdf-generator';
import { generateQRCodeBase64 } from '@/lib/qr-generator';

export interface EmailRequestBody {
  to: string;
  subject?: string;
  ticketId: string;
  token: string;
  eventName: string;
  attendeeName: string;
  eventDate: string;
  venue: string;
  // Payment details
  amountPaid: number; // in paise
  transactionId: string; // razorpay_payment_id
  orderId: string; // razorpay_order_id
  paymentDate?: string;
  paymentMode?: string;
  // Styling options
  emailStyles?: {
    bgColor?: string;
    textColor?: string;
    accentColor?: string;
    gradientColor?: string;
    borderRadius?: number;
    fontFamily?: string;
    logoUrl?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequestBody = await request.json();
    const {
      to,
      subject,
      ticketId,
      token,
      eventName,
      attendeeName,
      eventDate,
      venue,
      amountPaid,
      transactionId,
      orderId,
      paymentDate,
      paymentMode,
      emailStyles,
    } = body;

    if (!to || !ticketId || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if Brevo is configured
    if (!isBrevoConfigured()) {
      console.warn('Brevo not configured - email will not be sent');
      return NextResponse.json({
        success: true,
        message: 'Email skipped (Brevo not configured)',
        demo: true,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ticketUrl = `${baseUrl}/ticket/${ticketId}?success=true`;
    const formattedPaymentDate = paymentDate || new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const formattedEventDate = eventDate
      ? new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      : 'TBA';

    // Extract styles with defaults
    const s = {
      bgColor: emailStyles?.bgColor || '#111111',
      textColor: emailStyles?.textColor || '#ffffff',
      accentColor: emailStyles?.accentColor || '#dc2626',
      gradientColor: emailStyles?.gradientColor || '#991b1b',
      borderRadius: emailStyles?.borderRadius || 16,
      fontFamily:
        emailStyles?.fontFamily === 'playfair'
          ? 'Georgia, serif'
          : emailStyles?.fontFamily === 'montserrat'
            ? 'Verdana, sans-serif'
            : 'Arial, sans-serif',
    };

    // Generate QR code for inline display
    const qrCodeBase64 = await generateQRCodeBase64(
      `${baseUrl}/ticket/${ticketId}?token=${token}`,
      { width: 180 }
    );

    // Build the email HTML with payment details
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Ticket</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: ${s.fontFamily};">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${s.bgColor}; border-radius: ${s.borderRadius}px; overflow: hidden; border: 1px solid #333333;">
                  <!-- Header -->
                  <tr>
                    <td style="background: ${s.accentColor}; background: linear-gradient(135deg, ${s.accentColor}, ${s.gradientColor}); padding: 30px; text-align: center;">
                      ${emailStyles?.logoUrl ? `<img src="${emailStyles.logoUrl}" alt="Logo" style="height: 40px; margin-bottom: 10px; opacity: 0.9;">` : ''}
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎫 Your Ticket is Confirmed!</h1>
                      <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">Payment successful - Your e-ticket is attached</p>
                    </td>
                  </tr>
                  
                  <!-- Event Details -->
                  <tr>
                    <td style="padding: 30px;">
                      <h2 style="color: ${s.textColor}; margin: 0 0 20px 0; font-size: 22px;">${eventName}</h2>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 15px; background-color: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px;">
                            <p style="color: #888888; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">ATTENDEE</p>
                            <p style="color: ${s.textColor}; font-size: 16px; margin: 0; font-weight: bold;">${attendeeName}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                          <td width="48%" style="padding: 15px; background-color: rgba(255,255,255,0.05); border-radius: 8px;">
                            <p style="color: #888888; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">📅 DATE</p>
                            <p style="color: ${s.textColor}; font-size: 14px; margin: 0;">${formattedEventDate}</p>
                          </td>
                          <td width="4%"></td>
                          <td width="48%" style="padding: 15px; background-color: rgba(255,255,255,0.05); border-radius: 8px;">
                            <p style="color: #888888; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">📍 VENUE</p>
                            <p style="color: ${s.textColor}; font-size: 14px; margin: 0;">${venue || 'TBA'}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- QR Code Section -->
                      <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 12px;">
                        <img src="cid:qrcode" alt="Ticket QR Code" style="width: 150px; height: 150px;">
                        <p style="color: #666666; font-size: 12px; margin: 10px 0 0 0;">Scan at venue for entry</p>
                      </div>
                    </td>
                  </tr>

                  <!-- Payment Details Section -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid #333;">
                        <tr>
                          <td style="padding: 20px;">
                            <h3 style="color: ${s.accentColor}; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">💳 Payment Details</h3>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333;">
                                  <span style="color: #888888; font-size: 13px;">Amount Paid</span>
                                </td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">
                                  <span style="color: #22c55e; font-size: 16px; font-weight: bold;">₹${((amountPaid || 0) / 100).toFixed(2)}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333;">
                                  <span style="color: #888888; font-size: 13px;">Transaction ID</span>
                                </td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">
                                  <span style="color: ${s.textColor}; font-size: 12px; font-family: monospace;">${transactionId || 'N/A'}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333;">
                                  <span style="color: #888888; font-size: 13px;">Order ID</span>
                                </td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">
                                  <span style="color: ${s.textColor}; font-size: 12px; font-family: monospace;">${orderId || 'N/A'}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333;">
                                  <span style="color: #888888; font-size: 13px;">Payment Date</span>
                                </td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">
                                  <span style="color: ${s.textColor}; font-size: 13px;">${formattedPaymentDate}</span>
                                </td>
                              </tr>
                              ${paymentMode ? `
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #888888; font-size: 13px;">Payment Mode</span>
                                </td>
                                <td style="padding: 8px 0; text-align: right;">
                                  <span style="color: ${s.textColor}; font-size: 13px;">${paymentMode}</span>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Ticket Info -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 15px; background-color: rgba(255,255,255,0.05); border-radius: 8px; text-align: center;">
                            <p style="color: #888888; font-size: 11px; margin: 0 0 5px 0; text-transform: uppercase;">TICKET ID</p>
                            <p style="color: ${s.textColor}; font-size: 14px; margin: 0; font-family: monospace;">${ticketId}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                      
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                      <a href="${ticketUrl}" 
                         style="display: inline-block; padding: 16px 40px; background-color: ${s.accentColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        View Ticket Online
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px; background-color: #0a0a0a; text-align: center; border-top: 1px solid #333333;">
                      <p style="color: #666666; font-size: 12px; margin: 0 0 5px 0;">
                        📎 Your ticket is also attached as a PDF
                      </p>
                      <p style="color: #444444; font-size: 11px; margin: 0;">
                        EventHub • Secure Event Ticketing
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Generate PDF ticket
    let pdfBase64 = '';
    try {
      pdfBase64 = await generateTicketPDF({
        ticketId,
        token: token || ticketId,
        attendeeName: attendeeName || 'Guest',
        eventName,
        eventDate: formattedEventDate,
        venue: venue || 'TBA',
        amountPaid: amountPaid || 0,
        transactionId: transactionId || 'N/A',
        orderId: orderId || 'N/A',
        paymentDate: formattedPaymentDate,
        paymentMode,
      });
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF if generation fails
    }

    // Send email via Brevo
    const result = await sendTransactionalEmail({
      to,
      toName: attendeeName || undefined,
      subject: subject || `🎫 Your ticket for ${eventName} - Confirmed!`,
      htmlContent: emailHtml,
      attachments: pdfBase64
        ? [
          {
            filename: `ticket-${ticketId}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ]
        : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
      });
    } else {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
