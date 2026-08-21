import type { Alert } from '@/types';
import { formatRelativeTime } from '@/lib/aqi';
import { AlertTriangle, Info, ShieldAlert, Bell } from 'lucide-react';

interface AlertFeedProps {
  alerts: Alert[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Bell className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {alerts.map((alert) => {
        const config =
          alert.severity === 'danger'
            ? {
                icon: ShieldAlert,
                bg: 'bg-red-950/40',
                border: 'border-red-800/50',
                iconColor: 'text-red-400',
                titleColor: 'text-red-300',
              }
            : alert.severity === 'warning'
              ? {
                  icon: AlertTriangle,
                  bg: 'bg-amber-950/40',
                  border: 'border-amber-800/50',
                  iconColor: 'text-amber-400',
                  titleColor: 'text-amber-300',
                }
              : {
                  icon: Info,
                  bg: 'bg-sky-950/40',
                  border: 'border-sky-800/50',
                  iconColor: 'text-sky-400',
                  titleColor: 'text-sky-300',
                };

        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`rounded-xl p-3 border ${config.bg} ${config.border} transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${config.titleColor}`}>{alert.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatRelativeTime(alert.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.message}</p>
                {alert.aqi_value && (
                  <span className="inline-block mt-1.5 text-[10px] font-mono text-slate-500">
                    AQI: {alert.aqi_value}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
