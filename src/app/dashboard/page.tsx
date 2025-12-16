'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import HealthCheck from '@/components/HealthCheck';
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

// Room configuration - consistent across the app
const ROOMS = [
    { id: 1, name: 'Living Room', icon: '🛋️', color: '#22c55e', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
    { id: 2, name: 'Bedroom', icon: '🛏️', color: '#0ea5e9', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' },
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
    const { isLoaded, userId } = useAuth();
    const router = useRouter();

    // Fetch live sensor data (last 50 readings)
    const { data: sensorData, error: sensorError } = useSWR<SensorData[]>(
        '/api/sensors',
        fetcher,
        { refreshInterval: 5000 }
    );

    // Fetch historical data for trends
    const { data: historyData, error: historyError } = useSWR<SensorData[]>(
        `/api/history/mongo?start=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&end=${new Date().toISOString()}&limit=2000`,
        fetcher,
        { refreshInterval: 30000 }
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
            { label: '🛋️ Living Room', data: analytics.powerTrend.map(d => d.power1), borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4, fill: false, borderWidth: 2 },
            { label: '🛏️ Bedroom', data: analytics.powerTrend.map(d => d.power2), borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', tension: 0.4, fill: false, borderWidth: 2 },
            { label: '🍳 Kitchen', data: analytics.powerTrend.map(d => d.power3), borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.4, fill: false, borderWidth: 2 },
        ],
    }), [analytics.powerTrend]);

    const hourlyUsageData = useMemo(() => ({
        labels: analytics.hourlyUsage.map(d => d.hour),
        datasets: [{
            label: 'Avg Power (kW)',
            data: analytics.hourlyUsage.map(d => d.usage),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 6,
        }],
    }), [analytics.hourlyUsage]);

    const roomDistributionData = useMemo(() => ({
        labels: ROOMS.map(r => r.name),
        datasets: [{
            data: analytics.roomDistribution,
            backgroundColor: ROOMS.map(r => r.color),
            borderWidth: 0,
        }],
    }), [analytics.roomDistribution]);

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
                            <h1 className="text-xl font-bold text-slate-900">Energy Monitor</h1>
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
                        <p className="text-slate-600 mt-1">Real-time monitoring of your home's energy consumption</p>
                    </div>

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

                    {/* Bill Payment Portal */}
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 shadow-sm text-white">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                        <p>🏠 Home Energy Monitoring System • Data updates every 5 seconds</p>
                    </div>
                </div>
            </main>
        </div>
    );
}