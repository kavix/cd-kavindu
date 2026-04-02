'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SensorData = {
    _id?: string;
    volt: number;
    current1: number;
    current2: number;
    current3: number;
    power1: number;
    power2: number;
    power3: number;
    total_power: number;
    watt?: number;
    temperature: number;
    humidity: number;
    time: string;
};

type ReportGeneratorProps = {
    sensorData: SensorData[];
};

type ReportType = 'weekly' | 'monthly';

const ROOMS = [
    { id: 1, name: 'Living Room', icon: '🛋️' },
    { id: 2, name: 'Bedroom', icon: '🛏️' },
    { id: 3, name: 'Kitchen', icon: '🍳' },
];

const formatNumber = (value: number, decimals = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toFixed(decimals);
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

async function fetchReportData(type: ReportType): Promise<SensorData[]> {
    const now = new Date();
    let startDate: Date;

    if (type === 'weekly') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const response = await fetch(
        `/api/history/mongo?start=${startDate.toISOString()}&end=${now.toISOString()}&limit=50000`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch report data');
    }

    return response.json();
}

function calculateStatistics(data: SensorData[]) {
    if (data.length === 0) {
        return null;
    }

    // Overall statistics
    const totalPowers = data.map(d => d.total_power || 0);
    const voltages = data.map(d => d.volt);
    const temperatures = data.map(d => d.temperature);
    const humidities = data.map(d => d.humidity);

    // Room-wise statistics
    const roomStats = ROOMS.map(room => {
        const powers = data.map(d => d[`power${room.id}` as keyof SensorData] as number);
        const currents = data.map(d => d[`current${room.id}` as keyof SensorData] as number);

        return {
            room,
            avgPower: powers.reduce((a, b) => a + b, 0) / powers.length,
            maxPower: Math.max(...powers),
            minPower: Math.min(...powers),
            avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
            maxCurrent: Math.max(...currents),
            totalEnergy: (powers.reduce((a, b) => a + b, 0) / powers.length / 1000) * (data.length * 5 / 3600), // Approximate kWh
        };
    });

    // Daily breakdown
    const dailyMap = new Map<string, { powers: number[]; temps: number[]; count: number }>();
    data.forEach(entry => {
        const day = new Date(entry.time).toISOString().split('T')[0];
        const existing = dailyMap.get(day) || { powers: [], temps: [], count: 0 };
        existing.powers.push(entry.total_power || 0);
        existing.temps.push(entry.temperature);
        existing.count++;
        dailyMap.set(day, existing);
    });

    const dailyStats = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
            date,
            avgPower: stats.powers.reduce((a, b) => a + b, 0) / stats.powers.length,
            maxPower: Math.max(...stats.powers),
            avgTemp: stats.temps.reduce((a, b) => a + b, 0) / stats.temps.length,
            dataPoints: stats.count,
            estimatedEnergy: (stats.powers.reduce((a, b) => a + b, 0) / stats.powers.length / 1000) * 24, // kWh/day approximation
        }));

    // Calculate total energy consumption
    const avgPowerW = totalPowers.reduce((a, b) => a + b, 0) / totalPowers.length;
    const durationHours = (new Date(data[data.length - 1]?.time).getTime() - new Date(data[0]?.time).getTime()) / (1000 * 60 * 60);
    const totalEnergyKWh = (avgPowerW / 1000) * durationHours;

    return {
        dataPoints: data.length,
        startDate: new Date(data[0]?.time),
        endDate: new Date(data[data.length - 1]?.time),
        durationHours,
        overall: {
            avgPower: avgPowerW,
            maxPower: Math.max(...totalPowers),
            minPower: Math.min(...totalPowers),
            avgVoltage: voltages.reduce((a, b) => a + b, 0) / voltages.length,
            maxVoltage: Math.max(...voltages),
            minVoltage: Math.min(...voltages),
            avgTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
            maxTemperature: Math.max(...temperatures),
            minTemperature: Math.min(...temperatures),
            avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
            maxHumidity: Math.max(...humidities),
            minHumidity: Math.min(...humidities),
            totalEnergyKWh,
            estimatedCost: totalEnergyKWh * 13.06, // Sri Lanka avg rate
            carbonFootprint: totalEnergyKWh * 0.4062, // kg CO2
        },
        roomStats,
        dailyStats,
    };
}

