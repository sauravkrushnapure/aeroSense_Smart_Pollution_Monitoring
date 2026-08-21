import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionPoint {
  hour: number;
  aqi: number;
  temperature: number;
  confidence: number;
}

function predictValues(history: number[], steps: number): number[] {
  if (history.length < 2) return Array(steps).fill(history[0] ?? 0);

  const n = history.length;
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

  const cycleLen = Math.min(24, Math.floor(n / 2));
  let cycleAmplitude = 0;
  if (cycleLen >= 4) {
    let sumAmp = 0;
    for (let i = cycleLen; i < n; i++) {
      sumAmp += history[i] - history[i - cycleLen];
    }
    cycleAmplitude = sumAmp / (n - cycleLen);
  }

  const predictions: number[] = [];
  for (let h = 1; h <= steps; h++) {
    const baseVal = slope * (n - 1 + h) + intercept;
    const cyclicAdj = cycleAmplitude * Math.sin((h * 2 * Math.PI) / cycleLen);
    const noise = (Math.random() - 0.5) * Math.abs(baseVal) * 0.05;
    predictions.push(Math.max(0, Math.round(baseVal + cyclicAdj + noise)));
  }
  return predictions;
}

function getAqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#22c55e" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "#f97316" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#a855f7" };
  return { label: "Hazardous", color: "#7f1d1d" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const stationId = url.searchParams.get("station_id");
    const hours = parseInt(url.searchParams.get("hours") || "6", 10);

    if (!stationId) {
      return new Response(
        JSON.stringify({ error: "station_id parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Fetch last 48 hours of readings for this station
    const { data: readings, error } = await supabase
      .from("readings")
      .select("aqi, temperature, recorded_at")
      .eq("station_id", stationId)
      .order("recorded_at", { ascending: true })
      .limit(48);

    if (error) throw error;
    if (!readings || readings.length < 2) {
      return new Response(
        JSON.stringify({ error: "Not enough historical data for prediction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get station name
    const { data: station } = await supabase
      .from("stations")
      .select("name")
      .eq("id", stationId)
      .maybeSingle();

    const aqiHistory = readings.map((r: { aqi: number }) => r.aqi);
    const tempHistory = readings.map((r: { temperature: number }) => r.temperature);

    const aqiPredictions = predictValues(aqiHistory, hours);
    const tempPredictions = predictValues(tempHistory, hours);

    const currentAqi = aqiHistory[aqiHistory.length - 1];
    const lastPrediction = aqiPredictions[aqiPredictions.length - 1];
    const trend = lastPrediction - currentAqi;

    const predictions: PredictionPoint[] = aqiPredictions.map((aqi, i) => ({
      hour: i + 1,
      aqi,
      temperature: tempPredictions[i] ?? 0,
      confidence: Math.max(0.5, 0.95 - (i + 1) * 0.05),
    }));

    const finalCat = getAqiLabel(lastPrediction);

    return new Response(
      JSON.stringify({
        station_id: stationId,
        station_name: station?.name ?? "Unknown",
        current_aqi: currentAqi,
        predictions,
        trend,
        trend_direction: trend > 0 ? "rising" : trend < 0 ? "falling" : "stable",
        final_prediction_aqi: lastPrediction,
        final_prediction_label: finalCat.label,
        final_prediction_color: finalCat.color,
        hours,
        generated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Prediction error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
