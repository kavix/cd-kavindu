'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
    type: 'danger' | 'warning';
    title: string;
    message: string;
    value: number;
    limit: number;
    unit: string;
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
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const lastNotifiedRef = useRef<Map<string, number>>(new Map());
    const NOTIFICATION_COOLDOWN = 60000; // 1 minute cooldown between same notifications

    // Request notification permission
    useEffect(() => {
        if (enableBrowserNotifications && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(setNotificationPermission);
            }
        }
    }, [enableBrowserNotifications]);

    // Send browser notification with cooldown
    const sendBrowserNotification = useCallback((alert: Alert) => {
        if (notificationPermission !== 'granted') return;

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
    }, [notificationPermission]);

    // Check thresholds and generate alerts
    useEffect(() => {
        if (!sensorData) return;

        const newAlerts: Alert[] = [];

        // Voltage checks
        if (sensorData.volt > THRESHOLDS.voltage.max) {
            const alert: Alert = {
                id: 'high-voltage',
                type: 'danger',
                title: 'High Voltage Alert!',
                message: `Voltage is ${sensorData.volt.toFixed(1)}V, exceeding ${THRESHOLDS.voltage.max}V limit`,
                value: sensorData.volt,
                limit: THRESHOLDS.voltage.max,
                unit: THRESHOLDS.voltage.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        if (sensorData.volt < THRESHOLDS.voltage.min) {
            const alert: Alert = {
                id: 'low-voltage',
                type: 'warning',
                title: 'Low Voltage Warning',
                message: `Voltage is ${sensorData.volt.toFixed(1)}V, below ${THRESHOLDS.voltage.min}V minimum`,
                value: sensorData.volt,
                limit: THRESHOLDS.voltage.min,
                unit: THRESHOLDS.voltage.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        // Temperature check
        if (sensorData.temperature > THRESHOLDS.temperature.max) {
            const alert: Alert = {
                id: 'high-temperature',
                type: 'danger',
                title: 'High Temperature Alert!',
                message: `Temperature is ${sensorData.temperature.toFixed(1)}°C, exceeding ${THRESHOLDS.temperature.max}°C limit`,
                value: sensorData.temperature,
                limit: THRESHOLDS.temperature.max,
                unit: THRESHOLDS.temperature.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        // Humidity check
        if (sensorData.humidity > THRESHOLDS.humidity.max) {
            const alert: Alert = {
                id: 'high-humidity',
                type: 'warning',
                title: 'High Humidity Warning',
                message: `Humidity is ${sensorData.humidity.toFixed(1)}%, exceeding ${THRESHOLDS.humidity.max}% limit`,
                value: sensorData.humidity,
                limit: THRESHOLDS.humidity.max,
                unit: THRESHOLDS.humidity.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        // Total power check
        if (sensorData.total_power > THRESHOLDS.totalPower.max) {
            const alert: Alert = {
                id: 'high-power',
                type: 'danger',
                title: 'High Power Consumption!',
                message: `Total power is ${sensorData.total_power.toFixed(0)}W, exceeding ${THRESHOLDS.totalPower.max}W limit`,
                value: sensorData.total_power,
                limit: THRESHOLDS.totalPower.max,
                unit: THRESHOLDS.totalPower.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        // Room current checks
        if (sensorData.current1 > THRESHOLDS.current1.max) {
            const alert: Alert = {
                id: 'high-current1',
                type: 'danger',
                title: 'Living Room Current Alert!',
                message: `Living Room current is ${sensorData.current1.toFixed(2)}A, exceeding ${THRESHOLDS.current1.max}A limit`,
                value: sensorData.current1,
                limit: THRESHOLDS.current1.max,
                unit: THRESHOLDS.current1.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        if (sensorData.current2 > THRESHOLDS.current2.max) {
            const alert: Alert = {
                id: 'high-current2',
                type: 'danger',
                title: 'Bedroom Current Alert!',
                message: `Bedroom current is ${sensorData.current2.toFixed(2)}A, exceeding ${THRESHOLDS.current2.max}A limit`,
                value: sensorData.current2,
                limit: THRESHOLDS.current2.max,
                unit: THRESHOLDS.current2.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        if (sensorData.current3 > THRESHOLDS.current3.max) {
            const alert: Alert = {
                id: 'high-current3',
                type: 'danger',
                title: 'Kitchen Current Alert!',
                message: `Kitchen current is ${sensorData.current3.toFixed(2)}A, exceeding ${THRESHOLDS.current3.max}A limit`,
                value: sensorData.current3,
                limit: THRESHOLDS.current3.max,
                unit: THRESHOLDS.current3.unit,
                timestamp: new Date(),
            };
            newAlerts.push(alert);
            sendBrowserNotification(alert);
        }

        setAlerts(newAlerts);
    }, [sensorData, sendBrowserNotification]);

    // Dismiss alert
    const dismissAlert = (alertId: string) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Notification Permission Banner */}
            {enableBrowserNotifications && notificationPermission === 'default' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🔔</span>
                            <div>
                                <p className="font-medium text-blue-900">Enable Notifications</p>
                                <p className="text-sm text-blue-700">Get browser alerts when values exceed limits</p>
                            </div>
                        </div>
                        <button
                            onClick={() => Notification.requestPermission().then(setNotificationPermission)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            )}

            {/* Active Alerts */}
            {alerts.map(alert => (
                <div
                    key={alert.id}
                    className={`rounded-xl border p-4 shadow-sm animate-pulse ${alert.type === 'danger'
                            ? 'border-red-300 bg-red-50'
                            : 'border-amber-300 bg-amber-50'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">
                                {alert.type === 'danger' ? '🚨' : '⚠️'}
                            </span>
                            <div>
                                <h4 className={`font-semibold ${alert.type === 'danger' ? 'text-red-900' : 'text-amber-900'
                                    }`}>
                                    {alert.title}
                                </h4>
                                <p className={`text-sm mt-1 ${alert.type === 'danger' ? 'text-red-700' : 'text-amber-700'
                                    }`}>
                                    {alert.message}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${alert.type === 'danger'
                                            ? 'bg-red-200 text-red-800'
                                            : 'bg-amber-200 text-amber-800'
                                        }`}>
                                        Current: {alert.value.toFixed(1)} {alert.unit}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Limit: {alert.limit} {alert.unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => dismissAlert(alert.id)}
                            className={`p-1 rounded-lg transition ${alert.type === 'danger'
                                    ? 'hover:bg-red-200 text-red-600'
                                    : 'hover:bg-amber-200 text-amber-600'
                                }`}
                            title="Dismiss"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Export thresholds for use in other components
export { THRESHOLDS };
export type { Alert, SensorData as AlertSensorData };
