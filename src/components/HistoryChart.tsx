'use client';

import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

type HistoryEntry = {
    volt: number;
    current1: number;
    current2: number;
    current3: number;
    power1: number;
    power2: number;
    power3: number;
    total_power: number;
    watt: number;
    temperature?: number;
    humidity?: number;
    time: string;
};

interface HistoryChartProps {
    data: HistoryEntry[];
}

// Room configuration
const ROOMS = [
    { id: 1, name: 'Living Room', icon: '🛋️', color: '#22c55e' },
    { id: 2, name: 'Bedroom', icon: '🛏️', color: '#0ea5e9' },
    { id: 3, name: 'Kitchen', icon: '🍳', color: '#f97316' },
];

const formatNumber = (value: number, decimals = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function HistoryChart({ data }: HistoryChartProps) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-gray-500">No data available for the selected period</div>;
    }

    const isSameDay = data.length > 0 &&
        new Date(data[0].time).toDateString() === new Date(data[data.length - 1].time).toDateString();

    const formattedData = data.map(item => ({
        ...item,
        formattedTime: format(new Date(item.time), isSameDay ? 'HH:mm:ss' : 'MM/dd HH:mm')
    }));

    // Calculate room analytics for the period
    const roomAnalytics = ROOMS.map(room => {
        const powerKey = `power${room.id}` as keyof HistoryEntry;
        const currentKey = `current${room.id}` as keyof HistoryEntry;

        const powers = data.map(d => d[powerKey] as number).filter(v => typeof v === 'number');
        const currents = data.map(d => d[currentKey] as number).filter(v => typeof v === 'number');

        const totalEnergy = powers.reduce((a, b) => a + b, 0);
        const avgPower = powers.length > 0 ? totalEnergy / powers.length : 0;
        const maxPower = powers.length > 0 ? Math.max(...powers) : 0;
        const minPower = powers.length > 0 ? Math.min(...powers) : 0;
        const avgCurrent = currents.length > 0 ? currents.reduce((a, b) => a + b, 0) / currents.length : 0;

        return { room, avgPower, maxPower, minPower, avgCurrent, totalEnergy };
    });

    // Overall stats
    const totalPowers = data.map(d => d.total_power || 0);
    const avgTotalPower = totalPowers.reduce((a, b) => a + b, 0) / totalPowers.length;
    const maxTotalPower = Math.max(...totalPowers);
    const totalContribution = roomAnalytics.reduce((a, b) => a + b.totalEnergy, 0);

    return (
        <div className="space-y-8">
            {/* Room Analytics Summary Cards */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Period Analytics by Room</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roomAnalytics.map(({ room, avgPower, maxPower, minPower, avgCurrent, totalEnergy }) => (
                        <div key={room.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">{room.icon}</span>
                                <h3 className="font-semibold text-slate-900">{room.name}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-slate-500">Avg Power</p>
                                    <p className="font-bold text-slate-900">{formatNumber(avgPower)} W</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Peak Power</p>
                                    <p className="font-bold text-slate-900">{formatNumber(maxPower)} W</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Min Power</p>
                                    <p className="font-bold text-slate-900">{formatNumber(minPower)} W</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Avg Current</p>
                                    <p className="font-bold text-slate-900">{formatNumber(avgCurrent)} A</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">Share of Total</span>
                                    <span className="font-bold" style={{ color: room.color }}>
                                        {totalContribution > 0 ? formatNumber((totalEnergy / totalContribution) * 100, 1) : 0}%
                                    </span>
                                </div>
                                <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${totalContribution > 0 ? (totalEnergy / totalContribution) * 100 : 0}%`,
                                            backgroundColor: room.color
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Avg Total Power</p>
                    <p className="text-xl font-bold text-slate-900">{formatNumber(avgTotalPower)} W</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Peak Total Power</p>
                    <p className="text-xl font-bold text-slate-900">{formatNumber(maxTotalPower)} W</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Data Points</p>
                    <p className="text-xl font-bold text-slate-900">{data.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Time Range</p>
                    <p className="text-sm font-bold text-slate-900">{isSameDay ? 'Same Day' : 'Multiple Days'}</p>
                </div>
            </div>

            {/* Power by Room (Stacked Area) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Power Distribution by Room</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Area type="monotone" dataKey="power1" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="🛋️ Living Room (W)" />
                            <Area type="monotone" dataKey="power2" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} name="🛏️ Bedroom (W)" />
                            <Area type="monotone" dataKey="power3" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name="🍳 Kitchen (W)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Total Power */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">⚡ Total Power Consumption</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="total_power" stroke="#111827" strokeWidth={2} name="Total Power (W)" dot={false} />
                            <Line type="monotone" dataKey="watt" stroke="#16a34a" strokeWidth={1.5} name="Watt (W)" dot={false} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Current by Room */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">🔋 Current Draw by Room</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="current1" stroke="#22c55e" strokeWidth={2} name="🛋️ Living Room (A)" dot={false} />
                            <Line type="monotone" dataKey="current2" stroke="#0ea5e9" strokeWidth={2} name="🛏️ Bedroom (A)" dot={false} />
                            <Line type="monotone" dataKey="current3" stroke="#f97316" strokeWidth={2} name="🍳 Kitchen (A)" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Voltage */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">🔌 Voltage</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="volt" stroke="#8b5cf6" strokeWidth={2} name="Voltage (V)" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Environment */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">🌡️ Home Environment</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temperature (°C)" dot={false} />
                            <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
