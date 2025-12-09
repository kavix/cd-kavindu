'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import HealthCheck from '@/components/HealthCheck';

type HistoryEntry = {
  volt: number;
  amps: number;
  watt: number;
  temperature?: number;
  humidity?: number;
  time: string;
};

// Use Next.js API routes to avoid CORS issues

export default function HistoryPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return yesterday.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All hooks must be called before any conditional returns
  const rows = useMemo(
    () =>
      entries.map((item) => ({
        time: new Date(item.time).toLocaleString(),
        volt: item.volt,
        amps: item.amps,
        watt: item.watt,
      })),
    [entries],
  );

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/login');
    }
  }, [isLoaded, userId, router]);

  const handleFetch = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!startDate || !endDate) {
        throw new Error('Please choose both start and end dates.');
      }

      // Use Next.js API route to avoid CORS issues
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('start', startDate);
      url.searchParams.set('end', endDate);
      url.searchParams.set('limit', '100');

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Could not fetch history.');
      }
      const json = await res.json();
      setEntries(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Always render the same structure to maintain consistent hook order
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-semibold text-slate-900">Energy Monitor</h1>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className="text-sm font-medium text-slate-900 transition hover:text-slate-900"
              >
                History
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <HealthCheck />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      {!isLoaded || !userId ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-600">Loading...</div>
        </div>
      ) : (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">History</p>
          <h1 className="text-3xl font-semibold text-slate-900">Sensor logs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Query historical readings to analyze past performance and anomalies.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Loading...' : 'Filter'}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="sm:col-span-2 flex items-end">
            <p className="text-sm text-slate-500">
              Results limited to the most recent 100 entries within the selected range.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Results</h2>
          {loading ? <span className="text-sm text-slate-500">Loading...</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Voltage (V)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current (A)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Power (W)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">
                    {loading ? 'Fetching history...' : 'No records yet. Run a filter to see data.'}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={`${row.time}-${idx}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.time}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.volt}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.amps}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.watt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

