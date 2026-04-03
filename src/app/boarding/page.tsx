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

// Room configuration - consistent across the app
const BOARDINGS = [
    { id: 1, name: 'Boarding 01', icon: '🔌', color: '#B4D3D9', bgColor: 'bg-custom-blue/30', borderColor: 'border-custom-blue', textColor: 'text-custom-purple-dark' },
    { id: 2, name: 'Boarding 02', icon: '🔌', color: '#BDA6CE', bgColor: 'bg-custom-purple-light/30', borderColor: 'border-custom-purple-light', textColor: 'text-custom-purple-dark' },
    { id: 3, name: 'Boarding 03', icon: '🔌', color: '#9B8EC7', bgColor: 'bg-custom-purple-dark/30', borderColor: 'border-custom-purple-dark', textColor: 'text-custom-purple-dark' },
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
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
        <div className="min-h-screen bg-custom-bg text-gray-800">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-custom-purple-dark">Boarding Vessel Analytics</h1>
                <div className="flex items-center gap-4">
                    <Link href="/selection" className="text-sm text-gray-600 hover:text-black">Back to Selection</Link>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <main className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h3 className="text-sm font-medium text-gray-500">Total Power</h3>
                        <p className="mt-1 text-3xl font-semibold">{formatNumber(latestData?.total_power)} W</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h3 className="text-sm font-medium text-gray-500">Total Energy (24h)</h3>
                        <p className="mt-1 text-3xl font-semibold">{formatNumber(totalEnergyKwh)} kWh</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h3 className="text-sm font-medium text-gray-500">Estimated Cost (24h)</h3>
                        <p className="mt-1 text-3xl font-semibold">${formatNumber(estimatedCost)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h3 className="text-sm font-medium text-gray-500">Cost per kWh ($)</h3>
                        <input
                            type="number"
                            value={costPerKwh}
                            onChange={(e) => setCostPerKwh(parseFloat(e.target.value))}
                            className="mt-1 text-3xl font-semibold bg-transparent w-full"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Power Consumption</h2>
                        <Line data={chartData} />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Power Distribution</h2>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Doughnut data={powerDistributionData} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Boarding-wise Power (W)</h2>
                        <Bar data={powerBarData} />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Current Distribution (A)</h2>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Doughnut data={currentDistributionData} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Boarding Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {BOARDINGS.map(boarding => (
                            <div key={boarding.id} className={`p-4 rounded-lg ${boarding.bgColor} border ${boarding.borderColor}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg">{boarding.icon}</span>
                                    <span className={`font-bold ${boarding.textColor}`}>{boarding.name}</span>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Voltage:</span>
                                        <span>{formatNumber(latestData?.volt)} V</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Current:</span>
                                        <span>{formatNumber(latestData?.[`current${boarding.id}`])} A</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Power:</span>
                                        <span>{formatNumber(latestData?.[`power${boarding.id}`])} W</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Temperature:</span>
                                        <span>{formatNumber(latestData?.temperature)} °C</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Humidity:</span>
                                        <span>{formatNumber(latestData?.humidity)} %</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Alerts</h2>
                        <SensorAlerts sensorData={latestData || null} />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 text-custom-purple-dark">Reporting</h2>
                        <ReportGenerator sensorData={sensorData || []} />
                    </div>
                </div>
            </main>
        </div>
    );
}
