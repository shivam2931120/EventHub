'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="bg-black text-white">
                <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                    <h2 className="text-2xl font-bold text-red-500">Critical Error</h2>
                    <p className="text-zinc-400">Application functionality is unavailable.</p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
