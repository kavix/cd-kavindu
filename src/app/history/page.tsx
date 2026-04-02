'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { subHours, subDays, startOfDay, format } from 'date-fns';
import HealthCheck from '@/components/HealthCheck';
import HistoryChart from '@/components/HistoryChart';
import ReportGenerator from '@/components/ReportGenerator';

type HistoryEntry = {
  volt: number;
  current1: number;
  current2: number;
  current3: number;
  power1: number;
  power2: number;
  power3: number;
  total_power: number;
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
    return format(yesterday, "yyyy-MM-dd'T'HH:mm");
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuick, setActiveQuick] = useState<'1h' | '6h' | '24h' | 'today' | '7d' | null>('24h');
  const [hasFetched, setHasFetched] = useState(false);

  // All hooks must be called before any conditional returns
  const rows = useMemo(
    () =>
      entries.map((item) => ({
        time: new Date(item.time).toLocaleString(),
        volt: item.volt,
        current1: item.current1,
        current2: item.current2,
        current3: item.current3,
        power1: item.power1,
        power2: item.power2,
        power3: item.power3,
        total_power: item.total_power,
        watt: item.watt,
        temperature: item.temperature,
        humidity: item.humidity,
      })),
    [entries],
  );

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/login');
    }
  }, [isLoaded, userId, router]);

  const handleFetch = async (startOverride?: string, endOverride?: string) => {
    setError(null);
    setLoading(true);
    try {
      const startToUse = startOverride ?? startDate;
      const endToUse = endOverride ?? endDate;

      if (!startToUse || !endToUse) {
        throw new Error('Please choose both start and end dates.');
      }

      // Use Next.js API route to avoid CORS issues
      const url = new URL('http://13.127.192.243:3000/history');
      url.searchParams.set('start', new Date(startToUse).toISOString());
      url.searchParams.set('end', new Date(endToUse).toISOString());
      url.searchParams.set('limit', '100');

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Could not fetch history.');
      }
      const json = await res.json();
      setEntries(Array.isArray(json) ? json : []);
      setHasFetched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const setRange = (type: '1h' | '6h' | '24h' | 'today' | '7d', apply: boolean = false) => {
    const now = new Date();
    let start = now;

    switch (type) {
      case '1h':
        start = subHours(now, 1);
        break;
      case '6h':
        start = subHours(now, 6);
        break;
      case '24h':
        start = subHours(now, 24);
        break;
      case 'today':
        start = startOfDay(now);
        break;
      case '7d':
        start = subDays(now, 7);
        break;
    }

    const formattedStart = format(start, "yyyy-MM-dd'T'HH:mm");
    const formattedEnd = format(now, "yyyy-MM-dd'T'HH:mm");

    setActiveQuick(type);
    setStartDate(formattedStart);
    setEndDate(formattedEnd);

    if (apply) {
      void handleFetch(formattedStart, formattedEnd);
    }
  };

  const rangeLabel = `${new Date(startDate).toLocaleString()} – ${new Date(endDate).toLocaleString()}`;

  useEffect(() => {
    // Initial fetch for a friendlier default (last 24 hours)
    setRange('24h', true);
  }, []);

  // Always render the same structure to maintain consistent hook order
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">Elektrum</h1>
            </div>
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
              onClick={() => handleFetch()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Loading...' : 'Filter'}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Quick Filters */}
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="text-sm font-medium text-slate-700 self-center mr-2">Quick ranges</span>
              {[
                { key: '1h', label: 'Last hour' },
                { key: '6h', label: 'Last 6 hours' },
                { key: '24h', label: 'Last 24 hours' },
                { key: 'today', label: 'Today' },
                { key: '7d', label: 'Last 7 days' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key as '1h' | '6h' | '24h' | 'today' | '7d', true)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition border ${activeQuick === item.key
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Start time
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setActiveQuick(null);
                    setStartDate(e.target.value);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                End time
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => {
                    setActiveQuick(null);
                    setEndDate(e.target.value);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="sm:col-span-2 flex items-center justify-between text-sm text-slate-600">
                <p>Results limited to the most recent 100 entries within the selected range.</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {hasFetched ? rangeLabel : 'No range selected yet'}
                </span>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          {/* History Chart */}
          {entries.length > 0 && (
            <div className="mt-8">
              <HistoryChart data={entries} />
            </div>
          )}

          {/* Report Generator */}
          <div className="mt-8">
            <ReportGenerator />
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Voltage (V)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🛋️ Living Room (A)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🛏️ Bedroom (A)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🍳 Kitchen (A)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🛋️ Living Room (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🛏️ Bedroom (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🍳 Kitchen (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">🌡️ Temp (°C)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">💧 Humidity (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-6 text-center text-sm text-slate-500">
                        {loading ? 'Fetching history...' : 'No records yet. Run a filter to see data.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={`${row.time}-${idx}`} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.time}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.volt}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-green-700">{row.current1}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-sky-700">{row.current2}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-orange-700">{row.current3}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-green-700">{row.power1}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-sky-700">{row.power2}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-orange-700">{row.power3}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-slate-900">{row.total_power}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.temperature}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-900">{row.humidity}</td>
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

