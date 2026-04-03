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

// Room configuration - consistent across the app
const ROOMS = [
    { id: 1, name: 'Bedroom No.01', icon: '🛏️', color: '#22c55e', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
    { id: 2, name: 'Bedroom No 2', icon: '🛏️', color: '#0ea5e9', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' },
    { id: 3, name: 'Kitchen', icon: '🍳', color: '#f97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' },
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

const formatNumber = (value: number | undefined, decimals = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function Dashboard() {
    // Filters
    const [range, setRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
    const [roomsEnabled, setRoomsEnabled] = useState<Record<1 | 2 | 3, boolean>>({ 1: true, 2: true, 3: true });
    const { isLoaded, userId } = useAuth();
    const router = useRouter();

    // Fetch live sensor data (last 50 readings)
    const { data: sensorData, error: sensorError } = useSWR<SensorData[]>(
        '/api/sensors',
        fetcher,
        { refreshInterval: 5000 }
    );

    // Fetch historical data for trends (range-aware)
    const { data: historyData, error: historyError } = useSWR<SensorData[]>(
        `history:${range}`,
        async () => {
            const now = Date.now();
            const rangeMs = range === '1h' ? 1 * 60 * 60 * 1000
                : range === '6h' ? 6 * 60 * 60 * 1000
                    : range === '24h' ? 24 * 60 * 60 * 1000
                        : 7 * 24 * 60 * 60 * 1000;

            const params = new URLSearchParams({
                start: new Date(now - rangeMs).toISOString(),
                end: new Date(now).toISOString(),
                // FastAPI docs: max 1000
                limit: '1000',
            });

            return fetcher(`/api/history/mongo?${params.toString()}`);
        },
        { refreshInterval: 30000 }
    );

    // Fetch AI predictions
    const { data: predictionData, error: predictionError } = useSWR<PredictionData>(
        '/api/predict',
        fetcher,
        { refreshInterval: 10000 }
    );

    // Process data for analytics
    const analytics = useMemo(() => {
        const data = sensorData || [];
        const history = historyData || [];

        if (data.length === 0) {
            return {
                latest: null,
                rooms: ROOMS.map(room => ({ room, current: 0, power: 0, avgPower: 0, maxPower: 0, contribution: 0 })),
                totalPower: 0,
                avgTotalPower: 0,
                maxTotalPower: 0,
                voltage: 0,
                temperature: 0,
                humidity: 0,
                hourlyUsage: [],
                powerTrend: [],
                roomDistribution: [0, 0, 0],
            };
        }

        const latest = data[data.length - 1];
        const totalPower = latest.total_power || (latest.power1 + latest.power2 + latest.power3);

        // Room analytics
        const rooms = ROOMS.map(room => {
            const powerKey = `power${room.id}` as keyof SensorData;
            const currentKey = `current${room.id}` as keyof SensorData;
            const powers = data.map(d => d[powerKey] as number);
            const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
            const maxPower = Math.max(...powers);

            return {
                room,
                current: latest[currentKey] as number,
                power: latest[powerKey] as number,
                avgPower,
                maxPower,
                contribution: totalPower > 0 ? ((latest[powerKey] as number) / totalPower) * 100 : 0,
            };
        });

        // Overall stats
        const totalPowers = data.map(d => d.total_power || 0);
        const avgTotalPower = totalPowers.reduce((a, b) => a + b, 0) / totalPowers.length;
        const maxTotalPower = Math.max(...totalPowers);

        // Hourly usage from history
        const hourlyMap = new Map<string, number[]>();
        history.forEach(entry => {
            const hour = new Date(entry.time).getHours().toString().padStart(2, '0') + ':00';
            const existing = hourlyMap.get(hour) || [];
            existing.push(entry.total_power || entry.watt || 0);
            hourlyMap.set(hour, existing);
        });

        const hourlyUsage = Array.from({ length: 24 }, (_, i) => {
            const hour = i.toString().padStart(2, '0') + ':00';
            const values = hourlyMap.get(hour) || [0];
            return { hour, usage: values.reduce((a, b) => a + b, 0) / values.length / 1000 }; // Convert to kW
        });

        // Power trend (last 50 points)
        const powerTrend = data.map(d => ({
            time: new Date(d.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            power: d.total_power / 1000,
            power1: d.power1 / 1000,
            power2: d.power2 / 1000,
            power3: d.power3 / 1000,
        }));

        // Room distribution
        const roomDistribution = [latest.power1, latest.power2, latest.power3];

        return {
            latest,
            rooms,
            totalPower,
            avgTotalPower,
            maxTotalPower,
            voltage: latest.volt,
            temperature: latest.temperature,
            humidity: latest.humidity,
            hourlyUsage,
            powerTrend,
            roomDistribution,
        };
    }, [sensorData, historyData]);

    // Chart configurations
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    font: { family: 'system-ui', size: 12 },
                    color: '#475569',
                    usePointStyle: true,
                    padding: 15,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { family: 'system-ui', size: 11 }, color: '#64748b' },
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: 'system-ui', size: 11 }, color: '#64748b' },
            },
        },
    }), []);

    const powerTrendData = useMemo(() => ({
        labels: analytics.powerTrend.map(d => d.time),
        datasets: [
            { label: '🛏️ Bedroom No.01', data: analytics.powerTrend.map(d => d.power1), borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4, fill: false, borderWidth: 2, hidden: !roomsEnabled[1] },
            { label: '🛏️ Bedroom No 2', data: analytics.powerTrend.map(d => d.power2), borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', tension: 0.4, fill: false, borderWidth: 2, hidden: !roomsEnabled[2] },
            { label: '🍳 Kitchen', data: analytics.powerTrend.map(d => d.power3), borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.4, fill: false, borderWidth: 2, hidden: !roomsEnabled[3] },
        ],
    }), [analytics.powerTrend, roomsEnabled]);

    const hourlyUsageData = useMemo(() => ({
        labels: analytics.hourlyUsage.map(d => d.hour),
        datasets: [{
            label: 'Avg Power (kW)',
            data: analytics.hourlyUsage.map(d => d.usage),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 6,
        }],
    }), [analytics.hourlyUsage]);

    const roomDistributionData = useMemo(() => {
        const activeRooms = ROOMS.filter(r => roomsEnabled[r.id as 1 | 2 | 3]);
        const activeData = activeRooms.map(r => analytics.roomDistribution[r.id - 1] || 0);
        return {
            labels: activeRooms.map(r => r.name),
            datasets: [{
                data: activeData,
                backgroundColor: activeRooms.map(r => r.color),
                borderWidth: 0,
            }],
        };
    }, [analytics.roomDistribution, roomsEnabled]);

    const doughnutOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const, labels: { padding: 20, usePointStyle: true } },
        },
        cutout: '65%',
    }), []);

    useEffect(() => {
        if (isLoaded && !userId) {
            router.push('/login');
        }
    }, [isLoaded, userId, router]);

    if (!isLoaded || !userId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-600">Loading...</div>
            </div>
        );
    }

    // Calculate energy estimates
    const dailyEnergykWh = (analytics.avgTotalPower / 1000) * 24;
    const monthlyEnergykWh = dailyEnergykWh * 30;
    const estimatedBill = monthlyEnergykWh * 13.06; // Sri Lanka avg rate
    const carbonFootprint = monthlyEnergykWh * 0.4062;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">⚡</span>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">Elektrum</h1>
                        </div>
                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg">
                                Dashboard
                            </Link>
                            <Link href="/live" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition">
                                Live Monitor
                            </Link>
                            <Link href="/history" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition">
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

            <main className="mx-auto max-w-7xl py-6 px-6">
                <div className="space-y-6">
                    {/* Page Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Home Energy Dashboard</h2>
                        <p className="text-slate-600 mt-1">Real-time monitoring of your home&apos;s energy consumption</p>
                    </div>

                    {/* Sensor Alerts */}
                    {analytics.latest && (
                        <SensorAlerts sensorData={analytics.latest} enableBrowserNotifications={true} />
                    )}

                    {/* Error States */}
                    {(sensorError || historyError) && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            ⚠️ Having trouble connecting to sensors. Data may be outdated.
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-50">
                                    <span className="text-xl">⚡</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Power</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatNumber(analytics.totalPower, 0)}</p>
                                    <p className="text-xs text-slate-500">Watts</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-50">
                                    <span className="text-xl">🔌</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Voltage</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatNumber(analytics.voltage, 1)}</p>
                                    <p className="text-xs text-slate-500">Volts</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-red-50">
                                    <span className="text-xl">🌡️</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Temperature</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatNumber(analytics.temperature, 1)}</p>
                                    <p className="text-xs text-slate-500">°C</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-cyan-50">
                                    <span className="text-xl">💧</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Humidity</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatNumber(analytics.humidity, 1)}</p>
                                    <p className="text-xs text-slate-500">%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Predictions Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-50">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">Predictive Analytics</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Model: {predictionData?.model || 'Ridge Regression (Time Series)'}</p>
                                    </div>
                                </div>
                                {predictionError ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        Unavailable
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                        {predictionError ? (
                            <div className="px-6 py-8 text-center">
                                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-slate-600">Unable to retrieve prediction data</p>
                                <p className="text-xs text-slate-500 mt-1">Please verify the connection to the prediction service</p>
                            </div>
                        ) : predictionData ? (
                            <div className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-amber-100">
                                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Power Forecast</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{formatNumber(predictionData.predictions.watt, 2)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{predictionData.units.watt}</p>
                                            </div>
                                            {analytics.latest && (
                                                <div className="pt-3 border-t border-slate-200">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">Current Value</span>
                                                        <span className="font-medium text-slate-700">{formatNumber(analytics.latest.watt, 2)} W</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${predictionData.predictions.watt > analytics.latest.watt ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            {predictionData.predictions.watt > analytics.latest.watt ? (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            {Math.abs(((predictionData.predictions.watt - analytics.latest.watt) / analytics.latest.watt) * 100).toFixed(1)}%
                                                        </span>
                                                        <span className="text-xs text-slate-600">
                                                            {predictionData.predictions.watt > analytics.latest.watt ? 'expected increase' : 'expected decrease'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-orange-100">
                                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Temperature Forecast</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{formatNumber(predictionData.predictions.temperature, 2)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{predictionData.units.temperature}</p>
                                            </div>
                                            {analytics.latest && (
                                                <div className="pt-3 border-t border-slate-200">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">Current Value</span>
                                                        <span className="font-medium text-slate-700">{formatNumber(analytics.latest.temperature, 2)} °C</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${predictionData.predictions.temperature > analytics.latest.temperature ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                                            {predictionData.predictions.temperature > analytics.latest.temperature ? (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            {Math.abs(predictionData.predictions.temperature - analytics.latest.temperature).toFixed(1)}°C
                                                        </span>
                                                        <span className="text-xs text-slate-600">
                                                            {predictionData.predictions.temperature > analytics.latest.temperature ? 'warmer expected' : 'cooler expected'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-cyan-100">
                                                    <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Humidity Forecast</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{formatNumber(predictionData.predictions.humidity, 2)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{predictionData.units.humidity}</p>
                                            </div>
                                            {analytics.latest && (
                                                <div className="pt-3 border-t border-slate-200">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">Current Value</span>
                                                        <span className="font-medium text-slate-700">{formatNumber(analytics.latest.humidity, 2)} %</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${predictionData.predictions.humidity > analytics.latest.humidity ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                                                            {predictionData.predictions.humidity > analytics.latest.humidity ? (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            {Math.abs(predictionData.predictions.humidity - analytics.latest.humidity).toFixed(1)}%
                                                        </span>
                                                        <span className="text-xs text-slate-600">
                                                            {predictionData.predictions.humidity > analytics.latest.humidity ? 'increase expected' : 'decrease expected'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-slate-300 border-t-indigo-600"></div>
                                <p className="text-sm text-slate-600 mt-3 font-medium">Loading prediction data...</p>
                            </div>
                        )}
                    </div>

                    {/* Room Cards */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">🏠 Room-wise Consumption</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {analytics.rooms.map(({ room, current, power, avgPower, maxPower, contribution }) => (
                                <div key={room.id} className={`rounded-2xl border ${room.borderColor} ${room.bgColor} p-5 shadow-sm transition hover:shadow-md`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{room.icon}</span>
                                            <h4 className={`font-semibold ${room.textColor}`}>{room.name}</h4>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${room.bgColor} ${room.textColor}`}>
                                            {formatNumber(contribution, 1)}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500">Current</p>
                                            <p className={`text-xl font-bold ${room.textColor}`}>{formatNumber(current)} A</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Power</p>
                                            <p className={`text-xl font-bold ${room.textColor}`}>{formatNumber(power, 0)} W</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Average</p>
                                            <p className="text-sm font-medium text-slate-700">{formatNumber(avgPower, 0)} W</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Peak</p>
                                            <p className="text-sm font-medium text-slate-700">{formatNumber(maxPower, 0)} W</p>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="bg-white/50 rounded-full h-2 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${contribution}%`, backgroundColor: room.color }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Report Generator & Bill Payment */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Report Generator */}
                        <ReportGenerator sensorData={sensorData || []} />

                        {/* Bill Payment Portal */}
                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 shadow-sm text-white">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold">💳 Pay Your Electricity Bill</h3>
                                    <p className="mt-1 text-sm text-blue-100">Quick access to CEB and LECO payment portals</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <a href="https://payment.ceb.lk/instantpay" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50">
                                        Pay CEB Bill →
                                    </a>
                                    <a href="https://ipg.leco.lk/" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/30 border border-white/30">
                                        Pay LECO Bill →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Energy Estimates */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Est. Daily Usage</p>
                            <p className="text-2xl font-bold text-slate-900 mt-2">{formatNumber(dailyEnergykWh, 1)}</p>
                            <p className="text-xs text-slate-500">kWh/day</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Est. Monthly Usage</p>
                            <p className="text-2xl font-bold text-slate-900 mt-2">{formatNumber(monthlyEnergykWh, 0)}</p>
                            <p className="text-xs text-slate-500">kWh/month</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Est. Monthly Bill</p>
                            <p className="text-2xl font-bold text-amber-600 mt-2">Rs. {formatNumber(estimatedBill, 0)}</p>
                            <p className="text-xs text-slate-500">@ Rs.13.06/kWh</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Carbon Footprint</p>
                            <p className="text-2xl font-bold text-green-600 mt-2">{formatNumber(carbonFootprint, 1)}</p>
                            <p className="text-xs text-slate-500">kg CO₂/month</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">Range:</span>
                                {([
                                    { key: '1h', label: 'Last 1h' },
                                    { key: '6h', label: 'Last 6h' },
                                    { key: '24h', label: 'Last 24h' },
                                    { key: '7d', label: 'Last 7d' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setRange(opt.key)}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition ${range === opt.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700">Rooms:</span>
                                {ROOMS.map(r => (
                                    <label key={r.id} className="inline-flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                            checked={roomsEnabled[r.id as 1 | 2 | 3]}
                                            onChange={() => setRoomsEnabled(prev => ({ ...prev, [r.id]: !prev[r.id as 1 | 2 | 3] }))}
                                        />
                                        <span className="inline-flex items-center gap-1">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                                            {r.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">📊 Power Consumption by Room</h3>
                            <p className="text-sm text-slate-600 mb-4">Real-time power usage across rooms</p>
                            <div className="h-72">
                                <Line data={powerTrendData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">🥧 Power Distribution</h3>
                            <p className="text-sm text-slate-600 mb-4">Current share by room</p>
                            <div className="h-72">
                                <Doughnut data={roomDistributionData} options={doughnutOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">⏰ 24-Hour Usage Pattern</h3>
                            <p className="text-sm text-slate-600 mb-4">Average power consumption by hour</p>
                            <div className="h-72">
                                <Bar data={hourlyUsageData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">📈 System Status</h3>
                            <p className="text-sm text-slate-600 mb-4">Monitoring statistics</p>
                            <div className="grid grid-cols-2 gap-6 py-4">
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-3xl font-bold text-blue-600">{sensorData?.length || 0}</p>
                                    <p className="text-sm text-slate-600 mt-1">Live Data Points</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-3xl font-bold text-green-600">5s</p>
                                    <p className="text-sm text-slate-600 mt-1">Update Interval</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-3xl font-bold text-purple-600">{historyData?.length || 0}</p>
                                    <p className="text-sm text-slate-600 mt-1">24h History</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-3xl font-bold text-amber-600">3</p>
                                    <p className="text-sm text-slate-600 mt-1">Rooms Monitored</p>
                                </div>
                            </div>
                            <div className={`mt-4 rounded-xl p-3 text-sm ${sensorError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {sensorError ? '⚠️ Connection issue' : '✓ Connected to MongoDB'}
                            </div>
                        </div>
                    </div>

                    {/* Room Details Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">📋 Room Details</h3>
                            <p className="text-sm text-slate-600 mt-1">Current energy consumption by room</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Room</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current (A)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Power (W)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Power (W)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peak Power (W)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {analytics.rooms.map(({ room, current, power, avgPower, maxPower, contribution }) => (
                                        <tr key={room.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{room.icon}</span>
                                                    <span className="font-medium text-slate-900">{room.name}</span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 font-medium ${room.textColor}`}>{formatNumber(current)}</td>
                                            <td className={`px-6 py-4 font-medium ${room.textColor}`}>{formatNumber(power, 0)}</td>
                                            <td className="px-6 py-4 text-slate-700">{formatNumber(avgPower, 0)}</td>
                                            <td className="px-6 py-4 text-slate-700">{formatNumber(maxPower, 0)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-slate-200 rounded-full h-2">
                                                        <div className="h-2 rounded-full" style={{ width: `${contribution}%`, backgroundColor: room.color }} />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">{formatNumber(contribution, 1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center py-6 text-sm text-slate-500">
                        <p>⚡ Elektrum - Where Energy Meets Intelligence • Data updates every 5 seconds</p>
                    </div>
                </div>
            </main>
        </div>
    );
}