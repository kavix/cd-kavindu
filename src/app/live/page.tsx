'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import LiveSensorChart from '@/components/LiveSensorChart';
import HealthCheck from '@/components/HealthCheck';
import EnergyPreloader from '@/components/EnergyPreloader';

export default function LiveMonitor() {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !userId) {
            router.push('/login');
        }
    }, [isLoaded, userId, router]);

    if (!isLoaded || !userId) {
        return <EnergyPreloader />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
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
                                href="/live"
                                className="text-sm font-medium text-slate-900 transition hover:text-slate-900"
                            >
                                Live Monitor
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
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-slate-900">Real-time sensor monitor</h2>
                    <p className="mt-2 text-sm text-slate-600">Live data updates every 5 seconds.</p>
                </div>
                <LiveSensorChart />
            </main>
        </div>
    );
}
