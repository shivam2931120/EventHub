'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface Certificate {
    id: string;
    name: string;
    email?: string;
    type: string;
    downloadUrl?: string;
    createdAt: string;
    event: { id: string; name: string };
}

interface Event {
    id: string;
    name: string;
    certificateTemplate?: string;
    certificateSettings?: {
        nameX?: number;
        nameY?: number;
        fontSize?: number;
        fontColor?: string;
    };
}

interface Ticket {
    id: string;
    name: string;
    email?: string;
}

export default function CertificateManager({ events, tickets }: { events: Event[]; tickets: Ticket[] }) {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [certificateType, setCertificateType] = useState<'participant' | 'volunteer' | 'winner' | 'runner-up'>('participant');
    const [showSettings, setShowSettings] = useState(false);
    const [singleName, setSingleName] = useState('');
    const [bulkNames, setBulkNames] = useState('');
    const { showToast } = useToast();

    // Certificate settings
    const [settings, setSettings] = useState({
        nameX: 50,
        nameY: 335,
        fontSize: 42,
        fontColor: '#FDB515',
    });

    useEffect(() => {
        if (events.length > 0 && !selectedEvent) {
            setSelectedEvent(events[0].id);
        }
    }, [events, selectedEvent]);

    useEffect(() => {
        if (selectedEvent) {
            fetchCertificates();
        }
    }, [selectedEvent, certificateType]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/certificates?eventId=${selectedEvent}&type=${certificateType}`);
            const data = await res.json();
            setCertificates(data.certificates || []);
        } catch (error) {
            showToast('Failed to load certificates', 'error');
        } finally {
            setLoading(false);
        }
    };

    const generateSingleCertificate = async () => {
        if (!singleName.trim() || !selectedEvent) {
            showToast('Please enter a name and select an event', 'error');
            return;
        }

        try {
            setGenerating(true);
            const res = await fetch('/api/certificates/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: selectedEvent,
                    name: singleName.trim(),
                    type: certificateType,
                    settings,
                }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${singleName.replace(/[^a-zA-Z0-9\s]/g, '')}_certificate.pdf`;
                a.click();
                URL.revokeObjectURL(url);

                showToast('Certificate generated!', 'success');
                setSingleName('');
                fetchCertificates();
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to generate certificate', 'error');
            }
        } catch (error) {
            showToast('Failed to generate certificate', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const generateBulkCertificates = async () => {
        const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n);
        if (names.length === 0) {
            showToast('Please enter at least one name', 'error');
            return;
        }

        try {
            setGenerating(true);
            let successCount = 0;

            for (const name of names) {
                try {
                    const res = await fetch('/api/certificates/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventId: selectedEvent,
                            name,
                            type: certificateType,
                            settings,
                        }),
                    });

                    if (res.ok) successCount++;
                } catch (e) {
                    console.error(`Failed to generate for ${name}`, e);
                }
            }

            showToast(`Generated ${successCount}/${names.length} certificates!`, 'success');
            setBulkNames('');
            fetchCertificates();
        } catch (error) {
            showToast('Failed to generate certificates', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const generateFromAttendees = async () => {
        if (!selectedEvent) {
            showToast('Please select an event', 'error');
            return;
        }

        const eventTickets = tickets.filter(t => {
            // If we had ticket.eventId, we'd filter here
            return true;
        });

        if (eventTickets.length === 0) {
            showToast('No attendees found for this event', 'error');
            return;
        }

        const names = eventTickets.map(t => t.name);
        setBulkNames(names.join('\n'));
        showToast(`Loaded ${names.length} attendee names`, 'success');
    };

    const downloadAllAsZIP = async () => {
        if (!selectedEvent) {
            showToast('Please select an event', 'error');
            return;
        }

        const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n);
        if (names.length === 0) {
            showToast('Please enter names or load from attendees first', 'error');
            return;
        }

        try {
            setGenerating(true);
            showToast(`Generating ${names.length} certificates...`, 'info');

            const res = await fetch('/api/certificates/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: selectedEvent,
                    names,
                    type: certificateType,
                    settings,
                }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificates_${certificateType}.zip`;
                a.click();
                URL.revokeObjectURL(url);

                const generated = res.headers.get('X-Certificates-Generated') || names.length;
                showToast(`Downloaded ${generated} certificates as ZIP!`, 'success');
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to generate ZIP', 'error');
            }
        } catch (error) {
            showToast('Failed to download certificates', 'error');
        } finally {
            setGenerating(false);
        }
    };


    const deleteCertificate = async (id: string) => {
        // This would need an individual delete endpoint - for now we just refresh
        showToast('Certificate records are managed through the database', 'info');
    };

    const selectedEventData = events.find(e => e.id === selectedEvent);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Certificate Generator
                    </h2>
                    <p className="text-zinc-400 text-sm">Generate certificates for participants and volunteers</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                        <option value="">Select Event</option>
                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setCertificateType('participant')}
                            className={`px-3 py-2 text-sm ${certificateType === 'participant' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Participants
                        </button>
                        <button
                            onClick={() => setCertificateType('volunteer')}
                            className={`px-3 py-2 text-sm ${certificateType === 'volunteer' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Volunteers
                        </button>
                        <button
                            onClick={() => setCertificateType('winner')}
                            className={`px-3 py-2 text-sm ${certificateType === 'winner' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Winners
                        </button>
                        <button
                            onClick={() => setCertificateType('runner-up')}
                            className={`px-3 py-2 text-sm ${certificateType === 'runner-up' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Runner-ups
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Total Certificates</p>
                    <p className="text-2xl font-bold text-white">{certificates.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Participants</p>
                    <p className="text-2xl font-bold text-red-500">
                        {certificates.filter(c => c.type === 'participant').length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Volunteers</p>
                    <p className="text-2xl font-bold text-zinc-400">
                        {certificates.filter(c => c.type === 'volunteer').length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Template</p>
                    <p className="text-sm font-medium text-red-400 truncate">
                        {selectedEventData?.certificateTemplate || 'Default'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Single Certificate Generator */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Single Certificate
                    </h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={singleName}
                            onChange={(e) => setSingleName(e.target.value)}
                            placeholder="Enter recipient name"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                        />
                        <button
                            onClick={generateSingleCertificate}
                            disabled={generating || !singleName.trim() || !selectedEvent}
                            className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Generate & Download
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Bulk Certificate Generator */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Bulk Generate
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <button
                                onClick={generateFromAttendees}
                                className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm"
                            >
                                Load from Attendees
                            </button>
                            <button
                                onClick={() => setBulkNames('')}
                                className="px-3 py-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 text-sm"
                            >
                                Clear
                            </button>
                        </div>
                        <textarea
                            value={bulkNames}
                            onChange={(e) => setBulkNames(e.target.value)}
                            placeholder="Enter names (one per line)&#10;John Doe&#10;Jane Smith&#10;..."
                            rows={5}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none font-mono text-sm"
                        />
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-zinc-500">
                                {bulkNames.split('\n').filter(n => n.trim()).length} names
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={downloadAllAsZIP}
                                    disabled={generating || !bulkNames.trim() || !selectedEvent}
                                    className="px-4 py-2 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    {generating ? 'Generating...' : 'Download ZIP'}
                                </button>
                                <button
                                    onClick={generateBulkCertificates}
                                    disabled={generating || !bulkNames.trim() || !selectedEvent}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    Generate All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50"
                >
                    <span className="font-medium text-white">Certificate Settings</span>
                    <svg className={`w-5 h-5 text-zinc-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {showSettings && (
                    <div className="px-5 pb-5 space-y-4 border-t border-zinc-800 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">X Position (%)</label>
                                <input
                                    type="number"
                                    value={settings.nameX}
                                    onChange={(e) => setSettings(s => ({ ...s, nameX: Number(e.target.value) }))}
                                    min={0}
                                    max={100}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Y Position (px)</label>
                                <input
                                    type="number"
                                    value={settings.nameY}
                                    onChange={(e) => setSettings(s => ({ ...s, nameY: Number(e.target.value) }))}
                                    min={0}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={settings.fontSize}
                                    onChange={(e) => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                                    min={12}
                                    max={120}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Font Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={settings.fontColor}
                                        onChange={(e) => setSettings(s => ({ ...s, fontColor: e.target.value }))}
                                        className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.fontColor}
                                        onChange={(e) => setSettings(s => ({ ...s, fontColor: e.target.value }))}
                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Note: Upload your PDF template to <code className="bg-zinc-800 px-1 rounded">public/templates/</code> folder and configure it per event.
                        </p>
                    </div>
                )}
            </div>

            {/* Generated Certificates List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                    <h3 className="font-medium text-white">Generated Certificates ({certificates.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : certificates.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-zinc-500">No certificates generated yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
                        {certificates.map(cert => (
                            <div key={cert.id} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-800/50">
                                <div>
                                    <p className="text-white font-medium">{cert.name}</p>
                                    <p className="text-xs text-zinc-500">
                                        {cert.type} • {new Date(cert.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {cert.downloadUrl && (
                                    <a
                                        href={cert.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm"
                                    >
                                        Download
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
