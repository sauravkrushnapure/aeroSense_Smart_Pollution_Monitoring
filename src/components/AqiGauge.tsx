import { getAqiCategory } from '@/lib/aqi';

interface AqiGaugeProps {
  aqi: number;
  label?: string;
  size?: number;
}

export function AqiGauge({ aqi, label, size = 200 }: AqiGaugeProps) {
  const cat = getAqiCategory(aqi);
  const maxAqi = 300;
  const clampedAqi = Math.min(aqi, maxAqi);
  const angle = (clampedAqi / maxAqi) * 180;
  const radius = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;

  // Arc path (semicircle from 180° to 0°)
  const arcStart = { x: cx - radius, y: cy };
  const arcEnd = { x: cx + radius, y: cy };
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Needle position
  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleLen = radius - 15;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  // Arc segments
  const segments = [
    { from: 0, to: 50, color: '#22c55e' },
    { from: 50, to: 100, color: '#eab308' },
    { from: 100, to: 150, color: '#f97316' },
    { from: 150, to: 200, color: '#ef4444' },
    { from: 200, to: 300, color: '#a855f7' },
  ];

  function describeArc(startAngle: number, endAngle: number, r: number): string {
    const start = {
      x: cx + r * Math.cos((Math.PI * (180 - startAngle)) / 180),
      y: cy - r * Math.sin((Math.PI * (180 - startAngle)) / 180),
    };
    const end = {
      x: cx + r * Math.cos((Math.PI * (180 - endAngle)) / 180),
      y: cy - r * Math.sin((Math.PI * (180 - endAngle)) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 50} viewBox={`0 0 ${size} ${size / 2 + 50}`}>
        {/* Arc segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(
              (seg.from / maxAqi) * 180,
              (seg.to / maxAqi) * 180,
              radius,
            )}
            fill="none"
            stroke={seg.color}
            strokeWidth={12}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#e2e8f0"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={8} fill="#e2e8f0" />
        <circle cx={cx} cy={cy} r={4} fill="#1e293b" />

        {/* AQI number */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: size * 0.14 }}
        >
          {aqi}
        </text>
      </svg>
      <div className="text-center -mt-2">
        <div
          className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
          style={{
            backgroundColor: `${cat.color}25`,
            color: cat.color,
            border: `1px solid ${cat.color}50`,
          }}
        >
          {label ? `${label} · ` : ''}{cat.label}
        </div>
        <p className="text-xs text-slate-500 mt-1.5 max-w-[220px]">{cat.description}</p>
      </div>
    </div>
  );
}
