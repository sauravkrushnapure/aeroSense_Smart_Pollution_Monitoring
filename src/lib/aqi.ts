import type { AqiCategory } from '@/types';

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) {
    return {
      label: 'Good',
      color: '#22c55e',
      textColor: '#14532d',
      range: '0-50',
      description: 'Air quality is satisfactory and poses little or no risk.',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      color: '#eab308',
      textColor: '#713f12',
      range: '51-100',
      description: 'Acceptable, but unusually sensitive people should consider limiting exertion.',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      color: '#f97316',
      textColor: '#7c2d12',
      range: '101-150',
      description: 'Sensitive groups may experience health effects. The general public is less likely to be affected.',
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      color: '#ef4444',
      textColor: '#7f1d1d',
      range: '151-200',
      description: 'Some members of the general public may experience health effects.',
    };
  }
  if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      color: '#a855f7',
      textColor: '#581c87',
      range: '201-300',
      description: 'Health alert: the risk of health effects is increased for everyone.',
    };
  }
  return {
    label: 'Hazardous',
    color: '#7f1d1d',
    textColor: '#fef2f2',
    range: '301+',
    description: 'Health warning of emergency conditions: everyone is more likely to be affected.',
  };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function predictNextValue(history: number[], hoursAhead: number): number[] {
  if (history.length < 2) return history;

  const predictions: number[] = [];
  const n = history.length;

  // Simple linear regression
  const xs = history.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = history.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (history[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Detect daily cycle (last 24 values if available)
  const cycleLen = Math.min(24, Math.floor(n / 2));
  let cycleAmplitude = 0;
  let cyclePhase = 0;
  if (cycleLen >= 4) {
    let sumAmp = 0;
    for (let i = cycleLen; i < n; i++) {
      const cyclic = history[i] - history[i - cycleLen];
      sumAmp += cyclic;
    }
    cycleAmplitude = sumAmp / (n - cycleLen);
  }

  for (let h = 1; h <= hoursAhead; h++) {
    const baseVal = slope * (n - 1 + h) + intercept;
    const cyclicAdj = cycleAmplitude * Math.sin((h * 2 * Math.PI) / cycleLen);
    const noise = (Math.random() - 0.5) * Math.abs(baseVal) * 0.05;
    predictions.push(Math.max(0, Math.round(baseVal + cyclicAdj + noise)));
  }

  return predictions;
}
