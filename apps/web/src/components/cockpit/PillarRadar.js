import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Radar, RadarChart, PolarAngleAxis, ResponsiveContainer, PolarGrid } from 'recharts';
import { PILLAR_COLORS } from '@soloos/shared';
import { useTranslation } from 'react-i18next';
export function PillarRadar({ scores }) {
    const { t } = useTranslation();
    const data = scores.map(({ pillar, score }) => ({
        pillar,
        score,
        fullMark: 100,
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(RadarChart, { data: data, outerRadius: "78%", margin: { top: 6, right: 10, bottom: 6, left: 10 }, children: [_jsx(PolarGrid, { stroke: "#1e1e22", radialLines: false }), _jsx(PolarAngleAxis, { dataKey: "pillar", tickSize: 14, tick: ({ x, y, payload }) => {
                        const pillar = payload.value;
                        return (_jsx("text", { x: x, y: y, textAnchor: "middle", dominantBaseline: "central", fill: PILLAR_COLORS[pillar], fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", children: t(`pillars.${pillar}`) }));
                    } }), _jsx(Radar, { dataKey: "score", stroke: "#6366f1", fill: "#6366f1", fillOpacity: 0.12, strokeWidth: 1.5, dot: false })] }) }));
}
