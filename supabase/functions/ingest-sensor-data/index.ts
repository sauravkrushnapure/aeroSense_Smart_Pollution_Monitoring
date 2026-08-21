import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active stations
    const { data: stations, error: stationError } = await supabase
      .from("stations")
      .select("id, name, x, y, status")
      .eq("status", "active");

    if (stationError) throw stationError;
    if (!stations || stations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active stations found", readings: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // For each station, get its last reading to build continuity
    const results: { station: string; aqi: number; alert: string | null }[] = [];

    for (const station of stations) {
      const { data: lastReading } = await supabase
        .from("readings")
        .select("aqi, temperature, humidity")
        .eq("station_id", station.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Base values — use last reading or defaults, with realistic drift
      const lastAqi = lastReading?.aqi ?? 80;
      const lastTemp = lastReading?.temperature ?? 20;

      // Simulate sensor reading: drift from last value + diurnal variation + noise
      const hourOfDay = new Date().getHours();
      const diurnalFactor = Math.sin((hourOfDay - 6) * Math.PI / 12) * 25;
      const drift = (Math.random() - 0.5) * 30;
      const aqi = Math.max(10, Math.min(300, Math.round(lastAqi + drift + diurnalFactor * 0.3)));

      const tempDrift = (Math.random() - 0.5) * 2;
      const temperature = Math.round((lastTemp + tempDrift) * 10) / 10;
      const humidity = Math.round(Math.max(20, Math.min(95, (lastReading?.humidity ?? 55) + (Math.random() - 0.5) * 10)) * 10) / 10;

      const pm25 = Math.round((aqi * 0.4 + (Math.random() * 10 - 5)) * 10) / 10;
      const pm10 = Math.round((pm25 * 1.6 + Math.random() * 8) * 10) / 10;
      const no2 = Math.round((aqi * 0.15 + Math.random() * 5) * 10) / 10;
      const so2 = Math.round((aqi * 0.08 + Math.random() * 3) * 10) / 10;
      const co = Math.round((aqi * 0.01 + Math.random() * 0.5) * 100) / 100;
      const o3 = Math.round((aqi * 0.12 + Math.random() * 6) * 10) / 10;

      // Use the RPC function to insert reading + auto-generate alert
      const { data: result, error: rpcError } = await supabase.rpc("insert_reading_and_alert", {
        p_station_id: station.id,
        p_aqi: aqi,
        p_pm25: pm25,
        p_pm10: pm10,
        p_temperature: temperature,
        p_humidity: humidity,
        p_no2: no2,
        p_so2: so2,
        p_co: co,
        p_o3: o3,
      });

      if (rpcError) {
        console.error(`Error inserting reading for ${station.name}:`, rpcError);
      }

      results.push({
        station: station.name,
        aqi,
        alert: (result as { alert_severity: string | null })?.alert_severity ?? null,
      });
    }

    return new Response(
      JSON.stringify({
        message: "Sensor data ingested successfully",
        readings: results.length,
        stations: results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Ingestion error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
