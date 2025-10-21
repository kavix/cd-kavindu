'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
            </span>
        );
    }

    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            {isDark ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                    />
                </svg>
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M5.636 5.636l1.06 1.06M17.303 17.303l1.06 1.06M5.636 18.364l1.06-1.06M17.303 6.697l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
                    />
                </svg>
            )}
        </button>
    );
}
