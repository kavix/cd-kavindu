'use client';

import { useState } from 'react';

// Use Next.js API routes to avoid CORS issues

type SendResponse = {
  message: string;
  id?: string;
  data?: unknown;
};

export default function SensorDataForm() {
  const [formData, setFormData] = useState({
    volt: '',
    amps: '',
    watt: '',
    temperature: '',
    humidity: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload = {
        volt: parseFloat(formData.volt),
        amps: parseFloat(formData.amps),
        watt: parseFloat(formData.watt),
        temperature: parseFloat(formData.temperature),
        humidity: parseFloat(formData.humidity),
      };

      // Validate all fields are numbers
      if (Object.values(payload).some((val) => isNaN(val))) {
        throw new Error('All fields must be valid numbers');
      }

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send sensor data');
      }

      const data: SendResponse = await res.json();
      setSuccess(data.message || 'Data sent successfully!');
      setFormData({ volt: '', amps: '', watt: '', temperature: '', humidity: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Manual Input</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">Send Sensor Data</h3>
        <p className="mt-1 text-sm text-slate-600">
          Manually submit sensor readings to the database (useful for testing or manual entry)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Voltage (V)
            <input
              type="number"
              name="volt"
              value={formData.volt}
              onChange={handleChange}
              step="0.1"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="230.5"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Current (A)
            <input
              type="number"
              name="amps"
              value={formData.amps}
              onChange={handleChange}
              step="0.01"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="1.2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Power (W)
            <input
              type="number"
              name="watt"
              value={formData.watt}
              onChange={handleChange}
              step="0.1"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="276.6"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Temperature (°C)
            <input
              type="number"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              step="0.1"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="28.5"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Humidity (%)
            <input
              type="number"
              name="humidity"
              value={formData.humidity}
              onChange={handleChange}
              step="0.1"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="60.0"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              'Send Data'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

