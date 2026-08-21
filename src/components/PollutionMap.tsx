import { useMemo, useState } from 'react';
import type { StationWithLatest } from '@/types';
import { getAqiCategory } from '@/lib/aqi';

interface PollutionMapProps {
  stations: StationWithLatest[];
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
}

interface GridCell {
  x: number;
  y: number;
  aqi: number;
}

export function PollutionMap({ stations, selectedStationId, onSelectStation }: PollutionMapProps) {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  const grid = useMemo<GridCell[]>(() => {
    const gridSize = 40;
    const cells: GridCell[] = [];
    const activeStations = stations.filter((s) => s.latest_reading);

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const px = (gx / (gridSize - 1)) * 100;
        const py = (gy / (gridSize - 1)) * 100;

        let totalWeight = 0;
        let weightedAqi = 0;

        for (const s of activeStations) {
          if (!s.latest_reading) continue;
          const dx = px - Number(s.x);
          const dy = py - Number(s.y);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.01) {
            weightedAqi = s.latest_reading.aqi;
            totalWeight = 1;
            break;
          }
          const weight = 1 / (dist * dist);
          totalWeight += weight;
          weightedAqi += weight * s.latest_reading.aqi;
        }

        if (totalWeight > 0) {
          cells.push({ x: px, y: py, aqi: Math.round(weightedAqi / totalWeight) });
        }
      }
    }
    return cells;
  }, [stations]);

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/50 shadow-2xl">
      {/* Heatmap layer */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        {grid.map((cell, i) => {
          const cat = getAqiCategory(cell.aqi);
          const opacity = Math.min(0.85, 0.25 + (cell.aqi / 300) * 0.6);
          return (
            <rect
              key={i}
              x={cell.x - 2.5}
              y={cell.y - 2.5}
              width={5}
              height={5}
              fill={cat.color}
              opacity={opacity}
              filter="url(#blur)"
            />
          );
        })}
      </svg>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
      />

      {/* Station markers */}
      {stations.map((station) => {
        const reading = station.latest_reading;
        const cat = reading ? getAqiCategory(reading.aqi) : null;
        const isSelected = station.id === selectedStationId;
        const isHovered = station.id === hoveredStation;

        return (
          <button
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            onMouseEnter={() => setHoveredStation(station.id)}
            onMouseLeave={() => setHoveredStation(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group transition-transform"
            style={{
              left: `${station.x}%`,
              top: `${station.y}%`,
              zIndex: isSelected || isHovered ? 20 : 10,
            }}
          >
            {/* Pulse ring */}
            {reading && station.status === 'active' && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-40"
                style={{ backgroundColor: cat?.color }}
              />
            )}
            {/* Marker dot */}
            <span
              className={`relative block rounded-full border-2 border-white shadow-lg transition-all ${
                isSelected ? 'w-5 h-5' : 'w-3.5 h-3.5'
              } ${isHovered ? 'scale-125' : ''}`}
              style={{
                backgroundColor: reading ? cat?.color : '#64748b',
              }}
            />
            {/* Tooltip */}
            {(isHovered || isSelected) && reading && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-14 whitespace-nowrap bg-slate-950/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700 pointer-events-none">
                <div className="font-semibold">{station.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat?.color }}
                  />
                  <span>AQI {reading.aqi} · {cat?.label}</span>
                </div>
              </div>
            )}
          </button>
        );
      })}

      {/* City label */}
      <div className="absolute top-3 left-4 text-slate-400 text-xs font-medium tracking-wider uppercase">
        Metro City · Live Pollution Map
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap gap-2 text-[10px]">
        {[
          { label: 'Good', color: '#22c55e' },
          { label: 'Moderate', color: '#eab308' },
          { label: 'Unhealthy*', color: '#f97316' },
          { label: 'Unhealthy', color: '#ef4444' },
          { label: 'Very Unhealthy', color: '#a855f7' },
          { label: 'Hazardous', color: '#7f1d1d' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1 bg-slate-950/60 rounded px-1.5 py-0.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
