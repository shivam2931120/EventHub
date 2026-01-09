import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartCardProps {
    title: string;
    children: React.ReactElement;
}

export default function ChartCard({ title, children }: ChartCardProps) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
        </div>
    );
}
