/*
# Add latest_readings view and station seed function support

## Overview
Creates a database view that joins stations with their most recent reading,
so the frontend can fetch all stations + latest readings in a single query
instead of N+1 queries. Also adds a function to insert a new reading and
auto-generate an alert if AQI thresholds are crossed.

## New Objects

### View: latest_readings
- Joins stations with their most recent reading via DISTINCT ON.
- Exposes all station columns plus all reading columns (prefixed with r_).

### Function: insert_reading_and_alert(p_station_id, p_aqi, p_pm25, ...)
- Inserts a new reading into the readings table.
- If AQI >= 130, auto-generates an alert with appropriate severity.
- Returns the inserted reading row.
- SECURITY DEFINER so it can run with elevated privileges if needed.

## Security
- View is readable by anon + authenticated (single-tenant public app).
- Function is executable by anon + authenticated.
*/

-- Drop existing view if present (safe — views have no data)
DROP VIEW IF EXISTS latest_readings CASCADE;

CREATE VIEW latest_readings AS
SELECT
  s.id AS station_id,
  s.name,
  s.city,
  s.x,
  s.y,
  s.lat,
  s.lng,
  s.status,
  s.created_at,
  r.id AS reading_id,
  r.aqi,
  r.pm25,
  r.pm10,
  r.temperature,
  r.humidity,
  r.no2,
  r.so2,
  r.co,
  r.o3,
  r.recorded_at
FROM stations s
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (station_id) *
  FROM readings
  WHERE station_id = s.id
  ORDER BY station_id, recorded_at DESC
) r ON true;

GRANT SELECT ON latest_readings TO anon, authenticated;

-- Function to insert a reading and auto-generate alert if needed
DROP FUNCTION IF EXISTS insert_reading_and_alert(
  p_station_id uuid,
  p_aqi integer,
  p_pm25 numeric,
  p_pm10 numeric,
  p_temperature numeric,
  p_humidity numeric,
  p_no2 numeric,
  p_so2 numeric,
  p_co numeric,
  p_o3 numeric
);

CREATE OR REPLACE FUNCTION insert_reading_and_alert(
  p_station_id uuid,
  p_aqi integer,
  p_pm25 numeric DEFAULT 0,
  p_pm10 numeric DEFAULT 0,
  p_temperature numeric DEFAULT 0,
  p_humidity numeric DEFAULT 0,
  p_no2 numeric DEFAULT 0,
  p_so2 numeric DEFAULT 0,
  p_co numeric DEFAULT 0,
  p_o3 numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reading_id uuid;
  v_station_name text;
  v_severity text;
  v_title text;
  v_message text;
BEGIN
  -- Insert the reading
  INSERT INTO readings (station_id, aqi, pm25, pm10, temperature, humidity, no2, so2, co, o3)
  VALUES (p_station_id, p_aqi, p_pm25, p_pm10, p_temperature, p_humidity, p_no2, p_so2, p_co, p_o3)
  RETURNING id INTO v_reading_id;

  -- Get station name for alert
  SELECT name INTO v_station_name FROM stations WHERE id = p_station_id;

  -- Auto-generate alert if AQI is elevated
  IF p_aqi >= 200 THEN
    v_severity := 'danger';
    v_title := 'Hazardous Air Quality at ' || COALESCE(v_station_name, 'Unknown Station');
    v_message := 'AQI exceeded 200. Sensitive groups should remain indoors. All outdoor activity should be limited.';
  ELSIF p_aqi >= 150 THEN
    v_severity := 'warning';
    v_title := 'Unhealthy Air Quality at ' || COALESCE(v_station_name, 'Unknown Station');
    v_message := 'AQI exceeded 150. Limit prolonged outdoor exertion. Sensitive groups should avoid prolonged outdoor activity.';
  ELSIF p_aqi >= 100 THEN
    v_severity := 'info';
    v_title := 'Elevated AQI at ' || COALESCE(v_station_name, 'Unknown Station');
    v_message := 'AQI exceeded 100. Unusually sensitive people should consider reducing prolonged outdoor exertion.';
  END IF;

  IF v_severity IS NOT NULL THEN
    INSERT INTO alerts (station_id, severity, title, message, aqi_value)
    VALUES (p_station_id, v_severity, v_title, v_message, p_aqi);
  END IF;

  RETURN json_build_object(
    'reading_id', v_reading_id,
    'station_name', v_station_name,
    'aqi', p_aqi,
    'alert_severity', v_severity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_reading_and_alert(
  uuid, integer, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) TO anon, authenticated;
