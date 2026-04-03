'use client';
import React, { useEffect, useState } from 'react';
import styles from './EnergyPreloader.module.css';
import { Zap } from 'lucide-react';

export default function EnergyPreloader() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('INITIALIZING GRID...');

    useEffect(() => {
        const start = Date.now();
        // Setting animation to last visually for ~3 seconds
        const duration = 3000;

        const animateProgress = () => {
            const now = Date.now();
            const elapsed = now - start;

            // Calculate linear progress (0 to 100)
            const p = Math.min((elapsed / duration) * 100, 100);

            // Add a smooth easing out effect
            const easedProgress = Math.min(
                100,
                p === 100 ? 100 : 100 * (1 - Math.pow(2, -10 * (p / 100)))
            );

            setProgress(Math.round(easedProgress));

            // Dynamic text updates reflecting a SaaS/Energy system
            if (easedProgress < 25) {
                setStatus('INITIALIZING GRID...');
            } else if (easedProgress < 50) {
                setStatus('CALIBRATING VOLTAGE...');
            } else if (easedProgress < 75) {
                setStatus('CHARGING CAPACITORS...');
            } else if (easedProgress < 99) {
                setStatus('STABILIZING ENGINES...');
            } else {
                setStatus('SYSTEM READY');
            }

            if (elapsed < duration) {
                requestAnimationFrame(animateProgress);
            }
        };

        requestAnimationFrame(animateProgress);
    }, []);

    return (
        <div className={styles.preloaderContainer}>
            {/* 3D Perspective Grid Background effect */}
            <div className={styles.gridBackground}></div>

            {/* Main concentric energy core */}
            <div className={styles.loaderCore}>
                <div className={styles.aura}></div>
                <div className={`${styles.ring} ${styles.ringOuter}`}></div>
                <div className={`${styles.ring} ${styles.ringInner}`}></div>
                <div className={styles.arc}></div>

                <Zap className={styles.icon} />
            </div>

            <div className={styles.textContainer}>
                <div className={styles.progressText}>{progress}%</div>
                <div className={styles.loadingStatus}>{status}</div>
            </div>
        </div>
    );
}