function generatePDF(stats: ReturnType<typeof calculateStatistics>, type: ReportType) {
    if (!stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`Energy ${type === 'weekly' ? 'Weekly' : 'Monthly'} Report`, pageWidth / 2, 20, { align: 'center' });

    // Subtitle with date range
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
        `${formatDate(stats.startDate)} - ${formatDate(stats.endDate)}`,
        pageWidth / 2,
        28,
        { align: 'center' }
    );

    // Report generated timestamp
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, 34, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary', 14, 48);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600

    const summaryData = [
        ['Total Data Points', stats.dataPoints.toLocaleString()],
        ['Duration', `${stats.durationHours.toFixed(1)} hours`],
        ['Total Energy Consumed', `${formatNumber(stats.overall.totalEnergyKWh, 2)} kWh`],
        ['Estimated Cost', `Rs. ${formatNumber(stats.overall.estimatedCost, 2)}`],
        ['Carbon Footprint', `${formatNumber(stats.overall.carbonFootprint, 2)} kg CO₂`],
    ];

    autoTable(doc, {
        startY: 52,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 60 },
        },
    });

    // Overall Statistics Section
    const overallY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Overall Statistics', 14, overallY);

    const overallStats = [
        ['Metric', 'Average', 'Maximum', 'Minimum'],
        [
            'Power (W)',
            formatNumber(stats.overall.avgPower, 1),
            formatNumber(stats.overall.maxPower, 1),
            formatNumber(stats.overall.minPower, 1),
        ],
        [
            'Voltage (V)',
            formatNumber(stats.overall.avgVoltage, 1),
            formatNumber(stats.overall.maxVoltage, 1),
            formatNumber(stats.overall.minVoltage, 1),
        ],
        [
            'Temperature (°C)',
            formatNumber(stats.overall.avgTemperature, 1),
            formatNumber(stats.overall.maxTemperature, 1),
            formatNumber(stats.overall.minTemperature, 1),
        ],
        [
            'Humidity (%)',
            formatNumber(stats.overall.avgHumidity, 1),
            formatNumber(stats.overall.maxHumidity, 1),
            formatNumber(stats.overall.minHumidity, 1),
        ],
    ];

    autoTable(doc, {
        startY: overallY + 4,
        head: [overallStats[0]],
        body: overallStats.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
    });

    // Room-wise Statistics Section
    const roomY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Room-wise Consumption', 14, roomY);

    const roomData = stats.roomStats.map(r => [
        `${r.room.icon} ${r.room.name}`,
        formatNumber(r.avgPower, 1),
        formatNumber(r.maxPower, 1),
        formatNumber(r.avgCurrent, 2),
        formatNumber(r.totalEnergy, 2),
    ]);

    autoTable(doc, {
        startY: roomY + 4,
        head: [['Room', 'Avg Power (W)', 'Peak Power (W)', 'Avg Current (A)', 'Est. Energy (kWh)']],
        body: roomData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
    });

    // Daily Breakdown Section (new page if needed)
    const dailyY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    if (dailyY > 240) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Daily Breakdown', 14, 20);

        const dailyData = stats.dailyStats.map(d => [
            new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            formatNumber(d.avgPower, 1),
            formatNumber(d.maxPower, 1),
            formatNumber(d.avgTemp, 1),
            formatNumber(d.estimatedEnergy, 2),
            d.dataPoints.toLocaleString(),
        ]);

        autoTable(doc, {
            startY: 24,
            head: [['Date', 'Avg Power (W)', 'Peak Power (W)', 'Avg Temp (°C)', 'Est. Energy (kWh)', 'Data Points']],
            body: dailyData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
        });
    } else {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Daily Breakdown', 14, dailyY);

        const dailyData = stats.dailyStats.map(d => [
            new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            formatNumber(d.avgPower, 1),
            formatNumber(d.maxPower, 1),
            formatNumber(d.avgTemp, 1),
            formatNumber(d.estimatedEnergy, 2),
            d.dataPoints.toLocaleString(),
        ]);

        autoTable(doc, {
            startY: dailyY + 4,
            head: [['Date', 'Avg Power (W)', 'Peak Power (W)', 'Avg Temp (°C)', 'Est. Energy (kWh)', 'Data Points']],
            body: dailyData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
            `Elektrum - Where Energy Meets Intelligence | Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    // Save the PDF
    const filename = `energy-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

export default function ReportGenerator({ sensorData }: ReportGeneratorProps) {
    const [reportType, setReportType] = useState<ReportType>('weekly');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async (type: ReportType) => {
        setIsLoading(type);
        setError(null);

        try {
            const data = await fetchReportData(type);

            if (data.length === 0) {
                setError(`No data available for ${type} report`);
                return;
            }

            const stats = calculateStatistics(data);
            generatePDF(stats, type);
        } catch (err) {
            setError(`Failed to generate ${type} report. Please try again.`);
            console.error(err);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📊</span>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Download Reports</h3>
                    <p className="text-sm text-slate-600">Generate PDF summaries of your energy usage</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => handleGenerateReport('weekly')}
                    disabled={isLoading !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading === 'weekly' ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Weekly Report
                        </>
                    )}
                </button>

                <button
                    onClick={() => handleGenerateReport('monthly')}
                    disabled={isLoading !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading === 'monthly' ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Monthly Report
                        </>
                    )}
                </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
                Reports include energy consumption, room-wise breakdown, daily statistics, estimated costs, and carbon footprint.
            </p>
        </div>
    );
}
