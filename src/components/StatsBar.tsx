import type { StationWithLatest } from '@/types';
import { getAqiCategory } from '@/lib/aqi';
import { Wind, Thermometer, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsBarProps {
  stations: StationWithLatest[];
}

export function StatsBar({ stations }: StatsBarProps) {
  const activeStations = stations.filter((s) => s.latest_reading);
  const totalStations = stations.length;
  const activeCount = stations.filter((s) => s.status === 'active').length;

  const avgAqi =
    activeStations.length > 0
      ? Math.round(activeStations.reduce((sum, s) => sum + (s.latest_reading?.aqi ?? 0), 0) / activeStations.length)
      : 0;

  const avgTemp =
    activeStations.length > 0
      ? Math.round(
          activeStations.reduce((sum, s) => sum + (s.latest_reading?.temperature ?? 0), 0) / activeStations.length,
        )
      : 0;

  const maxAqi = activeStations.reduce((max, s) => Math.max(max, s.latest_reading?.aqi ?? 0), 0);
  const maxStation = activeStations.find((s) => s.latest_reading?.aqi === maxAqi);

  const avgCat = getAqiCategory(avgAqi);
  const maxCat = getAqiCategory(maxAqi);

  const cards = [
    {
      label: 'Average AQI',
      value: avgAqi,
      sub: avgCat.label,
      icon: Wind,
      color: avgCat.color,
      trend: null,
    },
    {
      label: 'Peak AQI',
      value: maxAqi,
      sub: maxStation?.name ?? '—',
      icon: AlertTriangle,
      color: maxCat.color,
      trend: null,
    },
    {
      label: 'Avg Temperature',
      value: `${avgTemp}°`,
      sub: 'Across all stations',
      icon: Thermometer,
      color: '#f97316',
      trend: null,
    },
    {
      label: 'Active Stations',
      value: `${activeCount}/${totalStations}`,
      sub: `${totalStations - activeCount} offline/maintenance`,
      icon: Activity,
      color: '#10b981',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4 hover:border-slate-600 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">{card.label}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100">{card.value}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
