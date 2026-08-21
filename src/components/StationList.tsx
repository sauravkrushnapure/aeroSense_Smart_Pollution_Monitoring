import type { StationWithLatest } from '@/types';
import { getAqiCategory, formatRelativeTime } from '@/lib/aqi';
import { MapPin, Activity, Wrench, WifiOff } from 'lucide-react';

interface StationListProps {
  stations: StationWithLatest[];
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
}

export function StationList({ stations, selectedStationId, onSelectStation }: StationListProps) {
  const sorted = [...stations].sort((a, b) => {
    const aAqi = a.latest_reading?.aqi ?? -1;
    const bAqi = b.latest_reading?.aqi ?? -1;
    return bAqi - aAqi;
  });

  return (
    <div className="space-y-2">
      {sorted.map((station) => {
        const reading = station.latest_reading;
        const cat = reading ? getAqiCategory(reading.aqi) : null;
        const isSelected = station.id === selectedStationId;
        const statusIcon =
          station.status === 'maintenance' ? (
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
          ) : station.status === 'offline' ? (
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          );

        return (
          <button
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className={`w-full text-left rounded-xl p-3 transition-all border ${
              isSelected
                ? 'bg-slate-800 border-sky-500/50 ring-1 ring-sky-500/30'
                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-100 truncate">{station.name}</span>
              </div>
              {statusIcon}
            </div>
            {reading ? (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-bold"
                    style={{
                      backgroundColor: `${cat?.color}20`,
                      color: cat?.color,
                      border: `1px solid ${cat?.color}40`,
                    }}
                  >
                    AQI {reading.aqi}
                  </span>
                  <span className="text-xs text-slate-400">{cat?.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{Math.round(reading.temperature)}°C</span>
                  <div className="text-[10px] text-slate-600">{formatRelativeTime(reading.recorded_at)}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">No data available</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
