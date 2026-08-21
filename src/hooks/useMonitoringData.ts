import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Station, Reading, Alert, StationWithLatest } from '@/types';

interface LatestReadingView {
  station_id: string;
  name: string;
  city: string;
  x: number;
  y: number;
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
  reading_id: string | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  recorded_at: string | null;
}

export function useMonitoringData() {
  const [stations, setStations] = useState<StationWithLatest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastIngestTime, setLastIngestTime] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);

      // Single query via the latest_readings view (replaces N+1 queries)
      const { data: viewData, error: viewError } = await supabase
        .from('latest_readings')
        .select('*')
        .order('name');

      if (viewError) throw viewError;

      const stationList: StationWithLatest[] = (viewData as LatestReadingView[]).map((row) => ({
        id: row.station_id,
        name: row.name,
        city: row.city,
        x: Number(row.x),
        y: Number(row.y),
        lat: row.lat ? Number(row.lat) : null,
        lng: row.lng ? Number(row.lng) : null,
        status: row.status as Station['status'],
        created_at: row.created_at,
        latest_reading: row.reading_id
          ? ({
              id: row.reading_id,
              station_id: row.station_id,
              aqi: row.aqi!,
              pm25: Number(row.pm25),
              pm10: Number(row.pm10),
              temperature: Number(row.temperature),
              humidity: Number(row.humidity),
              no2: Number(row.no2),
              so2: Number(row.so2),
              co: Number(row.co),
              o3: Number(row.o3),
              recorded_at: row.recorded_at!,
              created_at: row.recorded_at!,
            } as Reading)
          : null,
      }));

      setStations(stationList);

      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (alertError) throw alertError;
      setAlerts(alertData as Alert[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerIngestion = useCallback(async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/ingest-sensor-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Ingestion failed (${response.status})`);
      setLastIngestTime(new Date().toISOString());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest sensor data');
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    stations,
    alerts,
    loading,
    error,
    refresh,
    triggerIngestion,
    lastIngestTime,
  };
}

export interface PredictionResult {
  station_id: string;
  station_name: string;
  current_aqi: number;
  predictions: { hour: number; aqi: number; temperature: number; confidence: number }[];
  trend: number;
  trend_direction: string;
  final_prediction_aqi: number;
  final_prediction_label: string;
  final_prediction_color: string;
  hours: number;
  generated_at: string;
}

export function usePrediction(stationId: string | null) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setPrediction(null);
      return;
    }
    setLoading(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    fetch(`${supabaseUrl}/functions/v1/predict-pollution?station_id=${stationId}&hours=6`, {
      headers: { Authorization: `Bearer ${anonKey}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Prediction failed (${response.status})`);
        const data = await response.json();
        if (!data.predictions) throw new Error('Invalid prediction response');
        setPrediction(data as PredictionResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Prediction failed'))
      .finally(() => setLoading(false));
  }, [stationId]);

  return { prediction, loading, error };
}

export function useHistoryData(stationId: string | null) {
  const [history, setHistory] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stationId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    supabase
      .from('readings')
      .select('*')
      .eq('station_id', stationId)
      .order('recorded_at', { ascending: true })
      .limit(48)
      .then(({ data, error }) => {
        if (!error && data) {
          setHistory(data as Reading[]);
        }
        setLoading(false);
      });
  }, [stationId]);

  return { history, loading };
}
