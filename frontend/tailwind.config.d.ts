declare const _default: {
    content: string[];
    theme: {
        extend: {
            fontFamily: {
                sans: [string, string, string, string, string, string, string, string, string];
            };
            fontSize: {
                display: [string, {
                    lineHeight: string;
                    letterSpacing: string;
                    fontWeight: string;
                }];
                'display-sm': [string, {
                    lineHeight: string;
                    letterSpacing: string;
                    fontWeight: string;
                }];
            };
            colors: {
                surface: string;
                panel: string;
                card: string;
                elevated: string;
                border: string;
                accent: string;
                accentHover: string;
                accentSoft: string;
                textPrimary: string;
                textSecondary: string;
                textMuted: string;
            };
            boxShadow: {
                glow: string;
                panel: string;
                insetShine: string;
            };
            backgroundImage: {
                grid: string;
            };
            spacing: {
                18: string;
            };
        };
    };
    plugins: any[];
};
export default _default;
