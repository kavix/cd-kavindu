'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Standard fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SensorData = {
    _id: string;
    volt: number;
    amps: number;
    watt: number;
    temperature: number;
    humidity: number;
    time: string;
};

export default function LiveSensorChart() {
    // refreshInterval: 5000 tells it to re-fetch every 5 seconds
    const { data, error, isLoading } = useSWR<SensorData[]>('/api/sensors', fetcher, {
        refreshInterval: 5000
    });

    if (error) return <div className="p-4 text-red-600">Failed to load data</div>;
    if (isLoading) return <div className="p-4">Loading live data...</div>;
    if (!data) return <div className="p-4">No data available</div>;

    // Format time for the X Axis (e.g., "16:10:05")
    const formattedData = data.map(item => ({
        ...item,
        formattedTime: format(new Date(item.time), 'HH:mm:ss')
    }));

    return (
        <div className="space-y-8 p-4">

            {/* GRAPH 1: Power Stats (Volt & Watt) */}
            <div className="h-80 w-full bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Power Monitor (Volts & Watts)</h2>
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
                <h2 className="text-xl font-bold mb-4">Current Draw (Amps)</h2>
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
                <h2 className="text-xl font-bold mb-4">Environment</h2>
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
