import React from 'react';

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    color: string;
}

export default function StatCard({ icon, label, value, color }: StatCardProps) {
    const colors = {
        blue: 'bg-blue-900/50 text-blue-400',
        green: 'bg-green-900/50 text-green-400',
        purple: 'bg-purple-900/50 text-purple-400',
        red: 'bg-red-900/50 text-red-400'
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon === 'ticket' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />}
                        {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        {icon === 'checkin' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                        {icon === 'money' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                </div>
                <span className="text-zinc-400 text-sm">{label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}
