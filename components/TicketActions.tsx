'use client';

import { useState } from 'react';
import { useToast } from './Toaster';

interface TicketActionsProps {
    ticketId: string;
    ticketStatus: string;
    isCheckedIn: boolean;
    attendeeName: string;
    attendeeEmail: string;
    onActionComplete?: () => void;
}

export default function TicketActions({
    ticketId,
    ticketStatus,
    isCheckedIn,
    attendeeName,
    attendeeEmail,
    onActionComplete,
}: TicketActionsProps) {
    const { showToast } = useToast();
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transferData, setTransferData] = useState({ name: '', email: '', phone: '' });

    const handleRefund = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tickets/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId }),
            });
            const data = await res.json();

            if (res.ok) {
                showToast('Ticket refunded successfully', 'success');
                setShowRefundModal(false);
                onActionComplete?.();
            } else {
                showToast(data.error || 'Refund failed', 'error');
            }
        } catch (err) {
            showToast('Failed to process refund', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!transferData.name || !transferData.email) {
            showToast('Name and email are required', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/tickets/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId,
                    newOwnerName: transferData.name,
                    newOwnerEmail: transferData.email,
                    newOwnerPhone: transferData.phone,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                showToast('Ticket transferred successfully', 'success');
                setShowTransferModal(false);
                setTransferData({ name: '', email: '', phone: '' });
                onActionComplete?.();
            } else {
                showToast(data.error || 'Transfer failed', 'error');
            }
        } catch (err) {
            showToast('Failed to transfer ticket', 'error');
        } finally {
            setLoading(false);
        }
    };

    const canRefund = ticketStatus === 'paid' && !isCheckedIn;
    const canTransfer = ticketStatus === 'paid' && !isCheckedIn;

    return (
        <>
            <div className="flex gap-2">
                {canTransfer && (
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="px-3 py-1.5 text-sm bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Transfer
                    </button>
                )}

                {canRefund && (
                    <button
                        onClick={() => setShowRefundModal(true)}
                        className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Refund
                    </button>
                )}
            </div>

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Transfer Ticket</h3>
                        <p className="text-zinc-400 text-sm mb-4">
                            Transfer this ticket from <span className="text-white">{attendeeName}</span> to a new owner.
                        </p>

                        <div className="space-y-3 mb-6">
                            <input
                                type="text"
                                placeholder="New owner name *"
                                value={transferData.name}
                                onChange={(e) => setTransferData({ ...transferData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="email"
                                placeholder="New owner email *"
                                value={transferData.email}
                                onChange={(e) => setTransferData({ ...transferData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="tel"
                                placeholder="New owner phone (optional)"
                                value={transferData.phone}
                                onChange={(e) => setTransferData({ ...transferData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="flex-1 py-3 border border-zinc-700 text-white rounded-xl hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Confirm Refund</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Are you sure you want to refund this ticket for <span className="text-white">{attendeeName}</span>?
                            This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="flex-1 py-3 border border-zinc-700 text-white rounded-xl hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRefund}
                                disabled={loading}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Refund Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
