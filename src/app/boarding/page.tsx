'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HealthCheck from '@/components/HealthCheck';
import SensorAlerts from '@/components/SensorAlerts';
import ReportGenerator from '@/components/ReportGenerator';
import useSWR from 'swr';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

type SensorData = {
    _id: string;
    volt: number;
    current1: number;
    current2: number;
    current3: number;
    power1: number;
    power2: number;
    power3: number;
    total_power: number;
    watt: number;
    temperature: number;
    humidity: number;
    time: string;
    [key: string]: number | string | undefined; // Allow dynamic access without `any`
};

type PredictionData = {
    success: boolean;
    predictions: {
        watt: number;
        temperature: number;
        humidity: number;
    };
    units: {
        watt: string;
        temperature: string;
        humidity: string;
    };
    model: string;
};

// Room configuration
const BOARDINGS = [
    { id: 1, name: 'Boarding 01', icon: '🔌', color: '#f97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' },
    { id: 2, name: 'Boarding 02', icon: '🔌', color: '#f43f5e', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700' },
    { id: 3, name: 'Boarding 03', icon: '🔌', color: '#0ea5e9', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' },
];

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
};

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

const formatNumber = (value: number | string | undefined, decimals = 2) => {
    const numericValue = typeof value === 'string' ? Number(value) : value;
    if (typeof numericValue !== 'number' || Number.isNaN(numericValue)) return '—';
    return numericValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function BoardingDashboard() {
    // Filters
    const [range, setRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
    const [boardingsEnabled, setBoardingsEnabled] = useState<Record<1 | 2 | 3, boolean>>({ 1: true, 2: true, 3: true });
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const [costPerKwh, setCostPerKwh] = useState(0.12); // Default cost per kWh in USD

    // Fetch live sensor data (last 50 readings)
    const { data: sensorData, error: sensorError } = useSWR<SensorData[]>(
        '/api/sensors',
        fetcher,
        { refreshInterval: 5000 }
    );

    // ... (rest of the component is the same as Dashboard)
    // UI changes will be applied below in the JSX
    const latestData = sensorData?.[sensorData.length - 1];

    const { data: predictionData, error: predictionError } = useSWR<PredictionData>(
        '/api/predict',
        fetcher,
        { refreshInterval: 60000 } // Fetch predictions every minute
    );

    const chartData = useMemo(() => {
        if (!sensorData) return { labels: [], datasets: [] };

        const filteredData = sensorData.slice(-50);
        const labels = filteredData.map(d => new Date(d.time).toLocaleTimeString());

        return {
            labels,
            datasets: [
                {
                    label: 'Total Power (W)',
                    data: filteredData.map(d => d.total_power),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    }, [sensorData]);

    const powerDistributionData = useMemo(() => {
        if (!latestData) return { labels: [], datasets: [] };
        const labels = BOARDINGS.map(b => b.name);
        const data = BOARDINGS.map(b => Number(latestData[`power${b.id}`] ?? 0));
        const backgroundColors = BOARDINGS.map(b => b.color);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
            }]
        };
    }, [latestData]);

    const currentDistributionData = useMemo(() => {
        if (!latestData) return { labels: [], datasets: [] };
        const labels = BOARDINGS.map(b => b.name);
        const data = BOARDINGS.map(b => Number(latestData[`current${b.id}`] ?? 0));
        const backgroundColors = BOARDINGS.map(b => b.color);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
            }]
        };
    }, [latestData]);

    const powerBarData = useMemo(() => {
        if (!latestData) return { labels: [], datasets: [] };
        const labels = BOARDINGS.map(b => b.name);
        const data = BOARDINGS.map(b => Number(latestData[`power${b.id}`] ?? 0));
        const backgroundColors = BOARDINGS.map(b => b.color);

        return {
            labels,
            datasets: [{
                label: 'Power (W)',
                data,
                backgroundColor: backgroundColors,
            }]
        };
    }, [latestData]);

    const totalEnergyKwh = useMemo(() => {
        if (!sensorData || sensorData.length < 2) return 0;

        const totalKwh = sensorData.slice(1).reduce((acc, current, index) => {
            const previous = sensorData[index];
            const timeDiffHours = (new Date(current.time).getTime() - new Date(previous.time).getTime()) / (1000 * 60 * 60);
            const avgPowerKw = (current.total_power + previous.total_power) / 2 / 1000;
            return acc + (avgPowerKw * timeDiffHours);
        }, 0);

        return totalKwh;
    }, [sensorData]);

    const estimatedCost = totalEnergyKwh * costPerKwh;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                        Elektrum Boarding
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <Link href="/selection" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                        Back to Selection
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <main className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500">Total Power</h3>
                        <p className="mt-1 text-3xl font-semibold text-slate-800">{formatNumber(latestData?.total_power)} W</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500">Total Energy (24h)</h3>
                        <p className="mt-1 text-3xl font-semibold text-slate-800">{formatNumber(totalEnergyKwh)} kWh</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500">Estimated Cost (24h)</h3>
                        <p className="mt-1 text-3xl font-semibold text-slate-800">Rs. {formatNumber(estimatedCost)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-500">Cost per kWh (Rs.)</h3>
                        <input
                            type="number"
                            value={costPerKwh}
                            onChange={(e) => setCostPerKwh(parseFloat(e.target.value))}
                            className="mt-1 text-3xl font-semibold text-slate-800 bg-transparent w-full focus:outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">Power Consumption</h2>
                        <Line data={chartData} />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">Power Distribution</h2>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Doughnut data={powerDistributionData} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">Boarding-wise Power (W)</h2>
                        <Bar data={powerBarData} />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">Current Distribution (A)</h2>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Doughnut data={currentDistributionData} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-slate-800">Boarding Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {BOARDINGS.map(boarding => (
                            <div key={boarding.id} className={`p-5 rounded-xl ${boarding.bgColor} border ${boarding.borderColor}`}>
                                <div className="flex items-center justify-between border-b pb-3 mb-3 border-black/5">
                                    <span className="text-xl">{boarding.icon}</span>
                                    <span className={`font-bold ${boarding.textColor}`}>{boarding.name}</span>
                                </div>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between font-medium">
                                        <span>Voltage:</span>
                                        <span>{formatNumber(latestData?.volt)} V</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Current:</span>
                                        <span>{formatNumber(latestData?.[`current${boarding.id}`])} A</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Power:</span>
                                        <span>{formatNumber(latestData?.[`power${boarding.id}`])} W</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Temperature:</span>
                                        <span>{formatNumber(latestData?.temperature)} °C</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Humidity:</span>
                                        <span>{formatNumber(latestData?.humidity)} %</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">Alerts</h2>
                        <SensorAlerts sensorData={latestData || null} />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <ReportGenerator sensorData={sensorData || []} />
                    </div>
                </div>
            </main>
        </div>
    );
}
