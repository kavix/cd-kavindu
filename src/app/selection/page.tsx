import Link from 'next/link';
import { Home, Building } from 'lucide-react';

export default function SelectionPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">⚡</span>
                        <h1 className="text-3xl font-semibold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                            Elektrum
                        </h1>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Please select your destination</p>
                    <div className="mt-8 space-y-4">
                        <Link href="/dashboard" passHref>
                            <span className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30">
                                <Home className="mr-3 h-5 w-5" />
                                Home Dashboard
                            </span>
                        </Link>
                        <Link href="/boarding" passHref>
                            <span className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30">
                                <Building className="mr-3 h-5 w-5" />
                                Boarding
                            </span>
                        </Link>
                    </div>
                </div>
                <p className="mt-8 text-center text-xs text-slate-400">
                    © Elektrum. All rights reserved.
                </p>
            </div>
        </div>
    );
}
