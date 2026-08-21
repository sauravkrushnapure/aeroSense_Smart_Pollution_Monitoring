import type { Reading } from '@/types';
import { Thermometer, Droplets, Wind, Cloud, Factory } from 'lucide-react';

interface PollutantBreakdownProps {
  reading: Reading;
}

interface PollutantInfo {
  key: keyof Reading;
  label: string;
  unit: string;
  icon: typeof Thermometer;
  max: number;
  color: string;
}

const pollutants: PollutantInfo[] = [
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', icon: Cloud, max: 250, color: '#f97316' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: Cloud, max: 425, color: '#ef4444' },
  { key: 'no2', label: 'NO₂', unit: 'ppb', icon: Factory, max: 200, color: '#eab308' },
  { key: 'so2', label: 'SO₂', unit: 'ppb', icon: Factory, max: 300, color: '#a855f7' },
  { key: 'co', label: 'CO', unit: 'ppm', icon: Wind, max: 30, color: '#64748b' },
  { key: 'o3', label: 'O₃', unit: 'ppb', icon: Wind, max: 200, color: '#0ea5e9' },
];

export function PollutantBreakdown({ reading }: PollutantBreakdownProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Temperature */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Thermometer className="w-3.5 h-3.5" />
          <span>Temperature</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-100">{Math.round(reading.temperature)}</span>
          <span className="text-sm text-slate-400">°C</span>
        </div>
      </div>

      {/* Humidity */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Droplets className="w-3.5 h-3.5" />
          <span>Humidity</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-100">{Math.round(reading.humidity)}</span>
          <span className="text-sm text-slate-400">%</span>
        </div>
      </div>

      {/* Pollutants */}
      {pollutants.map((p) => {
        const value = Number(reading[p.key]);
        const pct = Math.min(100, (value / p.max) * 100);
        const Icon = p.icon;
        return (
          <div
            key={p.key}
            className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
              </div>
              <span className="text-[10px] text-slate-500">{p.unit}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-xl font-bold" style={{ color: p.color }}>
                {value}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: p.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
