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
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

const BRAND = {
    name: 'Elektrum',
    tagline: 'Where Energy Meets Intelligence',
    // Tailwind tokens used throughout the app
    primary: [249, 115, 22] as const,     // orange-500
    secondary: [244, 63, 94] as const,    // rose-500
    slate900: [15, 23, 42] as const,      // slate-900
    slate800: [30, 41, 59] as const,      // slate-800
    slate700: [51, 65, 85] as const,      // slate-700
    slate600: [71, 85, 105] as const,     // slate-600
    slate500: [100, 116, 139] as const,   // slate-500
    slate200: [226, 232, 240] as const,   // slate-200
    slate50: [248, 250, 252] as const,    // slate-50
    white: [255, 255, 255] as const,
};

const asFiniteNumber = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(num) ? num : fallback;
};

const asValidDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const median = (values: number[]) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
};

const integrateEnergyKWh = (powersW: number[], times: Date[]) => {
    if (powersW.length !== times.length || powersW.length < 2) return 0;

    let totalKWh = 0;
    for (let i = 0; i < powersW.length - 1; i += 1) {
        const start = times[i].getTime();
        const end = times[i + 1].getTime();
        const deltaHours = (end - start) / (1000 * 60 * 60);
        if (!Number.isFinite(deltaHours) || deltaHours <= 0) continue;

        const p0 = powersW[i];
        const p1 = powersW[i + 1];
        totalKWh += ((p0 + p1) / 2 / 1000) * deltaHours;
    }

    return totalKWh;
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

    const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: now.toISOString(),
        // FastAPI docs: max 1000
        limit: '1000',
    });

    const response = await fetch(`/api/history?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch report data');
    }

    const json = await response.json();
    const items = Array.isArray(json) ? json : [];

    // /history returns newest first; reverse for chronological report calculations.
    return items.slice().reverse();
}

function calculateStatistics(data: SensorData[]) {
    if (data.length === 0) {
        return null;
    }

    const points = data
        .map((entry) => {
            const timestamp = asValidDate(entry.time);
            return timestamp ? { entry, timestamp } : null;
        })
        .filter((item): item is { entry: SensorData; timestamp: Date } => item !== null)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (points.length === 0) {
        return null;
    }

    const times = points.map((p) => p.timestamp);
    const totalPowers = points.map((p) => asFiniteNumber(p.entry.total_power ?? p.entry.watt ?? 0));
    const voltages = points.map((p) => asFiniteNumber(p.entry.volt));
    const temperatures = points.map((p) => asFiniteNumber(p.entry.temperature));
    const humidities = points.map((p) => asFiniteNumber(p.entry.humidity));

    const durationHours = (times[times.length - 1].getTime() - times[0].getTime()) / (1000 * 60 * 60);

    const intervalsSec: number[] = [];
    for (let i = 0; i < times.length - 1; i += 1) {
        const deltaSec = (times[i + 1].getTime() - times[i].getTime()) / 1000;
        if (!Number.isFinite(deltaSec) || deltaSec <= 0) continue;
        // Ignore very large gaps so the sampling stats remain meaningful
        if (deltaSec > 60 * 60) continue;
        intervalsSec.push(deltaSec);
    }

    const sampling = {
        avgIntervalSec: intervalsSec.length ? average(intervalsSec) : null,
        medianIntervalSec: median(intervalsSec),
        minIntervalSec: intervalsSec.length ? Math.min(...intervalsSec) : null,
        maxIntervalSec: intervalsSec.length ? Math.max(...intervalsSec) : null,
    };

    const totalEnergyKWh = integrateEnergyKWh(totalPowers, times);
    const avgPowerW = durationHours > 0 ? (totalEnergyKWh * 1000) / durationHours : average(totalPowers);

    const maxPower = Math.max(...totalPowers);
    const minPower = Math.min(...totalPowers);
    const maxPowerIndex = totalPowers.indexOf(maxPower);
    const minPowerIndex = totalPowers.indexOf(minPower);

    const maxVoltage = Math.max(...voltages);
    const minVoltage = Math.min(...voltages);
    const maxVoltageIndex = voltages.indexOf(maxVoltage);
    const minVoltageIndex = voltages.indexOf(minVoltage);

    const maxTemperature = Math.max(...temperatures);
    const minTemperature = Math.min(...temperatures);
    const maxTemperatureIndex = temperatures.indexOf(maxTemperature);
    const minTemperatureIndex = temperatures.indexOf(minTemperature);

    const maxHumidity = Math.max(...humidities);
    const minHumidity = Math.min(...humidities);
    const maxHumidityIndex = humidities.indexOf(maxHumidity);
    const minHumidityIndex = humidities.indexOf(minHumidity);

    const roomStatsRaw = ROOMS.map((room) => {
        const roomPowers = points.map((p) => asFiniteNumber(p.entry[`power${room.id}` as keyof SensorData], 0));
        const roomCurrents = points.map((p) => asFiniteNumber(p.entry[`current${room.id}` as keyof SensorData], 0));
        const roomEnergyKWh = integrateEnergyKWh(roomPowers, times);

        return {
            room,
            avgPower: average(roomPowers),
            maxPower: Math.max(...roomPowers),
            minPower: Math.min(...roomPowers),
            avgCurrent: average(roomCurrents),
            maxCurrent: Math.max(...roomCurrents),
            energyKWh: roomEnergyKWh,
        };
    });

    const totalRoomEnergy = roomStatsRaw.reduce((sum, item) => sum + item.energyKWh, 0);
    const roomStats = roomStatsRaw.map((room) => ({
        ...room,
        sharePercent: totalRoomEnergy > 0 ? (room.energyKWh / totalRoomEnergy) * 100 : 0,
    }));

    const dailyMap = new Map<string, { times: Date[]; powers: number[]; temps: number[] }>();
    points.forEach((p, index) => {
        const dayKey = p.timestamp.toISOString().split('T')[0];
        const existing = dailyMap.get(dayKey) || { times: [], powers: [], temps: [] };
        existing.times.push(p.timestamp);
        existing.powers.push(totalPowers[index]);
        existing.temps.push(temperatures[index]);
        dailyMap.set(dayKey, existing);
    });

    const dailyStats = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, day]) => ({
            date,
            avgPower: average(day.powers),
            maxPower: Math.max(...day.powers),
            avgTemp: average(day.temps),
            dataPoints: day.powers.length,
            energyKWh: integrateEnergyKWh(day.powers, day.times),
        }));

    const peakEvents = points
        .map((p, index) => ({
            time: p.timestamp,
            totalPower: totalPowers[index],
            volt: voltages[index],
            temperature: temperatures[index],
            humidity: humidities[index],
        }))
        .sort((a, b) => b.totalPower - a.totalPower)
        .slice(0, 8);

    const estimatedCost = totalEnergyKWh * 13.06;
    const carbonFootprint = totalEnergyKWh * 0.4062;

    return {
        dataPoints: points.length,
        startDate: times[0],
        endDate: times[times.length - 1],
        durationHours,
        sampling,
        overall: {
            avgPower: avgPowerW,
            maxPower,
            minPower,
            maxPowerTime: times[maxPowerIndex] ?? times[0],
            minPowerTime: times[minPowerIndex] ?? times[0],

            avgVoltage: average(voltages),
            maxVoltage,
            minVoltage,
            maxVoltageTime: times[maxVoltageIndex] ?? times[0],
            minVoltageTime: times[minVoltageIndex] ?? times[0],

            avgTemperature: average(temperatures),
            maxTemperature,
            minTemperature,
            maxTemperatureTime: times[maxTemperatureIndex] ?? times[0],
            minTemperatureTime: times[minTemperatureIndex] ?? times[0],

            avgHumidity: average(humidities),
            maxHumidity,
            minHumidity,
            maxHumidityTime: times[maxHumidityIndex] ?? times[0],
            minHumidityTime: times[minHumidityIndex] ?? times[0],

            totalEnergyKWh,
            estimatedCost,
            carbonFootprint,
        },
        roomStats,
        dailyStats,
        peakEvents,
    };
}

function generatePDF(stats: ReturnType<typeof calculateStatistics>, type: ReportType) {
    if (!stats) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    const reportTitle = `${type === 'weekly' ? 'Weekly' : 'Monthly'} Energy Report`;
    const periodLabel = `${formatDate(stats.startDate)} – ${formatDate(stats.endDate)}`;
    const generatedAt = new Date();

    doc.setProperties({
        title: `${BRAND.name} | ${reportTitle}`,
        subject: 'Energy usage report',
        author: BRAND.name,
        keywords: 'energy, report, elektrum, consumption',
    });

    const drawMetricCard = (x: number, y: number, w: number, h: number, label: string, value: string, accent: readonly [number, number, number]) => {
        doc.setFillColor(...BRAND.slate50);
        doc.setDrawColor(...BRAND.slate200);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');

        doc.setFillColor(...accent);
        doc.rect(x, y, 2, h, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.slate500);
        doc.text(label, x + 5, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...BRAND.slate900);
        doc.text(value, x + 5, y + 12);
    };

    // -----------------
    // Cover page
    // -----------------
    doc.setFillColor(...BRAND.slate900);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 40, pageWidth / 2, 2, 'F');
    doc.setFillColor(...BRAND.secondary);
    doc.rect(pageWidth / 2, 40, pageWidth / 2, 2, 'F');

    // Simple vector logo
    const logoX = marginX;
    const logoY = 22;
    doc.setFillColor(...BRAND.primary);
    doc.circle(logoX, logoY, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.white);
    //doc.text('E', logoX, logoY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(BRAND.name, logoX + 12, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(BRAND.tagline, logoX + 12, 30);

    doc.setTextColor(...BRAND.slate900);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(reportTitle, marginX, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.slate700);
    doc.text(`Period: ${periodLabel}`, marginX, 70);
    doc.text(`Generated: ${formatDateTime(generatedAt)}`, marginX, 76);

    const cardGutter = 6;
    const cardW = (pageWidth - marginX * 2 - cardGutter) / 2;
    const cardH = 16;
    let cardY = 86;

    drawMetricCard(
        marginX,
        cardY,
        cardW,
        cardH,
        'Total Energy',
        `${formatNumber(stats.overall.totalEnergyKWh, 2)} kWh`,
        BRAND.primary
    );
    drawMetricCard(
        marginX + cardW + cardGutter,
        cardY,
        cardW,
        cardH,
        'Estimated Cost',
        `LKR Rs. ${formatNumber(stats.overall.estimatedCost, 2)}`,
        BRAND.secondary
    );
    cardY += cardH + cardGutter;

    drawMetricCard(
        marginX,
        cardY,
        cardW,
        cardH,
        'Average Power',
        `${formatNumber(stats.overall.avgPower, 1)} W`,
        BRAND.primary
    );
    drawMetricCard(
        marginX + cardW + cardGutter,
        cardY,
        cardW,
        cardH,
        'Peak Power',
        `${formatNumber(stats.overall.maxPower, 1)} W`,
        BRAND.secondary
    );
    cardY += cardH + cardGutter;

    const medianInterval = stats.sampling.medianIntervalSec;
    const samplingLabel = medianInterval ? `${Math.round(medianInterval)}s median` : '—';

    drawMetricCard(
        marginX,
        cardY,
        cardW,
        cardH,
        'Data Points',
        stats.dataPoints.toLocaleString(),
        BRAND.primary
    );
    drawMetricCard(
        marginX + cardW + cardGutter,
        cardY,
        cardW,
        cardH,
        'Sampling',
        samplingLabel,
        BRAND.secondary
    );

    // Highlights
    const topRoom = [...stats.roomStats].sort((a, b) => b.energyKWh - a.energyKWh)[0];
    const topDay = [...stats.dailyStats].sort((a, b) => b.energyKWh - a.energyKWh)[0];
    const peak = stats.peakEvents[0];

    let highlightsY = cardY + cardH + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.slate800);
    doc.text('Highlights', marginX, highlightsY);

    highlightsY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.slate700);

    const highlightLines = [
        peak ? `Peak power reached ${formatNumber(peak.totalPower, 0)} W at ${formatDateTime(peak.time)}.` : 'Peak power event data unavailable.',
        topRoom
            ? `Highest room consumption: ${topRoom.room.name} (${formatNumber(topRoom.energyKWh, 2)} kWh, ${formatNumber(topRoom.sharePercent, 1)}%).`
            : 'Room consumption data unavailable.',
        topDay
            ? `Highest daily energy: ${new Date(topDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${formatNumber(topDay.energyKWh, 2)} kWh).`
            : 'Daily energy data unavailable.',
    ];

    highlightLines.forEach((line) => {
        doc.text('•', marginX, highlightsY);
        doc.text(line, marginX + 4, highlightsY);
        highlightsY += 5;
    });

    doc.setDrawColor(...BRAND.slate200);
    doc.line(marginX, pageHeight - 28, pageWidth - marginX, pageHeight - 28);

    doc.setFontSize(8);
    doc.setTextColor(...BRAND.slate500);
    doc.text(
        `Tariff: LKR Rs. 13.06/kWh • CO₂ factor: 0.4062 kg/kWh • Energy estimated from available samples`,
        marginX,
        pageHeight - 20
    );
    doc.text(`Generated by ${BRAND.name}`, marginX, pageHeight - 14);

    // -----------------
    // Detail pages
    // -----------------
    doc.addPage();

    const tableMargin = { top: 28, bottom: 18, left: marginX, right: marginX };
    let cursorY = 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...BRAND.slate900);
    doc.text('Detailed metrics', marginX, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.slate600);
    doc.text(`Period: ${periodLabel}`, marginX, cursorY);
    cursorY += 8;

    // Overall Metrics
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.slate800);
    doc.text('Overall statistics', marginX, cursorY);
    cursorY += 4;

    const overallRows = [
        [
            'Power (W)',
            formatNumber(stats.overall.avgPower, 1),
            `${formatNumber(stats.overall.maxPower, 1)} (at ${formatDateTime(stats.overall.maxPowerTime)})`,
            `${formatNumber(stats.overall.minPower, 1)} (at ${formatDateTime(stats.overall.minPowerTime)})`,
        ],
        [
            'Voltage (V)',
            formatNumber(stats.overall.avgVoltage, 1),
            `${formatNumber(stats.overall.maxVoltage, 1)} (at ${formatDateTime(stats.overall.maxVoltageTime)})`,
            `${formatNumber(stats.overall.minVoltage, 1)} (at ${formatDateTime(stats.overall.minVoltageTime)})`,
        ],
        [
            'Temperature (°C)',
            formatNumber(stats.overall.avgTemperature, 1),
            `${formatNumber(stats.overall.maxTemperature, 1)} (at ${formatDateTime(stats.overall.maxTemperatureTime)})`,
            `${formatNumber(stats.overall.minTemperature, 1)} (at ${formatDateTime(stats.overall.minTemperatureTime)})`,
        ],
        [
            'Humidity (%)',
            formatNumber(stats.overall.avgHumidity, 1),
            `${formatNumber(stats.overall.maxHumidity, 1)} (at ${formatDateTime(stats.overall.maxHumidityTime)})`,
            `${formatNumber(stats.overall.minHumidity, 1)} (at ${formatDateTime(stats.overall.minHumidityTime)})`,
        ],
    ];

    autoTable(doc, {
        startY: cursorY,
        margin: tableMargin,
        head: [['Metric', 'Average', 'Peak', 'Minimum']],
        body: overallRows,
        theme: 'striped',
        headStyles: { fillColor: BRAND.slate900 as unknown as number[], textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.slate50 as unknown as number[] },
        styles: { fontSize: 9, cellPadding: 3, textColor: BRAND.slate900 as unknown as number[] },
        columnStyles: {
            0: { cellWidth: 32 },
        },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 10;

    // Room-wise Energy
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.slate800);
    doc.text('Room-wise consumption', marginX, cursorY);
    cursorY += 4;

    const roomRows = stats.roomStats.map((room) => [
        `${room.room.icon} ${room.room.name}`,
        formatNumber(room.energyKWh, 2),
        `${formatNumber(room.sharePercent, 1)}%`,
        formatNumber(room.avgPower, 1),
        formatNumber(room.maxPower, 1),
        formatNumber(room.avgCurrent, 2),
    ]);

    autoTable(doc, {
        startY: cursorY,
        margin: tableMargin,
        head: [['Room', 'Energy (kWh)', 'Share', 'Avg Power (W)', 'Peak Power (W)', 'Avg Current (A)']],
        body: roomRows,
        theme: 'striped',
        headStyles: { fillColor: BRAND.primary as unknown as number[], textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.slate50 as unknown as number[] },
        styles: { fontSize: 9, cellPadding: 3 },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 10;

    // Peak Events
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.slate800);
    doc.text('Top peak events', marginX, cursorY);
    cursorY += 4;

    const peakRows = stats.peakEvents.map((event, index) => [
        String(index + 1),
        formatDateTime(event.time),
        formatNumber(event.totalPower, 0),
        formatNumber(event.volt, 1),
        formatNumber(event.temperature, 1),
        formatNumber(event.humidity, 1),
    ]);

    autoTable(doc, {
        startY: cursorY,
        margin: tableMargin,
        head: [['#', 'Time', 'Power (W)', 'Voltage (V)', 'Temp (°C)', 'Humidity (%)']],
        body: peakRows,
        theme: 'striped',
        headStyles: { fillColor: BRAND.secondary as unknown as number[], textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.slate50 as unknown as number[] },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 46 },
        },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 10;

    // Daily Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.slate800);
    doc.text('Daily breakdown', marginX, cursorY);
    cursorY += 4;

    const dailyRows = stats.dailyStats.map((day) => [
        new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        formatNumber(day.energyKWh, 2),
        formatNumber(day.avgPower, 1),
        formatNumber(day.maxPower, 1),
        formatNumber(day.avgTemp, 1),
        day.dataPoints.toLocaleString(),
    ]);

    autoTable(doc, {
        startY: cursorY,
        margin: tableMargin,
        head: [['Date', 'Energy (kWh)', 'Avg Power (W)', 'Peak Power (W)', 'Avg Temp (°C)', 'Points']],
        body: dailyRows,
        theme: 'striped',
        headStyles: { fillColor: BRAND.slate900 as unknown as number[], textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.slate50 as unknown as number[] },
        styles: { fontSize: 8.5, cellPadding: 3 },
    });

    // -----------------
    // Header + footer (all pages)
    // -----------------
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);

        if (page !== 1) {
            // Header for detail pages
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...BRAND.slate700);
            doc.text(BRAND.name, marginX, 12);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(reportTitle, pageWidth - marginX, 12, { align: 'right' });

            doc.setDrawColor(...BRAND.slate200);
            doc.line(marginX, 16, pageWidth - marginX, 16);
        }

        // Footer
        doc.setDrawColor(...BRAND.slate200);
        doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.slate500);
        doc.text(`Generated ${formatDateTime(generatedAt)}`, marginX, pageHeight - 10);
        doc.text(`${BRAND.tagline}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
    }

    const filename = `elektrum-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

export default function ReportGenerator({ sensorData }: ReportGeneratorProps) {
    const [reportType, setReportType] = useState<ReportType>('weekly');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async (type: ReportType) => {
        setIsLoading(true);
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
            setIsLoading(false);
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
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
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
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
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
