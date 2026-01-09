import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail, isBrevoConfigured } from '@/lib/brevo';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isBrevoConfigured()) {
            return NextResponse.json({
                success: true,
                message: 'Email skipped (Brevo not configured)',
                demo: true
            });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const loginUrl = role === 'scanner' ? `${baseUrl}/checkin` : `${baseUrl}/admin`;

        const emailHtml = `
            <!DOCTYPE html>
            <html>
                <body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif; color: #ffffff;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; overflow: hidden; border: 1px solid #333333;">
                        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">Welcome to the Team!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="color: #cccccc;">Hello ${name},</p>
                            <p style="color: #cccccc;">You have been invited to join <strong>EventHub</strong> as a <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
                            
                            <div style="background-color: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #888888; font-size: 12px; text-transform: uppercase;">Your Credentials</p>
                                <p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
                            </div>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${loginUrl}" style="display: inline-block; padding: 12px 30px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Login Now</a>
                            </div>

                            <p style="color: #666666; font-size: 12px; text-align: center; margin-top: 30px;">
                                Please change your password after logging in.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const result = await sendTransactionalEmail({
            to: email,
            toName: name,
            subject: 'Welcome to EventHub Team',
            htmlContent: emailHtml,
        });

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Invitation sent' });
        } else {
            return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
