/*
# Fix view security property

## Overview
Drops and recreates the latest_readings view to ensure it picks up
the default SECURITY INVOKER property (CREATE OR REPLACE does not
change the security context of an existing view).

## Security
- View runs as the invoker, respecting the querying role's RLS policies.
*/

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
