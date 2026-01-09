'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface Group {
    id: string;
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    eventId: string;
    discount: number;
    notes?: string;
    createdAt: string;
    event: { id: string; name: string };
    tickets: Array<{ id: string; name: string; email?: string; checkedIn: boolean }>;
    _count: { tickets: number };
}

interface Event {
    id: string;
    name: string;
}

export default function GroupManager({ events }: { events: Event[] }) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<string>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const { showToast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        eventId: '',
        discount: 0,
        notes: '',
        attendees: [{ name: '', email: '', phone: '' }],
    });

    useEffect(() => {
        fetchGroups();
    }, [selectedEvent]);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const url = selectedEvent === 'all'
                ? '/api/groups'
                : `/api/groups?eventId=${selectedEvent}`;
            const res = await fetch(url);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch (error) {
            showToast('Failed to load groups', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                showToast('Group created successfully!', 'success');
                setShowForm(false);
                resetForm();
                fetchGroups();
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to create group', 'error');
            }
        } catch (error) {
            showToast('Failed to create group', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this group? The tickets will be preserved but unlinked.')) return;

        try {
            const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Group deleted', 'success');
                fetchGroups();
            }
        } catch (error) {
            showToast('Failed to delete group', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            eventId: events[0]?.id || '',
            discount: 0,
            notes: '',
            attendees: [{ name: '', email: '', phone: '' }],
        });
        setEditingGroup(null);
    };

    const addAttendee = () => {
        setFormData(prev => ({
            ...prev,
            attendees: [...prev.attendees, { name: '', email: '', phone: '' }],
        }));
    };

    const removeAttendee = (index: number) => {
        if (formData.attendees.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            attendees: prev.attendees.filter((_, i) => i !== index),
        }));
    };

    const updateAttendee = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
        setFormData(prev => ({
            ...prev,
            attendees: prev.attendees.map((a, i) => i === index ? { ...a, [field]: value } : a),
        }));
    };

    const filteredGroups = selectedEvent === 'all'
        ? groups
        : groups.filter(g => g.eventId === selectedEvent);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Group Registrations
                    </h2>
                    <p className="text-zinc-400 text-sm">Manage organization and team registrations</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                        <option value="all">All Events</option>
                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Group
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Total Groups</p>
                    <p className="text-2xl font-bold text-white">{groups.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Total Members</p>
                    <p className="text-2xl font-bold text-blue-400">{groups.reduce((sum, g) => sum + g._count.tickets, 0)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Checked In</p>
                    <p className="text-2xl font-bold text-green-400">
                        {groups.reduce((sum, g) => sum + g.tickets.filter(t => t.checkedIn).length, 0)}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs">Avg. Group Size</p>
                    <p className="text-2xl font-bold text-purple-400">
                        {groups.length > 0 ? Math.round(groups.reduce((sum, g) => sum + g._count.tickets, 0) / groups.length) : 0}
                    </p>
                </div>
            </div>

            {/* Groups List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                    <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-zinc-400">No group registrations yet</p>
                    <p className="text-zinc-500 text-sm mt-1">Create a group to register multiple attendees together</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredGroups.map(group => (
                        <div key={group.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-white text-lg">{group.name}</h3>
                                    <p className="text-sm text-zinc-400">{group.event.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {group.discount > 0 && (
                                        <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium">
                                            {group.discount}% off
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(group.id)}
                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {group.contactName}
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {group.contactEmail}
                                </span>
                                {group.contactPhone && (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {group.contactPhone}
                                    </span>
                                )}
                            </div>

                            {/* Members */}
                            <div className="border-t border-zinc-800 pt-4">
                                <p className="text-xs text-zinc-500 mb-2">{group._count.tickets} Members</p>
                                <div className="flex flex-wrap gap-2">
                                    {group.tickets.slice(0, 8).map(ticket => (
                                        <span
                                            key={ticket.id}
                                            className={`px-2 py-1 rounded-lg text-xs ${ticket.checkedIn ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}
                                        >
                                            {ticket.name}
                                        </span>
                                    ))}
                                    {group.tickets.length > 8 && (
                                        <span className="px-2 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-500">
                                            +{group.tickets.length - 8} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800">
                            <h3 className="text-xl font-semibold text-white">New Group Registration</h3>
                            <p className="text-zinc-400 text-sm">Register an organization or team</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Organization Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Organization Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Organization/Team Name *"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <select
                                        required
                                        value={formData.eventId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, eventId: e.target.value }))}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                    >
                                        <option value="">Select Event *</option>
                                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Contact Person</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        required
                                        value={formData.contactName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                                        placeholder="Contact Name *"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <input
                                        type="email"
                                        required
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                        placeholder="Contact Email *"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                        placeholder="Contact Phone"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                                    />
                                </div>
                            </div>

                            {/* Attendees */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                                        Attendees ({formData.attendees.length})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addAttendee}
                                        className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {formData.attendees.map((attendee, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <span className="w-6 h-6 bg-red-600 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0">
                                                {index + 1}
                                            </span>
                                            <input
                                                type="text"
                                                required
                                                value={attendee.name}
                                                onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                                                placeholder="Name *"
                                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm"
                                            />
                                            <input
                                                type="email"
                                                value={attendee.email}
                                                onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                                                placeholder="Email"
                                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeAttendee(index)}
                                                disabled={formData.attendees.length <= 1}
                                                className="p-2 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Additional notes (optional)"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium"
                                >
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
