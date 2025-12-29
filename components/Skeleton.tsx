interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded ${className}`}
            style={{ backgroundSize: '200% 100%' }}
        />
    );
}

export function TicketSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header Skeleton */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-8">
                        <Skeleton className="h-10 w-48 mb-3 !bg-white/20" />
                        <Skeleton className="h-5 w-32 !bg-white/20" />
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-6 space-y-6">
                        <div>
                            <Skeleton className="h-4 w-16 mb-2" />
                            <Skeleton className="h-6 w-48" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-16 mb-2" />
                            <Skeleton className="h-6 w-64" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-16 mb-2" />
                            <Skeleton className="h-6 w-40" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>

                    {/* QR Code Skeleton */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
                        <Skeleton className="h-6 w-40 mx-auto mb-4" />
                        <Skeleton className="h-64 w-64 mx-auto mb-4" />
                        <Skeleton className="h-4 w-56 mx-auto" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
                    <Skeleton className="h-8 w-48 mb-2 !bg-white/20" />
                    <Skeleton className="h-4 w-64 !bg-white/20" />
                </div>
                <div className="px-8 py-8 space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i}>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ))}
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-14 w-full" />
                </div>
            </div>
        </div>
    );
}
