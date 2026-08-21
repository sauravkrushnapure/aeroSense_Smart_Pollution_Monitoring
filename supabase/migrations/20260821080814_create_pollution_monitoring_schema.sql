/*
# Smart Pollution Monitoring Schema

## Overview
Creates the data model for a smart pollution monitoring system that tracks AQI,
temperature, and other pollutants across city monitoring stations, with alerting.

## New Tables

### stations
- `id` (uuid, primary key)
- `name` (text, not null) — station display name
- `city` (text, not null) — city the station is in
- `x` (numeric) — x position on the custom map canvas (0-100)
- `y` (numeric) — y position on the custom map canvas (0-100)
- `lat` (numeric) — geographic latitude
- `lng` (numeric) — geographic longitude
- `status` (text, default 'active') — active / maintenance / offline
- `created_at` (timestamptz)

### readings
- `id` (uuid, primary key)
- `station_id` (uuid, FK to stations, cascade delete)
- `aqi` (integer) — Air Quality Index
- `pm25` (numeric) — PM2.5 µg/m³
- `pm10` (numeric) — PM10 µg/m³
- `temperature` (numeric) — temperature in °C
- `humidity` (numeric) — humidity %
- `no2` (numeric) — NO2 ppb
- `so2` (numeric) — SO2 ppb
- `co` (numeric) — CO ppm
- `o3` (numeric) — O3 ppb
- `recorded_at` (timestamptz) — when the reading was taken
- `created_at` (timestamptz)

### alerts
- `id` (uuid, primary key)
- `station_id` (uuid, FK to stations, nullable for city-wide alerts)
- `severity` (text) — info / warning / danger
- `title` (text, not null)
- `message` (text, not null)
- `aqi_value` (integer) — AQI that triggered the alert
- `acknowledged` (boolean, default false)
- `created_at` (timestamptz)

## Security
- RLS enabled on all three tables.
- This is a single-tenant public monitoring dashboard (no sign-in), so all
  CRUD policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally public/shared.

## Indexes
- `readings.station_id` and `readings.recorded_at` for time-series queries.
- `alerts.created_at` for recent-alert queries.
*/

CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT 'Metro City',
  x numeric NOT NULL,
  y numeric NOT NULL,
  lat numeric,
  lng numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stations" ON stations;
CREATE POLICY "anon_select_stations" ON stations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_stations" ON stations;
CREATE POLICY "anon_insert_stations" ON stations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_stations" ON stations;
CREATE POLICY "anon_update_stations" ON stations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_stations" ON stations;
CREATE POLICY "anon_delete_stations" ON stations FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  aqi integer NOT NULL,
  pm25 numeric NOT NULL DEFAULT 0,
  pm10 numeric NOT NULL DEFAULT 0,
  temperature numeric NOT NULL DEFAULT 0,
  humidity numeric NOT NULL DEFAULT 0,
  no2 numeric NOT NULL DEFAULT 0,
  so2 numeric NOT NULL DEFAULT 0,
  co numeric NOT NULL DEFAULT 0,
  o3 numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_readings" ON readings;
CREATE POLICY "anon_select_readings" ON readings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_readings" ON readings;
CREATE POLICY "anon_insert_readings" ON readings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_readings" ON readings;
CREATE POLICY "anon_update_readings" ON readings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_readings" ON readings;
CREATE POLICY "anon_delete_readings" ON readings FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_readings_station_id ON readings(station_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_station_recorded ON readings(station_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  aqi_value integer,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_station_id ON alerts(station_id);
