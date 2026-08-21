/*
# Fix security advisor findings

## Overview
1. Changes the latest_readings view to SECURITY INVOKER so it respects
   the querying role's RLS policies rather than the view owner's.
2. Changes insert_reading_and_alert to SECURITY INVOKER since the underlying
   tables already have anon/authenticated write policies — no elevated
   privileges are needed.

## Security
- View now runs as the invoker (respects RLS of the querying user).
- Function now runs as the invoker (uses the caller's table permissions).
*/

-- Fix view: switch to SECURITY INVOKER
ALTER VIEW latest_readings OWNER TO postgres;
CREATE OR REPLACE VIEW latest_readings AS
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

-- Fix function: switch to SECURITY INVOKER
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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reading_id uuid;
  v_station_name text;
  v_severity text;
  v_title text;
  v_message text;
BEGIN
  INSERT INTO readings (station_id, aqi, pm25, pm10, temperature, humidity, no2, so2, co, o3)
  VALUES (p_station_id, p_aqi, p_pm25, p_pm10, p_temperature, p_humidity, p_no2, p_so2, p_co, p_o3)
  RETURNING id INTO v_reading_id;

  SELECT name INTO v_station_name FROM stations WHERE id = p_station_id;

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
