'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled app error:', error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white gap-4">
            <h2 className="text-2xl font-bold text-red-500">Something went wrong!</h2>
            <p className="text-zinc-400">{error.message || 'An unexpected error occurred.'}</p>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
