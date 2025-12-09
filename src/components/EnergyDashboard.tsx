'use client';

import useSWR from 'swr';

type CurrentResponse = {
  volt: number;
  amps: number;
  watt: number;
  temperature: number;
  humidity: number;
  time: string;
};

type PredictResponse = {
  success: boolean;
  predictions: {
    watt: number;
    temperature: number;
    humidity: number;
  };
  units: Record<string, string>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://3.108.238.200';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
};

const formatNumber = (value?: number, decimals = 1) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const StatCard = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-3 flex items-baseline gap-1 text-2xl font-semibold text-slate-900">
      {value}
      {unit ? <span className="text-sm font-medium text-slate-500">{unit}</span> : null}
    </p>
  </div>
);

export default function EnergyDashboard() {
  const {
    data: current,
    error: currentError,
    isLoading: currentLoading,
  } = useSWR<CurrentResponse>(`${API_BASE}/current`, fetcher, {
    refreshInterval: 2000,
  });

  const {
    data: prediction,
    error: predictionError,
    isLoading: predictionLoading,
  } = useSWR<PredictResponse>(`${API_BASE}/predict`, fetcher, {
    refreshInterval: 10000,
  });

  const currentStatus = currentError
    ? 'Could not load live data'
    : currentLoading
      ? 'Fetching live data...'
      : `Updated ${current?.time ? new Date(current.time).toLocaleTimeString() : 'recently'}`;

  const predictionStatus = predictionError
    ? 'Could not load prediction'
    : predictionLoading
      ? 'Fetching prediction...'
      : 'Latest AI forecast';

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Real-time</p>
            <h2 className="text-2xl font-semibold text-slate-900">Live sensor stream</h2>
          </div>
          <p className="text-sm text-slate-500">{currentStatus}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Voltage" value={formatNumber(current?.volt)} unit="V" />
          <StatCard label="Current" value={formatNumber(current?.amps)} unit="A" />
          <StatCard label="Power" value={formatNumber(current?.watt)} unit="W" />
          <StatCard label="Temperature" value={formatNumber(current?.temperature)} unit="°C" />
        </div>
        {currentError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            There was a problem loading live readings. Please check the device connection.
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Prediction</p>
            <h2 className="text-2xl font-semibold text-slate-900">Next cycle forecast</h2>
          </div>
          <p className="text-sm text-slate-500">{predictionStatus}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Predicted Power"
            value={formatNumber(prediction?.predictions?.watt)}
            unit="W"
          />
          <StatCard
            label="Predicted Temp"
            value={formatNumber(prediction?.predictions?.temperature)}
            unit="°C"
          />
        </div>
        {predictionError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Unable to fetch the AI prediction right now. We will retry automatically.
          </div>
        ) : null}
      </section>
    </div>
  );
}

