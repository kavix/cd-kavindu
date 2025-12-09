'use client';

import useSWR from 'swr';

// Use Next.js API routes to avoid CORS issues
type HealthResponse = {
  status: string;
  time: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Health check failed');
  }
  return res.json();
};

export default function HealthCheck() {
  const { data, error, isLoading } = useSWR<HealthResponse>(
    '/api/health',
    fetcher,
    {
      refreshInterval: 30000, // Check every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const isHealthy = !error && data?.status === 'ok';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            isLoading
              ? 'bg-amber-400 animate-pulse'
              : isHealthy
                ? 'bg-emerald-500'
                : 'bg-rose-500'
          }`}
        />
        <span className="text-sm font-medium text-slate-700">
          {isLoading
            ? 'Checking...'
            : isHealthy
              ? 'API Online'
              : 'API Offline'}
        </span>
      </div>
      {data?.time && (
        <span className="text-xs text-slate-500">
          {new Date(data.time).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

