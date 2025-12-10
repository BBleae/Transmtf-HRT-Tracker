import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { formatDate, formatTime } from '../utils/helpers';
import { SimulationResult, DoseEvent } from '../../logic';
import { Activity, RotateCcw } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Scatter
} from 'recharts';

const CustomTooltip = ({ active, payload, label, t, lang }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-pink-100/50">
                <p className="text-[10px] font-medium text-gray-400 mb-0.5">
                    {formatDate(new Date(label), lang)} {formatTime(new Date(label))}
                </p>
                <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-pink-500 tracking-tight">
                        {payload[0].value.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-pink-300">pg/mL</span>
                </div>
            </div>
        );
    }
    return null;
};

const ResultChart = ({ sim, events, onPointClick }: { sim: SimulationResult | null, events: DoseEvent[], onPointClick: (e: DoseEvent) => void }) => {
    const { t, lang } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [xDomain, setXDomain] = useState<[number, number] | null>(null);
    const initializedRef = useRef(false);

    const data = useMemo(() => {
        if (!sim || sim.timeH.length === 0) return [];
        return sim.timeH.map((t, i) => ({
            time: t * 3600000, 
            conc: sim.concPGmL[i]
        }));
    }, [sim]);

    const eventPoints = useMemo(() => {
        if (!sim || events.length === 0) return [];
        
        // Map events to data points, find closest concentration from sim
        return events.map(e => {
            const timeMs = e.timeH * 3600000;
            // Find closest time in sim
            const closestIdx = sim.timeH.reduce((prev, curr, i) => 
                Math.abs(curr * 3600000 - timeMs) < Math.abs(sim.timeH[prev] * 3600000 - timeMs) ? i : prev
            , 0);
            
            return {
                time: timeMs,
                conc: sim.concPGmL[closestIdx],
                event: e
            };
        });
    }, [sim, events]);

    const { minTime, maxTime, now } = useMemo(() => {
        const n = new Date().getTime();
        if (data.length === 0) return { minTime: n, maxTime: n, now: n };
        return {
            minTime: data[0].time,
            maxTime: data[data.length - 1].time,
            now: n
        };
    }, [data]);

    // Slider helpers for quick panning (helps mobile users)
    const visibleWidth = useMemo(() => {
        if (!xDomain) return Math.max(maxTime - minTime, 1);
        return Math.max(xDomain[1] - xDomain[0], 1);
    }, [xDomain, minTime, maxTime]);
    const sliderMin = minTime;
    const sliderMax = Math.max(maxTime - visibleWidth, sliderMin);
    const sliderValue = xDomain ? xDomain[0] : minTime;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        if (Number.isNaN(v)) return;
        const start = Math.max(sliderMin, Math.min(v, sliderMax));
        const end = start + visibleWidth;
        setXDomain([start, end]);
    };

    // Initialize view: center on "now" with a reasonable window (e.g. 14 days)
    useEffect(() => {
        if (!initializedRef.current && data.length > 0) {
            const initialWindow = 14 * 24 * 3600 * 1000; // 2 weeks
            const start = Math.max(minTime, now - initialWindow / 2);
            const end = Math.min(maxTime, start + initialWindow);
            
            // Adjust if end is clamped
            const finalStart = Math.max(minTime, end - initialWindow);
            
            setXDomain([finalStart, end]);
            initializedRef.current = true;
        }
    }, [data, minTime, maxTime, now]);

    const clampDomain = (domain: [number, number]): [number, number] => {
        const width = domain[1] - domain[0];
        // Enforce min zoom (e.g. 1 day) and max zoom (total range)
        const MIN_ZOOM = 24 * 3600 * 1000;
        const MAX_ZOOM = Math.max(maxTime - minTime, MIN_ZOOM);

        let newWidth = Math.max(MIN_ZOOM, Math.min(width, MAX_ZOOM));
        let newStart = domain[0];
        let newEnd = newStart + newWidth;

        // Clamp to data bounds
        if (newStart < minTime) {
            newStart = minTime;
            newEnd = newStart + newWidth;
        }
        if (newEnd > maxTime) {
            newEnd = maxTime;
            newStart = newEnd - newWidth;
        }
        
        return [newStart, newEnd];
    };

    const zoomToDuration = (days: number) => {
        const duration = days * 24 * 3600 * 1000;
        const currentCenter = xDomain ? (xDomain[0] + xDomain[1]) / 2 : now;
        const targetCenter = (now >= minTime && now <= maxTime) ? now : currentCenter;
        
        const start = targetCenter - duration / 2;
        const end = targetCenter + duration / 2;
        setXDomain(clampDomain([start, end]));
    };

    if (!sim || sim.timeH.length === 0) return (
        <div className="h-72 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8">
            <Activity className="w-12 h-12 mb-4 text-gray-200" strokeWidth={1.5} />
            <p className="text-sm font-medium">{t('timeline.empty')}</p>
        </div>
    );
    
    return (
        <div className="bg-white p-4 pb-2 rounded-2xl border border-gray-100 relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-sm font-bold text-gray-600 tracking-tight flex items-center gap-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif' }}>
                    <Activity size={16} />
                    {t('chart.title')}
                </h2>
                
                <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
                     <button
                        onClick={() => zoomToDuration(30)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 rounded-lg hover:bg-white transition-all"
                    >
                        1M
                    </button>
                    <button
                        onClick={() => zoomToDuration(7)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 rounded-lg hover:bg-white transition-all"
                    >
                        1W
                    </button>
                    <div className="w-px h-4 bg-gray-200 self-center mx-1"></div>
                    <button 
                        onClick={() => {
                            setXDomain(clampDomain([minTime, maxTime]));
                        }}
                        className="p-1.5 text-gray-500 rounded-lg hover:bg-white transition-all"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>
            
            <div 
                ref={containerRef}
                className="h-64 w-full touch-none relative select-none"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="colorConc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f6c4d7" stopOpacity={0.18}/>
                                <stop offset="95%" stopColor="#f6c4d7" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f6f8" />
                        <XAxis 
                            dataKey="time" 
                            type="number" 
                            domain={xDomain || ['auto', 'auto']}
                            allowDataOverflow={true}
                            tickFormatter={(ms) => formatDate(new Date(ms), lang)}
                            tick={{fontSize: 10, fill: '#9aa3b1', fontWeight: 500}}
                            minTickGap={50}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis 
                            dataKey="conc"
                            tick={{fontSize: 10, fill: '#9aa3b1', fontWeight: 500}}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            content={<CustomTooltip t={t} lang={lang} />} 
                            cursor={{ stroke: '#f6c4d7', strokeWidth: 1, strokeDasharray: '4 4' }} 
                            trigger="hover"
                        />
                        <ReferenceLine x={now} stroke="#f6c4d7" strokeDasharray="3 3" />
                        <Area 
                            data={data}
                            type="monotone" 
                            dataKey="conc" 
                            stroke="#f6c4d7" 
                            strokeWidth={2} 
                            fillOpacity={0.9} 
                            fill="url(#colorConc)" 
                            isAnimationActive={false}
                            activeDot={{ r: 6, strokeWidth: 4, stroke: '#fff', fill: '#ec4899' }} 
                        />
                        <Scatter 
                            data={eventPoints} 
                            isAnimationActive={false}
                            shape={(props: any) => {
                                const { cx, cy, payload } = props;
                                // Calculate radius based on dose (min 2px, max 6px approx)
                                // Standard dose ranges: 0.5mg - 10mg
                                const dose = payload.event.doseMG;
                                const radius = Math.min(6, Math.max(2, Math.sqrt(dose) * 2));
                                
                                return (
                                    <g className="group">
                                        {/* Invisible hit target for hovering */}
                                        <circle cx={cx} cy={cy} r={1} fill="transparent" />
                                        {/* Visible dot with scale effect */}
                                        <circle 
                                            cx={cx} cy={cy} r={radius} 
                                            fill="#f6c4d7" stroke="white" strokeWidth={1.5} 
                                        />
                                    </g>
                                );
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            {/* Compact external slider for precise panning (mobile friendly) */}
            {data.length > 1 && (
                <div className="mt-2 px-2">
                    <input
                        type="range"
                        min={String(sliderMin)}
                        max={String(sliderMax)}
                        value={String(sliderValue)}
                        onChange={handleSliderChange}
                        className="w-full accent-pink-300"
                    />
                </div>
            )}
        </div>
    );
};

export default ResultChart;
