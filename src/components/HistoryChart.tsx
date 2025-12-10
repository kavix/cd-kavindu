'use client';

import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type HistoryEntry = {
    volt: number;
    amps: number;
    watt: number;
    temperature?: number;
    humidity?: number;
    time: string;
};

interface HistoryChartProps {
    data: HistoryEntry[];
}

export default function HistoryChart({ data }: HistoryChartProps) {
    if (!data || data.length === 0) {
        return <div className="p-4 text-gray-500">No data available for the selected period</div>;
    }

    // Format time for the X Axis. 
    // For history, we might want to show date if the range is large, or just time.
    // Let's try a smart format: if all data is same day, show time, else show date+time.
    const isSameDay = data.length > 0 &&
        new Date(data[0].time).toDateString() === new Date(data[data.length - 1].time).toDateString();

    const formattedData = data.map(item => ({
        ...item,
        formattedTime: format(new Date(item.time), isSameDay ? 'HH:mm:ss' : 'MM/dd HH:mm')
    }));

    return (
        <div className="space-y-8 p-4">

            {/* GRAPH 1: Power Stats (Volt & Watt) */}
            <div className="h-80 w-full bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Power History (Volts & Watts)</h2>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedTime" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="volt" stroke="#8884d8" name="Voltage (V)" dot={false} />
                        <Line type="monotone" dataKey="watt" stroke="#82ca9d" name="Wattage (W)" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* GRAPH 2: Amperage (Detailed View) */}
            <div className="h-80 w-full bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Current History (Amps)</h2>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedTime" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="amps" stroke="#ff7300" name="Current (A)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* GRAPH 3: Environment (Temp & Humidity) */}
            <div className="h-80 w-full bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Environment History</h2>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedTime" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="temperature" stroke="#ff0000" name="Temp (°C)" dot={false} />
                        <Line type="monotone" dataKey="humidity" stroke="#0000ff" name="Humidity (%)" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
