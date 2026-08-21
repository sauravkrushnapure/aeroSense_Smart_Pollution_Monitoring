export interface Station {
  id: string;
  name: string;
  city: string;
  x: number;
  y: number;
  lat: number | null;
  lng: number | null;
  status: 'active' | 'maintenance' | 'offline';
  created_at: string;
}

export interface Reading {
  id: string;
  station_id: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  recorded_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  station_id: string | null;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  aqi_value: number | null;
  acknowledged: boolean;
  created_at: string;
}

export interface StationWithLatest extends Station {
  latest_reading: Reading | null;
}

export type PollutantKey =
  | 'aqi'
  | 'pm25'
  | 'pm10'
  | 'temperature'
  | 'humidity'
  | 'no2'
  | 'so2'
  | 'co'
  | 'o3';

export interface AqiCategory {
  label: string;
  color: string;
  textColor: string;
  range: string;
  description: string;
}
