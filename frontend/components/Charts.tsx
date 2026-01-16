/**
 * Chart Components - Gráficos simples com CSS/SVG
 */

'use client';

interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    maxValue?: number;
    height?: number;
}

export function BarChart({ data, maxValue, height = 200 }: BarChartProps) {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);

    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
        'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
    ];

    return (
        <div className="w-full" style={{ height }}>
            <div className="flex items-end justify-between h-full gap-2">
                {data.map((item, i) => {
                    const heightPercent = (item.value / max) * 100;
                    const color = item.color || colors[i % colors.length];
                    return (
                        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {item.value}
                            </span>
                            <div
                                className={`w-full rounded-t-lg transition-all duration-500 ${color}`}
                                style={{ height: `${heightPercent}%`, minHeight: item.value > 0 ? '4px' : '0' }}
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full text-center">
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface PieChartProps {
    data: { label: string; value: number; color?: string }[];
    size?: number;
    showLegend?: boolean;
}

export function PieChart({ data, size = 200, showLegend = true }: PieChartProps) {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    if (total === 0) {
        return (
            <div className="flex items-center justify-center text-gray-400" style={{ width: size, height: size }}>
                Sem dados
            </div>
        );
    }

    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#6366F1', '#EF4444', '#F97316'
    ];

    // Calcular segmentos
    let currentAngle = 0;
    const segments = data.map((item, i) => {
        const angle = (item.value / total) * 360;
        const segment = {
            ...item,
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
            color: item.color || colors[i % colors.length],
            percent: ((item.value / total) * 100).toFixed(1)
        };
        currentAngle += angle;
        return segment;
    });

    // Converter ângulos para coordenadas SVG
    const getCoordinates = (angle: number, radius: number) => {
        const radians = (angle - 90) * (Math.PI / 180);
        return {
            x: radius + radius * Math.cos(radians),
            y: radius + radius * Math.sin(radians)
        };
    };

    const radius = size / 2;
    const innerRadius = radius * 0.6; // Donut

    return (
        <div className="flex flex-col md:flex-row items-center gap-4">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {segments.map((segment, i) => {
                    const startAngle = segment.startAngle;
                    const endAngle = segment.endAngle;

                    if (endAngle - startAngle >= 360) {
                        // Círculo completo
                        return (
                            <circle
                                key={i}
                                cx={radius}
                                cy={radius}
                                r={(radius + innerRadius) / 2}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={radius - innerRadius}
                            />
                        );
                    }

                    const start = getCoordinates(startAngle, radius);
                    const end = getCoordinates(endAngle, radius);
                    const startInner = getCoordinates(startAngle, innerRadius);
                    const endInner = getCoordinates(endAngle, innerRadius);
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                    const path = [
                        `M ${start.x} ${start.y}`,
                        `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
                        `L ${endInner.x} ${endInner.y}`,
                        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
                        'Z'
                    ].join(' ');

                    return (
                        <path
                            key={i}
                            d={path}
                            fill={segment.color}
                            className="transition-opacity hover:opacity-80 cursor-pointer"
                        >
                            <title>{`${segment.label}: ${segment.value} (${segment.percent}%)`}</title>
                        </path>
                    );
                })}
                {/* Centro com total */}
                <circle cx={radius} cy={radius} r={innerRadius - 5} fill="currentColor" className="text-white dark:text-gray-800" />
                <text x={radius} y={radius - 5} textAnchor="middle" className="text-lg font-bold fill-gray-900 dark:fill-white">
                    {total}
                </text>
                <text x={radius} y={radius + 15} textAnchor="middle" className="text-xs fill-gray-500">
                    Total
                </text>
            </svg>

            {showLegend && (
                <div className="flex flex-wrap gap-2 md:flex-col">
                    {segments.map((segment, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {segment.label} ({segment.percent}%)
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface LineChartProps {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
}

export function LineChart({ data, height = 150, color = '#3B82F6' }: LineChartProps) {
    if (data.length < 2) return null;

    const max = Math.max(...data.map(d => d.value), 1);
    const width = 100;
    const padding = 5;

    const points = data.map((d, i) => ({
        x: padding + (i / (data.length - 1)) * (width - 2 * padding),
        y: height - padding - (d.value / max) * (height - 2 * padding)
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div style={{ height }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {/* Área preenchida */}
                <path d={areaD} fill={color} opacity="0.1" />
                {/* Linha */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
                {/* Pontos */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={color}>
                        <title>{`${data[i].label}: ${data[i].value}`}</title>
                    </circle>
                ))}
            </svg>
        </div>
    );
}

interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    color?: string;
    showPercent?: boolean;
}

export function ProgressBar({ value, max = 100, label, color = 'bg-blue-500', showPercent = true }: ProgressBarProps) {
    const percent = Math.min((value / max) * 100, 100);

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    {showPercent && <span className="text-sm font-medium text-gray-900 dark:text-white">{percent.toFixed(0)}%</span>}
                </div>
            )}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 rounded-full ${color}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
