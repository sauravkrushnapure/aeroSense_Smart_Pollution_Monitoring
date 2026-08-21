import { useState } from 'react';
import { useMonitoringData } from '@/hooks/useMonitoringData';
import { PollutionMap } from '@/components/PollutionMap';
import { StationList } from '@/components/StationList';
import { AlertFeed } from '@/components/AlertFeed';
import { StatsBar } from '@/components/StatsBar';
import { StationDetail } from '@/components/StationDetail';
import { Wind, Radio, RefreshCw, AlertOctagon, Zap } from 'lucide-react';

function App() {
  const { stations, alerts, loading, error, refresh, triggerIngestion, lastIngestTime } = useMonitoringData();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null;
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const dangerCount = alerts.filter((a) => a.severity === 'danger').length;

  const handleIngest = async () => {
    setIngesting(true);
    await triggerIngestion();
    setIngesting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">AeroSense</h1>
              <p className="text-[10px] text-slate-500 tracking-wide uppercase">Smart Pollution Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live</span>
            </div>
            {unacknowledgedAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/50 border border-red-800/50 text-xs">
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300 font-medium">{unacknowledgedAlerts.length} alerts</span>
              </div>
            )}
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              title="Trigger sensor data collection"
            >
              <Zap className={`w-3.5 h-3.5 ${ingesting ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{ingesting ? 'Collecting...' : 'Collect Data'}</span>
            </button>
            <button
              onClick={refresh}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-sky-500 animate-spin" />
            <p className="text-slate-500 text-sm mt-4">Loading monitoring data...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <StatsBar stations={stations} />

            {/* Map + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-200">Pollution Heatmap</h2>
                  <span className="text-xs text-slate-500">Click a station for details</span>
                </div>
                <PollutionMap
                  stations={stations}
                  selectedStationId={selectedStationId}
                  onSelectStation={setSelectedStationId}
                />
              </div>

              {/* Sidebar: Stations + Alerts */}
              <div className="space-y-4">
                {/* Station list */}
                <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-4">
                  <h2 className="text-sm font-semibold text-slate-200 mb-3">Monitoring Stations</h2>
                  <StationList
                    stations={stations}
                    selectedStationId={selectedStationId}
                    onSelectStation={setSelectedStationId}
                  />
                </div>

                {/* Alert feed */}
                <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-200">Recent Alerts</h2>
                    {dangerCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-[10px] text-red-300 font-medium">
                        {dangerCount} critical
                      </span>
                    )}
                  </div>
                  <AlertFeed alerts={alerts} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-600">
          AeroSense · Real-time air quality monitoring · Data updates every 30 seconds
          {lastIngestTime && (
            <span className="block sm:inline sm:ml-2 text-slate-700">
              · Last collection: {new Date(lastIngestTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </footer>

      {/* Station detail drawer */}
      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={() => setSelectedStationId(null)}
        />
      )}
    </div>
  );
}

export default App;
