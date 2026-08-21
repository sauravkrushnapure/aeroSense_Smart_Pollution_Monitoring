import { useHistoryData, usePrediction } from '@/hooks/useMonitoringData';
import type { StationWithLatest } from '@/types';
import { getAqiCategory, formatRelativeTime } from '@/lib/aqi';
import { AqiGauge } from './AqiGauge';
import { PollutantBreakdown } from './PollutantBreakdown';
import { PredictionChart } from './PredictionChart';
import { X, MapPin, Activity, Thermometer } from 'lucide-react';

interface StationDetailProps {
  station: StationWithLatest;
  onClose: () => void;
}

export function StationDetail({ station, onClose }: StationDetailProps) {
  const { history, loading } = useHistoryData(station.id);
  const { prediction, loading: predictionLoading } = usePrediction(station.id);
  const reading = station.latest_reading;
  const cat = reading ? getAqiCategory(reading.aqi) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700/50 overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-slate-100">{station.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Activity className={`w-3 h-3 ${station.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
              {station.status}
            </span>
            <span>·</span>
            <span>{station.city}</span>
            {reading && (
              <>
                <span>·</span>
                <span>Updated {formatRelativeTime(reading.recorded_at)}</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {reading && cat ? (
            <>
              {/* AQI Gauge */}
              <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4">
                <AqiGauge aqi={reading.aqi} size={180} />
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                  <Thermometer className="w-4 h-4 text-orange-400 mx-auto" />
                  <div className="text-lg font-bold text-slate-100 mt-1">{Math.round(reading.temperature)}°</div>
                  <div className="text-[10px] text-slate-500">Temp</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                  <Activity className="w-4 h-4 text-sky-400 mx-auto" />
                  <div className="text-lg font-bold text-slate-100 mt-1">{reading.aqi}</div>
                  <div className="text-[10px] text-slate-500">AQI</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                  <span className="text-sm font-bold mx-auto block" style={{ color: cat.color }}>
                    {cat.range}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-2.5">Range</div>
                </div>
              </div>

              {/* Prediction chart */}
              <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4">
                <PredictionChart
                  history={history}
                  stationName={station.name}
                  prediction={prediction}
                  predictionLoading={predictionLoading || loading}
                />
              </div>

              {/* Pollutant breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Pollutant Breakdown</h3>
                <PollutantBreakdown reading={reading} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Activity className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No readings available for this station.</p>
              {station.status === 'maintenance' && (
                <p className="text-xs text-amber-500/70 mt-1">Station is currently under maintenance.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
