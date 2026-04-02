import Link from 'next/link';
import { Home, Ship } from 'lucide-react';

export default function SelectionPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-12 text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h1>
                    <p className="text-gray-500 mb-8">Please select your destination</p>
                    <div className="space-y-5">
                        <Link href="/dashboard" passHref>
                            <span className="flex items-center justify-center w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-semibold py-4 px-6 rounded-xl transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md transform hover:-translate-y-1">
                                <Home className="mr-3 h-5 w-5" />
                                Home Dashboard
                            </span>
                        </Link>
                        <Link href="/boarding" passHref>
                            <span className="flex items-center justify-center w-full bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-gray-700 hover:text-green-600 font-semibold py-4 px-6 rounded-xl transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md transform hover:-translate-y-1">
                                <Ship className="mr-3 h-5 w-5" />
                                Boarding
                            </span>
                        </Link>
                    </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-8">
                    © Electrum. All rights reserved.
                </p>
            </div>
        </div>
    );
}
