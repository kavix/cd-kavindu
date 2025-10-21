'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

    useEffect(() => {
        if (isLoaded && !userId) {
            router.push('/login');
        }
    }, [isLoaded, userId, router]);

    if (!isLoaded || !userId) {
        return <div>Loading...</div>;
    }

    const energyData = {
        currentUsage: 2.5,
        dailyUsage: 45.2,
        monthlyUsage: 1200.5,
        appliances: [
            { name: 'Refrigerator', usage: 0.8 },
            { name: 'Air Conditioner', usage: 1.2 },
            { name: 'Lights', usage: 0.3 },
            { name: 'TV', usage: 0.2 },
            { name: 'Washing Machine', usage: 0.4 },
        ],
        weeklyUsageTrend: [
            { day: 'Mon', consumption: 38 },
            { day: 'Tue', consumption: 42 },
            { day: 'Wed', consumption: 44 },
            { day: 'Thu', consumption: 41 },
            { day: 'Fri', consumption: 48 },
            { day: 'Sat', consumption: 45 },
            { day: 'Sun', consumption: 47 },
        ],
    };

    const weeklyUsageChartData = {
        labels: energyData.weeklyUsageTrend.map((entry) => entry.day),
        datasets: [
            {
                label: 'Consumption (kWh)',
                data: energyData.weeklyUsageTrend.map((entry) => entry.consumption),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                tension: 0.3,
                fill: true,
            },
        ],
    };

    const applianceUsageChartData = {
        labels: energyData.appliances.map((appliance) => appliance.name),
        datasets: [
            {
                label: 'Usage (kW)',
                data: energyData.appliances.map((appliance) => appliance.usage),
                backgroundColor: '#38bdf8',
                borderRadius: 6,
            },
        ],
    };

    const weeklyUsageChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
        },
        scales: {
            y: { beginAtZero: true },
        },
    };

    const applianceUsageChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true },
        },
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Energy Monitor Dashboard</h1>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Current Usage</dt>
                                            <dd className="text-lg font-medium text-gray-900">{energyData.currentUsage} kW</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Daily Usage</dt>
                                            <dd className="text-lg font-medium text-gray-900">{energyData.dailyUsage} kWh</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Monthly Usage</dt>
                                            <dd className="text-lg font-medium text-gray-900">{energyData.monthlyUsage} kWh</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Weekly Consumption Trend</h3>
                            <p className="text-sm text-gray-500 mb-4">Track how your energy usage changes day by day.</p>
                            <div className="h-72">
                                <Line data={weeklyUsageChartData} options={weeklyUsageChartOptions} />
                            </div>
                        </div>
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Appliance Breakdown</h3>
                            <p className="text-sm text-gray-500 mb-4">Identify high-consuming appliances in your home.</p>
                            <div className="h-72">
                                <Bar data={applianceUsageChartData} options={applianceUsageChartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Appliance Usage Details</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">Current energy consumption by appliance.</p>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {energyData.appliances.map((appliance, index) => (
                                <li key={index} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-900">{appliance.name}</div>
                                        <div className="text-sm text-gray-500">{appliance.usage} kW</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}