'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';

type SensorData = {
    volt: number;
    current1: number;
    current2: number;
    current3: number;
    power1: number;
    power2: number;
    power3: number;
    total_power: number;
    temperature: number;
    humidity: number;
    time: string;
};

type Alert = {
    id: string;
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    value?: number;
    limit?: number;
    unit?: string;
    timestamp: Date;
};

// Configurable thresholds
const THRESHOLDS = {
    voltage: { max: 280, min: 180, unit: 'V', name: 'Voltage' },
    temperature: { max: 40, unit: '°C', name: 'Temperature' },
    humidity: { max: 85, unit: '%', name: 'Humidity' },
    totalPower: { max: 5000, unit: 'W', name: 'Total Power' },
    current1: { max: 15, unit: 'A', name: 'Living Room Current' },
    current2: { max: 15, unit: 'A', name: 'Bedroom Current' },
    current3: { max: 15, unit: 'A', name: 'Kitchen Current' },
};

type SensorAlertsProps = {
    sensorData: SensorData | null;
    enableBrowserNotifications?: boolean;
};

export default function SensorAlerts({ sensorData, enableBrowserNotifications = true }: SensorAlertsProps) {
    const lastNotifiedRef = useRef<Map<string, number>>(new Map());
    const NOTIFICATION_COOLDOWN = 60000; // 1 minute cooldown between same notifications

    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

    // Request notification permission
    useEffect(() => {
        if (enableBrowserNotifications && 'Notification' in window) {
            if (Notification.permission === 'default') {
                void Notification.requestPermission();
            }
        }
    }, [enableBrowserNotifications]);

    // Send browser notification with cooldown
    const sendBrowserNotification = useCallback((alert: Alert) => {
        if (!enableBrowserNotifications) return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const now = Date.now();
        const lastNotified = lastNotifiedRef.current.get(alert.id) || 0;

        if (now - lastNotified < NOTIFICATION_COOLDOWN) return;

        lastNotifiedRef.current.set(alert.id, now);

        const notification = new Notification(`⚠️ ${alert.title}`, {
            body: alert.message,
            icon: '/favicon.ico',
            tag: alert.id,
            requireInteraction: alert.type === 'danger',
        });

        // Auto close after 10 seconds for warnings
        if (alert.type === 'warning') {
            setTimeout(() => notification.close(), 10000);
        }
    }, [enableBrowserNotifications]);

    const alerts = useMemo(() => {
        const newAlerts: Alert[] = [];

        // Date-based alerts
        const today = new Date();
        if (today.getDate() <= 10) {
            newAlerts.push({
                id: 'bill-reminder',
                type: 'info',
                title: 'Friendly Reminder',
                message: 'Pay electricity bills before the 10th of every month to avoid late fees.',
                timestamp: today,
            });
        }

        // General tips
        newAlerts.push({
            id: 'energy-saving-tip',
            type: 'info',
            title: 'Energy Saving Tip',
            message: 'Turn off lights and fans when leaving a room to conserve energy.',
            timestamp: today,
        });

        if (!sensorData) {
            return newAlerts;
        }

        const sensorTimestamp = new Date(sensorData.time);

        // Voltage checks
        if (sensorData.volt > THRESHOLDS.voltage.max) {
            newAlerts.push({
                id: 'high-voltage',
                type: 'danger',
                title: 'High Voltage Alert!',
                message: `Voltage is ${sensorData.volt.toFixed(1)}V, exceeding ${THRESHOLDS.voltage.max}V limit`,
                value: sensorData.volt,
                limit: THRESHOLDS.voltage.max,
                unit: THRESHOLDS.voltage.unit,
                timestamp: sensorTimestamp,
            });
        } else if (sensorData.volt < THRESHOLDS.voltage.min) {
            newAlerts.push({
                id: 'low-voltage',
                type: 'warning',
                title: 'Low Voltage Warning',
                message: `Voltage is ${sensorData.volt.toFixed(1)}V, below ${THRESHOLDS.voltage.min}V minimum`,
                value: sensorData.volt,
                limit: THRESHOLDS.voltage.min,
                unit: THRESHOLDS.voltage.unit,
                timestamp: sensorTimestamp,
            });
        }

        // Temperature check
        if (sensorData.temperature > THRESHOLDS.temperature.max) {
            newAlerts.push({
                id: 'high-temperature',
                type: 'danger',
                title: 'High Temperature Alert!',
                message: `Temperature is ${sensorData.temperature.toFixed(1)}°C, exceeding ${THRESHOLDS.temperature.max}°C limit`,
                value: sensorData.temperature,
                limit: THRESHOLDS.temperature.max,
                unit: THRESHOLDS.temperature.unit,
                timestamp: sensorTimestamp,
            });
        }

        // Humidity check
        if (sensorData.humidity > THRESHOLDS.humidity.max) {
            newAlerts.push({
                id: 'high-humidity',
                type: 'warning',
                title: 'High Humidity Warning',
                message: `Humidity is ${sensorData.humidity.toFixed(1)}%, exceeding ${THRESHOLDS.humidity.max}% limit`,
                value: sensorData.humidity,
                limit: THRESHOLDS.humidity.max,
                unit: THRESHOLDS.humidity.unit,
                timestamp: sensorTimestamp,
            });
        }

        // Total power check
        if (sensorData.total_power > THRESHOLDS.totalPower.max) {
            newAlerts.push({
                id: 'high-power',
                type: 'danger',
                title: 'High Power Consumption!',
                message: `Total power is ${sensorData.total_power.toFixed(0)}W, exceeding ${THRESHOLDS.totalPower.max}W limit`,
                value: sensorData.total_power,
                limit: THRESHOLDS.totalPower.max,
                unit: THRESHOLDS.totalPower.unit,
                timestamp: sensorTimestamp,
            });
        }

        // Room current checks
        if (sensorData.current1 > THRESHOLDS.current1.max) {
            newAlerts.push({
                id: 'high-current1',
                type: 'danger',
                title: 'Living Room Current Alert!',
                message: `Living Room current is ${sensorData.current1.toFixed(2)}A, exceeding ${THRESHOLDS.current1.max}A limit`,
                value: sensorData.current1,
                limit: THRESHOLDS.current1.max,
                unit: THRESHOLDS.current1.unit,
                timestamp: sensorTimestamp,
            });
        }

        if (sensorData.current2 > THRESHOLDS.current2.max) {
            newAlerts.push({
                id: 'high-current2',
                type: 'danger',
                title: 'Bedroom Current Alert!',
                message: `Bedroom current is ${sensorData.current2.toFixed(2)}A, exceeding ${THRESHOLDS.current2.max}A limit`,
                value: sensorData.current2,
                limit: THRESHOLDS.current2.max,
                unit: THRESHOLDS.current2.unit,
                timestamp: sensorTimestamp,
            });
        }

        if (sensorData.current3 > THRESHOLDS.current3.max) {
            newAlerts.push({
                id: 'high-current3',
                type: 'danger',
                title: 'Kitchen Current Alert!',
                message: `Kitchen current is ${sensorData.current3.toFixed(2)}A, exceeding ${THRESHOLDS.current3.max}A limit`,
                value: sensorData.current3,
                limit: THRESHOLDS.current3.max,
                unit: THRESHOLDS.current3.unit,
                timestamp: sensorTimestamp,
            });
        }

        return newAlerts;
    }, [sensorData]);

    useEffect(() => {
        if (!sensorData) return;
        if (!enableBrowserNotifications) return;

        for (const alert of alerts) {
            if (alert.type === 'danger' || alert.type === 'warning') {
                sendBrowserNotification(alert);
            }
        }
    }, [alerts, enableBrowserNotifications, sensorData, sendBrowserNotification]);

    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'danger': return '🔥';
            case 'warning': return '⚠️';
            case 'info': return '💡';
            default: return '🔔';
        }
    };

    const getAlertClasses = (type: Alert['type']) => {
        switch (type) {
            case 'danger':
                return 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200';
            case 'warning':
                return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200';
            case 'info':
                return 'bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-900/50 dark:border-blue-500/50 dark:text-blue-100 shadow-sm';
            default:
                return 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-500/10 dark:border-slate-500/30 dark:text-slate-200';
        }
    };

    const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

    if (!visibleAlerts.length) {
        return (
            <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="font-semibold">All Systems Normal</h3>
                <p className="text-sm text-slate-500">No alerts to show right now.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto">
            {visibleAlerts.map(alert => (
                <div key={alert.id} className={`p-3 relative rounded-lg border ${getAlertClasses(alert.type)}`}>
                    <button
                        onClick={() => setDismissedAlerts(prev => new Set(prev).add(alert.id))}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Dismiss"
                        aria-label="Dismiss alert"
                    >
                        <svg className="w-4 h-4 opacity-50 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-start">
                        <div className="text-xl mr-3">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 pr-6">
                            <h4 className="font-bold">{alert.title}</h4>
                            <p className="text-sm">{alert.message}</p>
                            <p suppressHydrationWarning className="mt-1 text-xs opacity-70">{alert.timestamp.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Export thresholds for use in other components
export { THRESHOLDS };
export type { Alert, SensorData as AlertSensorData };
