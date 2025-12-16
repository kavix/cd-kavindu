'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Standard fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

// Room configuration
const ROOMS = [
    { id: 1, name: 'Living Room', icon: '🛋️', color: '#22c55e', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
    { id: 2, name: 'Bedroom', icon: '🛏️', color: '#0ea5e9', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' },
    { id: 3, name: 'Kitchen', icon: '🍳', color: '#f97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' },
];

const formatNumber = (value: number, decimals = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Room Card Component
const RoomCard = ({ room, current, power, avgPower, maxPower, contribution }: {
    room: typeof ROOMS[0];
    current: number;
    power: number;
    avgPower: number;
    maxPower: number;
    contribution: number;
}) => (
    <div className={`rounded-2xl border ${room.borderColor} ${room.bgColor} p-5 shadow-sm transition hover:shadow-md`}>
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <span className="text-2xl">{room.icon}</span>
                <h3 className={`font-semibold ${room.textColor}`}>{room.name}</h3>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${room.bgColor} ${room.textColor}`}>
                {formatNumber(contribution, 1)}% of total
            </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className={`text-lg font-bold ${room.textColor}`}>{formatNumber(current)} A</p>
            </div>
            <div>
                <p className="text-xs text-slate-500">Power</p>
                <p className={`text-lg font-bold ${room.textColor}`}>{formatNumber(power)} W</p>
            </div>
            <div>
                <p className="text-xs text-slate-500">Avg Power</p>
                <p className="text-sm font-medium text-slate-700">{formatNumber(avgPower)} W</p>
            </div>
            <div>
                <p className="text-xs text-slate-500">Peak Power</p>
                <p className="text-sm font-medium text-slate-700">{formatNumber(maxPower)} W</p>
            </div>
        </div>
    </div>
);

// Summary Stats Card
const SummaryCard = ({ label, value, unit, icon, trend }: {
    label: string;
    value: string;
    unit: string;
    icon: string;
    trend?: { value: number; isUp: boolean };
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{icon}</span>
            <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
        <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <span className="text-sm font-medium text-slate-500">{unit}</span>
        </div>
        {trend && (
            <p className={`text-xs mt-1 ${trend.isUp ? 'text-red-500' : 'text-green-500'}`}>
                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% from avg
            </p>
        )}
    </div>
);

export default function LiveSensorChart() {
    const { data, error, isLoading } = useSWR<SensorData[]>('/api/sensors', fetcher, {
        refreshInterval: 5000
    });

    if (error) return <div className="p-4 text-red-600">Failed to load data</div>;
    if (isLoading) return <div className="p-4">Loading live data...</div>;
    if (!data || data.length === 0) return <div className="p-4">No data available</div>;

    // Get latest reading
    const latest = data[data.length - 1];

    // Calculate room analytics
    const roomAnalytics = ROOMS.map(room => {
        const currentKey = `current${room.id}` as keyof SensorData;
        const powerKey = `power${room.id}` as keyof SensorData;

        const currents = data.map(d => d[currentKey] as number);
        const powers = data.map(d => d[powerKey] as number);

        return {
            room,
            current: latest[currentKey] as number,
            power: latest[powerKey] as number,
            avgPower: powers.reduce((a, b) => a + b, 0) / powers.length,
            maxPower: Math.max(...powers),
            minPower: Math.min(...powers),
            avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
        };
    });

    // Calculate contribution percentages
    const totalPowerNow = latest.total_power || (latest.power1 + latest.power2 + latest.power3);
    const roomsWithContribution = roomAnalytics.map(r => ({
        ...r,
        contribution: totalPowerNow > 0 ? (r.power / totalPowerNow) * 100 : 0,
    }));

    // Overall stats
    const avgTotalPower = data.reduce((a, b) => a + (b.total_power || 0), 0) / data.length;
    const avgTemp = data.reduce((a, b) => a + b.temperature, 0) / data.length;

    // Format data for charts
    const formattedData = data.map(item => ({
        ...item,
        formattedTime: format(new Date(item.time), 'HH:mm:ss')
    }));

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total Power"
                    value={formatNumber(latest.total_power)}
                    unit="W"
                    icon="⚡"
                    trend={{ value: ((latest.total_power - avgTotalPower) / avgTotalPower) * 100, isUp: latest.total_power > avgTotalPower }}
                />
                <SummaryCard
                    label="Voltage"
                    value={formatNumber(latest.volt, 1)}
                    unit="V"
                    icon="🔌"
                />
                <SummaryCard
                    label="Temperature"
                    value={formatNumber(latest.temperature, 1)}
                    unit="°C"
                    icon="🌡️"
                    trend={{ value: ((latest.temperature - avgTemp) / avgTemp) * 100, isUp: latest.temperature > avgTemp }}
                />
                <SummaryCard
                    label="Humidity"
                    value={formatNumber(latest.humidity, 1)}
                    unit="%"
                    icon="💧"
                />
            </div>

            {/* Room Cards */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">🏠 Room-wise Energy Consumption</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roomsWithContribution.map(({ room, current, power, avgPower, maxPower, contribution }) => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            current={current}
                            power={power}
                            avgPower={avgPower}
                            maxPower={maxPower}
                            contribution={contribution}
                        />
                    ))}
                </div>
            </section>

            {/* Room Power Distribution Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Power Distribution by Room</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                formatter={(value: number, name: string) => [formatNumber(value) + ' W', name]}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="power1" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="🛋️ Living Room" />
                            <Area type="monotone" dataKey="power2" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} name="🛏️ Bedroom" />
                            <Area type="monotone" dataKey="power3" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name="🍳 Kitchen" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Room Current Comparison */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">🔋 Current Draw by Room</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                formatter={(value: number, name: string) => [formatNumber(value) + ' A', name]}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="current1" stroke="#22c55e" strokeWidth={2} name="🛋️ Living Room" dot={false} />
                            <Line type="monotone" dataKey="current2" stroke="#0ea5e9" strokeWidth={2} name="🛏️ Bedroom" dot={false} />
                            <Line type="monotone" dataKey="current3" stroke="#f97316" strokeWidth={2} name="🍳 Kitchen" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Total Power & Voltage */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">⚡ Total Power & Voltage</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="power" orientation="left" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="voltage" orientation="right" tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line yAxisId="power" type="monotone" dataKey="total_power" stroke="#111827" strokeWidth={2} name="Total Power (W)" dot={false} />
                            <Line yAxisId="voltage" type="monotone" dataKey="volt" stroke="#8b5cf6" strokeWidth={2} name="Voltage (V)" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Environment */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">🌡️ Home Environment</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                            <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temperature (°C)" dot={false} />
                            <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Room Analytics Summary */}
            <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white">
                <h2 className="text-xl font-bold mb-4">📈 Room Analytics Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {roomsWithContribution.map(({ room, power, avgPower, maxPower, contribution, avgCurrent }) => (
                        <div key={room.id} className="bg-white/10 rounded-xl p-4 backdrop-blur">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">{room.icon}</span>
                                <span className="font-semibold">{room.name}</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Current Usage</span>
                                    <span className="font-medium">{formatNumber(power)} W</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Average</span>
                                    <span className="font-medium">{formatNumber(avgPower)} W</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Peak</span>
                                    <span className="font-medium">{formatNumber(maxPower)} W</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Avg Current</span>
                                    <span className="font-medium">{formatNumber(avgCurrent)} A</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Share of Total</span>
                                        <span className="font-bold text-lg">{formatNumber(contribution, 1)}%</span>
                                    </div>
                                    <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${contribution}%`, backgroundColor: room.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
