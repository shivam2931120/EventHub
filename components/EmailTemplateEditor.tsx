'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    type: 'confirmation' | 'reminder' | 'certificate' | 'custom';
}

// Default templates
const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        id: 'confirmation',
        name: 'Ticket Confirmation',
        subject: 'Your Ticket for {{eventName}}',
        type: 'confirmation',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #1a1a1a; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #2d2d2d; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .ticket-card { background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
        .label { color: #888; font-size: 14px; }
        .value { color: #fff; font-weight: 600; }
        .qr-section { text-align: center; padding: 24px; background: #fff; border-radius: 12px; margin: 20px 0; }
        .footer { padding: 24px; text-align: center; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 14px 32px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Your Ticket is Confirmed!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{attendeeName}}</strong>,</p>
            <p>Your registration for <strong>{{eventName}}</strong> has been confirmed!</p>
            
            <div class="ticket-card">
                <div class="detail-row">
                    <span class="label">Event</span>
                    <span class="value">{{eventName}}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Date</span>
                    <span class="value">{{eventDate}}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Venue</span>
                    <span class="value">{{venue}}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Ticket ID</span>
                    <span class="value">{{ticketId}}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount Paid</span>
                    <span class="value">₹{{amountPaid}}</span>
                </div>
            </div>
            
            <p style="text-align: center;">
                <a href="{{ticketUrl}}" class="btn">View Your Ticket</a>
            </p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply.</p>
            <p>© {{year}} EventHub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    },
    {
        id: 'reminder',
        name: 'Event Reminder',
        subject: 'Reminder: {{eventName}} is Tomorrow!',
        type: 'reminder',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #1a1a1a; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #2d2d2d; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center; }
        .content { padding: 32px; }
        .footer { padding: 24px; text-align: center; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 14px 32px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Event Reminder</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{attendeeName}}</strong>,</p>
            <p>Just a friendly reminder that <strong>{{eventName}}</strong> is happening tomorrow!</p>
            <p><strong>Date:</strong> {{eventDate}}</p>
            <p><strong>Venue:</strong> {{venue}}</p>
            <p style="text-align: center; margin-top: 24px;">
                <a href="{{ticketUrl}}" class="btn">View Your Ticket</a>
            </p>
        </div>
        <div class="footer">
            <p>See you there! 🎉</p>
        </div>
    </div>
</body>
</html>`,
    },
];

// Available variables for insertion
const AVAILABLE_VARIABLES = [
    { key: '{{attendeeName}}', label: 'Attendee Name' },
    { key: '{{eventName}}', label: 'Event Name' },
    { key: '{{eventDate}}', label: 'Event Date' },
    { key: '{{venue}}', label: 'Venue' },
    { key: '{{ticketId}}', label: 'Ticket ID' },
    { key: '{{ticketUrl}}', label: 'Ticket URL' },
    { key: '{{amountPaid}}', label: 'Amount Paid' },
    { key: '{{transactionId}}', label: 'Transaction ID' },
    { key: '{{orderId}}', label: 'Order ID' },
    { key: '{{year}}', label: 'Current Year' },
];

export default function EmailTemplateEditor() {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATES[0]);
    const [editMode, setEditMode] = useState<'visual' | 'code'>('code');
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Sample data for preview
    const sampleData = {
        attendeeName: 'John Doe',
        eventName: 'Tech Conference 2025',
        eventDate: 'January 15, 2025',
        venue: 'Convention Center, Mumbai',
        ticketId: 'TICKET-123456',
        ticketUrl: 'https://eventhub.com/ticket/123456',
        amountPaid: '500',
        transactionId: 'TXN-789012',
        orderId: 'ORD-345678',
        year: new Date().getFullYear().toString(),
    };

    // Replace variables in template
    const replaceVariables = (html: string) => {
        let result = html;
        Object.entries(sampleData).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return result;
    };

    // Insert variable at cursor
    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = selectedTemplate.htmlContent;
            const newText = text.substring(0, start) + variable + text.substring(end);
            setSelectedTemplate({ ...selectedTemplate, htmlContent: newText });
            // Set cursor position after inserted text
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        }
    };

    // Save template
    const saveTemplate = async () => {
        setIsSaving(true);
        try {
            // Save to local storage for now (could be API call)
            const updatedTemplates = templates.map(t =>
                t.id === selectedTemplate.id ? selectedTemplate : t
            );
            setTemplates(updatedTemplates);
            localStorage.setItem('emailTemplates', JSON.stringify(updatedTemplates));
            showToast('Template saved!', 'success');
        } catch (error) {
            showToast('Failed to save template', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Load templates from storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('emailTemplates');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setTemplates(parsed);
                setSelectedTemplate(parsed[0]);
            } catch {
                // Use defaults
            }
        }
    }, []);

    // Send test email
    const sendTestEmail = async () => {
        const testEmail = prompt('Enter email to send test:');
        if (!testEmail) return;

        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: testEmail,
                    subject: replaceVariables(selectedTemplate.subject),
                    htmlContent: replaceVariables(selectedTemplate.htmlContent),
                    isTest: true,
                }),
            });

            if (res.ok) {
                showToast('Test email sent!', 'success');
            } else {
                showToast('Failed to send test email', 'error');
            }
        } catch {
            showToast('Failed to send test email', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email Templates
                    </h2>
                    <p className="text-zinc-400 text-sm">Customize your email templates with variables</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${showPreview ? 'bg-zinc-700 text-white border border-zinc-600' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    >
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button
                        onClick={sendTestEmail}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm"
                    >
                        Send Test
                    </button>
                    <button
                        onClick={saveTemplate}
                        disabled={isSaving}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Template Selector */}
                <div className="space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Templates</h3>
                        <div className="space-y-2">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedTemplate.id === template.id
                                        ? 'bg-red-600 text-white'
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                        }`}
                                >
                                    <p className="font-medium text-sm">{template.name}</p>
                                    <p className="text-xs opacity-70">{template.type}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Variables */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Variables</h3>
                        <div className="space-y-1">
                            {AVAILABLE_VARIABLES.map(v => (
                                <button
                                    key={v.key}
                                    onClick={() => insertVariable(v.key)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors group"
                                >
                                    <code className="text-xs text-red-400 group-hover:text-red-300">{v.key}</code>
                                    <p className="text-xs text-zinc-500">{v.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Editor */}
                <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                    {/* Subject */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <label className="block text-sm text-zinc-400 mb-2">Subject Line</label>
                        <input
                            type="text"
                            value={selectedTemplate.subject}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                        />
                    </div>

                    {/* HTML Editor */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">HTML Content</span>
                            <div className="flex bg-zinc-800 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setEditMode('code')}
                                    className={`px-3 py-1 text-xs ${editMode === 'code' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                                >
                                    Code
                                </button>
                                <button
                                    onClick={() => setEditMode('visual')}
                                    className={`px-3 py-1 text-xs ${editMode === 'visual' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                                >
                                    Visual
                                </button>
                            </div>
                        </div>
                        {editMode === 'code' ? (
                            <textarea
                                id="html-editor"
                                value={selectedTemplate.htmlContent}
                                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, htmlContent: e.target.value })}
                                className="w-full h-[500px] px-4 py-3 bg-zinc-950 text-zinc-300 font-mono text-sm resize-none focus:outline-none"
                                spellCheck={false}
                            />
                        ) : (
                            <div
                                className="w-full h-[500px] bg-white overflow-auto"
                                dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.htmlContent) }}
                            />
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Live Preview</span>
                        </div>
                        <div className="h-[600px] overflow-auto bg-zinc-950 p-4">
                            <div className="bg-zinc-800 rounded-lg p-2 mb-4 text-xs">
                                <strong className="text-zinc-400">Subject:</strong>{' '}
                                <span className="text-white">{replaceVariables(selectedTemplate.subject)}</span>
                            </div>
                            <iframe
                                srcDoc={replaceVariables(selectedTemplate.htmlContent)}
                                className="w-full h-[520px] bg-white rounded-lg"
                                title="Email Preview"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
