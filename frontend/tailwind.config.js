export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    'sans-serif',
                ],
            },
            fontSize: {
                display: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
                'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
            },
            colors: {
                surface: '#eef2fb',
                panel: '#edf4ff',
                card: '#ffffff',
                elevated: '#f7faff',
                border: 'rgba(15, 23, 42, 0.08)',
                accent: '#3b82f6',
                accentHover: '#2563eb',
                accentSoft: 'rgba(59, 130, 246, 0.12)',
                textPrimary: '#0c1222',
                textSecondary: '#334155',
                textMuted: '#5c6b80',
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(59, 130, 246, 0.2), 0 16px 40px rgba(59, 130, 246, 0.15)',
                panel: '0 4px 12px rgba(59, 99, 160, 0.08), 0 12px 32px rgba(59, 99, 160, 0.1)',
                insetShine: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
            },
            backgroundImage: {
                grid: 'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
            },
            spacing: {
                18: '4.5rem',
            },
        },
    },
    plugins: [],
};
