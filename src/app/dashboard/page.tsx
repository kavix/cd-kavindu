'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import EnergyDashboard from '@/components/EnergyDashboard';
import HealthCheck from '@/components/HealthCheck';
import useSWR from 'swr';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

type HistoryEntry = {
    volt: number;
    amps: number;
    watt: number;
    temperature: number;
    humidity: number;
    time: string;
};

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
    Title,
    Tooltip,
    Legend,
);

export default function Dashboard() {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();

    // Fetch historical data for graphs with specific date range
    const { data: historyData, error: historyError } = useSWR<HistoryEntry[]>(
        `/api/history/mongo?start=2025-12-02&end=2025-12-10&limit=10000`,
        fetcher,
        { refreshInterval: 60000 } // Refresh every minute
    );

    // Process historical data for graphs - MUST be before conditional returns
    const processedData = useMemo(() => {
        if (!historyData || historyData.length === 0) {
            return {
                hourlyUsage: [],
                dailyUsage: [],
                currentUsage: 2.5,
                dailyTotal: 0,
                monthlyTotal: 0,
                voltData: [],
                ampsData: [],
                tempData: [],
                humidityData: [],
            };
        }

        // Group by hour for 24-hour usage
        const hourlyMap = new Map<string, { total: number; count: number }>();
        const dailyMap = new Map<string, { total: number; count: number }>();

        // Time series data for other metrics
        const voltData: { time: string; value: number }[] = [];
        const ampsData: { time: string; value: number }[] = [];
        const tempData: { time: string; value: number }[] = [];
        const humidityData: { time: string; value: number }[] = [];

        historyData.forEach(entry => {
            const date = new Date(entry.time);
            const hourKey = date.getHours().toString().padStart(2, '0') + ':00';
            const dayKey = date.toISOString().slice(0, 10);

            // Hourly aggregation for watt
            const hourData = hourlyMap.get(hourKey) || { total: 0, count: 0 };
            hourData.total += entry.watt / 1000; // Convert to kW
            hourData.count += 1;
            hourlyMap.set(hourKey, hourData);

            // Daily aggregation
            const dayData = dailyMap.get(dayKey) || { total: 0, count: 0 };
            dayData.total += (entry.watt / 1000); // kW
            dayData.count += 1;
            dailyMap.set(dayKey, dayData);

            // Time series for other metrics (sample every 10th point to reduce data points)
            if (voltData.length === 0 || voltData.length % 10 === 0) {
                voltData.push({ time: entry.time, value: entry.volt });
                ampsData.push({ time: entry.time, value: entry.amps });
                tempData.push({ time: entry.time, value: entry.temperature });
                humidityData.push({ time: entry.time, value: entry.humidity });
            }
        });

        // Create hourly usage array
        const hourlyUsage = Array.from({ length: 24 }, (_, i) => {
            const hour = i.toString().padStart(2, '0') + ':00';
            const data = hourlyMap.get(hour);
            return {
                hour,
                usage: data ? data.total / data.count : 0,
            };
        });

        // Create daily usage array (last 7 days)
        const dailyUsage = Array.from(dailyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7)
            .map(([date, data]) => ({
                date,
                day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                usage: (data.total / data.count) * (data.count / 60), // Estimate kWh
            }));

        const latestEntry = historyData[historyData.length - 1];
        const currentUsage = latestEntry ? latestEntry.watt / 1000 : 0;

        // Calculate daily total (kWh) - assuming readings every minute
        const today = new Date().toISOString().slice(0, 10);
        const todayData = dailyMap.get(today);
        const dailyTotal = todayData ? (todayData.total / todayData.count) * (todayData.count / 60) : 0;

        // Estimate monthly total
        const monthlyTotal = dailyTotal * 30;

        return {
            hourlyUsage,
            dailyUsage,
            currentUsage,
            dailyTotal,
            monthlyTotal,
            voltData,
            ampsData,
            tempData,
            humidityData,
        };
    }, [historyData]);

    const energyData = useMemo(() => ({
        currentUsage: processedData.currentUsage,
        dailyUsage: processedData.dailyTotal,
        monthlyUsage: processedData.monthlyTotal,
        estimatedBill: processedData.monthlyTotal * 13.06, // Rs. per kWh (average rate)
        peakHourUsage: 1.8,
        offPeakUsage: 0.7,
        carbonFootprint: processedData.monthlyTotal * 0.741, // kg CO2 per kWh
        appliances: [
            { name: 'Refrigerator', usage: 0.8, status: 'active', hours: 24 },
            { name: 'Air Conditioner', usage: 1.2, status: 'active', hours: 8 },
            { name: 'Lights', usage: 0.3, status: 'active', hours: 6 },
            { name: 'TV', usage: 0.2, status: 'active', hours: 4 },
            { name: 'Washing Machine', usage: 0.4, status: 'idle', hours: 2 },
            { name: 'Water Heater', usage: 2.1, status: 'idle', hours: 1 },
        ],
        weeklyUsageTrend: processedData.dailyUsage,
        monthlyTrend: [
            { month: 'Jan', usage: 1150 },
            { month: 'Feb', usage: 1100 },
            { month: 'Mar', usage: 1220 },
            { month: 'Apr', usage: 1180 },
            { month: 'May', usage: 1250 },
            { month: 'Jun', usage: processedData.monthlyTotal },
        ],
        forecast: [
            { period: 'Week 1', predicted: 310, confidence: 95 },
            { period: 'Week 2', predicted: 325, confidence: 92 },
            { period: 'Week 3', predicted: 318, confidence: 88 },
            { period: 'Week 4', predicted: 330, confidence: 85 },
        ],
        hourlyUsage: processedData.hourlyUsage,
    }), [processedData]);

    const weeklyUsageChartData = useMemo(() => ({
        labels: energyData.weeklyUsageTrend.map((entry) => entry.day || 'N/A'),
        datasets: [
            {
                label: 'Consumption (kWh)',
                data: energyData.weeklyUsageTrend.map((entry) => entry.usage || 0),
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
            },
        ],
    }), [energyData.weeklyUsageTrend]);

    const applianceUsageChartData = useMemo(() => ({
        labels: energyData.appliances.map((appliance) => appliance.name),
        datasets: [
            {
                label: 'Usage (kW)',
                data: energyData.appliances.map((appliance) => appliance.usage),
                backgroundColor: '#007AFF',
                borderRadius: 8,
            },
        ],
    }), [energyData.appliances]);

    const weeklyUsageChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 12,
                    },
                    color: '#1d1d1f',
                    usePointStyle: true,
                    padding: 15,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
        },
    }), []);

    const applianceUsageChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
        },
    }), []);

    const monthlyTrendChartData = useMemo(() => ({
        labels: energyData.monthlyTrend.map((entry) => entry.month),
        datasets: [
            {
                label: 'Monthly Usage (kWh)',
                data: energyData.monthlyTrend.map((entry) => entry.usage),
                borderColor: '#34C759',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
            },
        ],
    }), [energyData.monthlyTrend]);

    const forecastChartData = useMemo(() => ({
        labels: energyData.forecast.map((entry) => entry.period),
        datasets: [
            {
                label: 'Predicted Usage (kWh)',
                data: energyData.forecast.map((entry) => entry.predicted),
                borderColor: '#FF9500',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                borderDash: [5, 5],
                tension: 0.4,
                fill: true,
                borderWidth: 2,
            },
        ],
    }), [energyData.forecast]);

    const hourlyUsageChartData = useMemo(() => ({
        labels: energyData.hourlyUsage.map((entry) => entry.hour),
        datasets: [
            {
                label: 'Usage (kW)',
                data: energyData.hourlyUsage.map((entry) => entry.usage),
                backgroundColor: '#5856D6',
                borderRadius: 8,
            },
        ],
    }), [energyData.hourlyUsage]);

    const voltChartData = useMemo(() => ({
        labels: processedData.voltData.map((entry) => new Date(entry.time).toLocaleTimeString()),
        datasets: [
            {
                label: 'Voltage (V)',
                data: processedData.voltData.map((entry) => entry.value),
                borderColor: '#FF3B30',
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 2,
            },
        ],
    }), [processedData.voltData]);

    const ampsChartData = useMemo(() => ({
        labels: processedData.ampsData.map((entry) => new Date(entry.time).toLocaleTimeString()),
        datasets: [
            {
                label: 'Current (A)',
                data: processedData.ampsData.map((entry) => entry.value),
                borderColor: '#FF9500',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 2,
            },
        ],
    }), [processedData.ampsData]);

    const tempChartData = useMemo(() => ({
        labels: processedData.tempData.map((entry) => new Date(entry.time).toLocaleTimeString()),
        datasets: [
            {
                label: 'Temperature (°C)',
                data: processedData.tempData.map((entry) => entry.value),
                borderColor: '#34C759',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 2,
            },
        ],
    }), [processedData.tempData]);

    const humidityChartData = useMemo(() => ({
        labels: processedData.humidityData.map((entry) => new Date(entry.time).toLocaleTimeString()),
        datasets: [
            {
                label: 'Humidity (%)',
                data: processedData.humidityData.map((entry) => entry.value),
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 2,
            },
        ],
    }), [processedData.humidityData]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 12,
                    },
                    color: '#1d1d1f',
                    usePointStyle: true,
                    padding: 15,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        size: 11,
                    },
                    color: '#86868b',
                },
            },
        },
    }), []);

    useEffect(() => {
        if (isLoaded && !userId) {
            router.push('/login');
        }
    }, [isLoaded, userId, router]);

    if (!isLoaded || !userId) {
        return <div>Loading...</div>;
    }

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
                                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
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
            <main className="mx-auto max-w-7xl py-8 px-6">
                <div className="space-y-8">
                    <EnergyDashboard />

                    {/* Bill Payment Portal Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Pay Your Electricity Bill</h3>
                                <p className="mt-1 text-sm text-slate-600">Quick access to CEB and LECO payment portals</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href="https://payment.ceb.lk/instantpay"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Pay CEB Bill
                                </a>
                                <a
                                    href="https://ipg.leco.lk/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-600"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Pay LECO Bill
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced KPI Cards */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="rounded-full bg-blue-50 p-3">
                                        <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-600">Current Usage</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">{energyData.currentUsage.toFixed(3)} kW</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="rounded-full bg-green-50 p-3">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-600">Daily Usage</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">{energyData.dailyUsage.toFixed(3)} kWh</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="rounded-full bg-amber-50 p-3">
                                        <svg className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-600">Estimated Bill</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">Rs. {energyData.estimatedBill.toFixed(3)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="rounded-full bg-teal-50 p-3">
                                        <svg className="h-6 w-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-600">Carbon Footprint</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">{energyData.carbonFootprint.toFixed(3)} kg</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Usage & Forecast Section */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">24-Hour Usage Pattern</h3>
                            <p className="mb-5 text-sm text-slate-600">Track your energy consumption throughout the day.</p>
                            <div className="h-72">
                                <Bar data={hourlyUsageChartData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">4-Week Usage Forecast</h3>
                            <p className="mb-5 text-sm text-slate-600">AI-powered prediction of upcoming energy consumption.</p>
                            <div className="h-72">
                                <Line data={forecastChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Monthly Trend */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                        <h3 className="text-lg font-semibold text-slate-900">6-Month Usage Trend</h3>
                        <p className="mb-5 text-sm text-slate-600">Long-term energy consumption patterns and trends.</p>
                        <div className="h-80">
                            <Line data={monthlyTrendChartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Weekly & Appliance Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Weekly Consumption Trend</h3>
                            <p className="mb-5 text-sm text-slate-600">Track how your energy usage changes day by day.</p>
                            <div className="h-72">
                                <Line data={weeklyUsageChartData} options={weeklyUsageChartOptions} />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Appliance Breakdown</h3>
                            <p className="mb-5 text-sm text-slate-600">Identify high-consuming appliances in your home.</p>
                            <div className="h-72">
                                <Bar data={applianceUsageChartData} options={applianceUsageChartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Additional Metrics Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Voltage Trend</h3>
                            <p className="mb-5 text-sm text-slate-600">Monitor voltage fluctuations over time.</p>
                            <div className="h-72">
                                <Line data={voltChartData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Current Trend</h3>
                            <p className="mb-5 text-sm text-slate-600">Track current consumption patterns.</p>
                            <div className="h-72">
                                <Line data={ampsChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Temperature Trend</h3>
                            <p className="mb-5 text-sm text-slate-600">Environmental temperature monitoring.</p>
                            <div className="h-72">
                                <Line data={tempChartData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <h3 className="text-lg font-semibold text-slate-900">Humidity Trend</h3>
                            <p className="mb-5 text-sm text-slate-600">Humidity levels over time.</p>
                            <div className="h-72">
                                <Line data={humidityChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="px-6 py-5">
                            <h3 className="text-lg font-semibold text-slate-900">Appliance Usage Details</h3>
                            <p className="mt-1 text-sm text-slate-600">Current energy consumption by appliance.</p>
                        </div>
                        <ul className="divide-y divide-slate-200">
                            {energyData.appliances.map((appliance, index) => (
                                <li key={index} className="px-6 py-4 transition hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${appliance.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{appliance.name}</div>
                                                <div className="text-xs text-slate-600">{appliance.hours}h/day · {appliance.status}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-blue-600">{appliance.usage} kW</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main >
        </div >
    );
}