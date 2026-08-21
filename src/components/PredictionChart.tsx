import { useMemo } from 'react';
import type { Reading } from '@/types';
import type { PredictionResult } from '@/hooks/useMonitoringData';
import { getAqiCategory, formatTime } from '@/lib/aqi';
import { TrendingUp, Clock } from 'lucide-react';

interface PredictionChartProps {
  history: Reading[];
  stationName: string;
  prediction: PredictionResult | null;
  predictionLoading: boolean;
}

export function PredictionChart({
  history,
  stationName,
  prediction,
  predictionLoading,
}: PredictionChartProps) {
  const { combinedData, maxVal, minVal } = useMemo(() => {
    const historyData = history.slice(-24).map((r) => ({
      label: formatTime(r.recorded_at),
      value: r.aqi,
      isPrediction: false,
    }));

    const predictionData = prediction
      ? prediction.predictions.map((p) => ({
          label: `+${p.hour}h`,
          value: p.aqi,
          isPrediction: true,
        }))
      : [];

    const combined = [...historyData, ...predictionData];
    const allVals = combined.map((d) => d.value);
    if (allVals.length === 0) {
      return { combinedData: combined, maxVal: 100, minVal: 0 };
    }
    return {
      combinedData: combined,
      maxVal: Math.max(...allVals) * 1.15,
      minVal: Math.max(0, Math.min(...allVals) * 0.85),
    };
  }, [history, prediction]);

  if (history.length < 2 && !prediction) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Not enough data for predictions</p>
      </div>
    );
  }

  if (predictionLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-sky-500 animate-spin mb-2" />
        <p className="text-sm">Computing forecast...</p>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const xStep = chartW / Math.max(1, combinedData.length - 1);

  const points = combinedData.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y, ...d };
  });

  const historyPoints = points.filter((p) => !p.isPrediction);
  const predictionPoints = points.filter((p) => p.isPrediction);
  const connectionPoint = historyPoints[historyPoints.length - 1];

  const historyPath = historyPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const predictionPath = [connectionPoint, ...predictionPoints]
    .filter((p) => p !== undefined)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath =
    historyPoints.length > 0
      ? `${historyPath} L ${historyPoints[historyPoints.length - 1]?.x} ${padding.top + chartH} L ${historyPoints[0]?.x} ${padding.top + chartH} Z`
      : '';

  const lastPrediction = predictionPoints[predictionPoints.length - 1];
  const predColor = prediction?.final_prediction_color ?? '#a855f7';
  const currentAqi = historyPoints[historyPoints.length - 1]?.value ?? 0;
  const trend = prediction?.trend ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-medium text-slate-200">AQI Forecast · {stationName}</span>
        </div>
        {prediction && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Next {prediction.hours}h:</span>
            <span className="font-bold" style={{ color: predColor }}>
              {prediction.final_prediction_aqi}
            </span>
            <span className={`flex items-center gap-0.5 ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
            </span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            y1={padding.top + chartH * t}
            x2={width - padding.right}
            y2={padding.top + chartH * t}
            stroke="#334155"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((t) => {
          const val = Math.round(maxVal - (maxVal - minVal) * t);
          return (
            <text
              key={t}
              x={padding.left - 8}
              y={padding.top + chartH * t + 4}
              textAnchor="end"
              className="fill-slate-500"
              style={{ fontSize: 10 }}
            >
              {val}
            </text>
          );
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#aqiGradient)" />}

        {/* History line */}
        {historyPath && (
          <path d={historyPath} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* Prediction line (dashed) */}
        {predictionPath && (
          <path
            d={predictionPath}
            fill="none"
            stroke={predColor}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )}

        {/* Divider between history and prediction */}
        {connectionPoint && predictionPoints.length > 0 && (
          <line
            x1={connectionPoint.x}
            y1={padding.top}
            x2={connectionPoint.x}
            y2={padding.top + chartH}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}

        {/* Points */}
        {historyPoints.map((p, i) => (
          <circle key={`h-${i}`} cx={p.x} cy={p.y} r={2.5} fill="#0ea5e9" />
        ))}
        {predictionPoints.map((p, i) => (
          <circle
            key={`p-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={predColor}
            stroke="#0f172a"
            strokeWidth={1}
          />
        ))}

        {/* X-axis labels */}
        {points.filter((_, i) => i % 6 === 0).map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 9 }}
          >
            {p.label}
          </text>
        ))}

        {/* "Now" label */}
        {connectionPoint && predictionPoints.length > 0 && (
          <text
            x={connectionPoint.x}
            y={padding.top - 6}
            textAnchor="middle"
            className="fill-slate-400 font-medium"
            style={{ fontSize: 9 }}
          >
            Now
          </text>
        )}
      </svg>

      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-sky-500 rounded" /> Historical (24h)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: predColor, opacity: 0.7 }} />
          Predicted ({prediction?.hours ?? 6}h)
        </span>
        {prediction && (
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> Server-side forecast
          </span>
        )}
      </div>
    </div>
  );
}
