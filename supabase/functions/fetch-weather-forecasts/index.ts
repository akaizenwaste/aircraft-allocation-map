import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const NWS_BASE_URL = "https://api.weather.gov"
const USER_AGENT = "aircraft-allocation-map/1.0 (contact@example.com)"
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 100

// Forecast window cutoff - only include periods through this date
// Set to end of Monday 1/26/2026 (midnight Tuesday)
const FORECAST_CUTOFF = new Date("2026-01-27T00:00:00Z")

// In-memory cache for gridpoints (lives for duration of function execution)
const gridpointCache: Record<string, string> = {}

interface Airport {
  iata_code: string
  lat: number
  lng: number
  state: string | null
}

interface NWSPointResponse {
  properties: {
    forecast: string
  }
}

interface NWSForecastPeriod {
  startTime: string
  endTime: string
  shortForecast: string
  detailedForecast: string
}

interface NWSForecastResponse {
  properties: {
    generatedAt: string
    periods: NWSForecastPeriod[]
  }
}

interface AccumulationRange {
  low: number
  high: number
}

// Regex patterns for detecting precipitation types
const SNOW_PATTERN = /snow|blizzard|flurries|wintry mix/i
const ICE_PATTERN = /freezing rain|ice pellets|sleet|freezing drizzle|ice storm/i

// Snow-specific accumulation patterns - returns { low, high }
const SNOW_ACCUMULATION_PATTERNS: Array<{
  pattern: RegExp
  handler: (m: RegExpMatchArray) => AccumulationRange
}> = [
  // "snow accumulation of 2 to 4 inches" or "new snow accumulation of 2 to 4 inches"
  {
    pattern: /(?:new\s+)?snow\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  // "total snow accumulation of around 3 inches"
  {
    pattern: /(?:total\s+)?snow\s+accumulation[^.]*?around\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  // "snow accumulation up to 3 inches"
  {
    pattern: /snow\s+accumulation[^.]*?up\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },
  // "snow accumulation of 3 inches" or "snow accumulation around 3 inches"
  {
    pattern: /snow\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  // "2 to 4 inches of snow"
  {
    pattern: /(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  // "around 3 inches of snow"
  {
    pattern: /around\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  // "up to 3 inches of snow"
  {
    pattern: /up\s*to\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },
  // "less than 1 inch of snow" or "less than an inch of snow"
  {
    pattern: /less\s+than\s+(?:half\s+an?\s+)?inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: () => ({ low: 0, high: 0.5 })
  },
  {
    pattern: /less\s+than\s+(?:1|one|an?)\s+inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: () => ({ low: 0, high: 1 })
  },
  // "3 inches of snow"
  {
    pattern: /(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+(?:new\s+)?snow/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  // "light snow accumulation"
  {
    pattern: /light\s+snow\s+accumulation/i,
    handler: () => ({ low: 0, high: 1 })
  },
]

// Ice-specific accumulation patterns - returns { low, high }
const ICE_ACCUMULATION_PATTERNS: Array<{
  pattern: RegExp
  handler: (m: RegExpMatchArray) => AccumulationRange
}> = [
  // "less than half an inch" patterns
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?less\s+than\s+(?:a\s+)?half\s*(?:an?\s+)?inch/i,
    handler: () => ({ low: 0, high: 0.5 })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?less\s+than\s+(?:1|one|an?)\s+inch/i,
    handler: () => ({ low: 0, high: 1 })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?less\s+than\s+(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },

  // Fraction patterns
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?(?:one\s+)?quarter\s*(?:of\s+an?\s+)?inch/i,
    handler: () => ({ low: 0.25, high: 0.25 })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?(?:one\s+)?tenth\s*(?:of\s+an?\s+)?inch/i,
    handler: () => ({ low: 0.1, high: 0.1 })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?(?:one\s+)?half\s*(?:of\s+an?\s+)?inch/i,
    handler: () => ({ low: 0.5, high: 0.5 })
  },

  // Numeric range patterns
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?around\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?up\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },
  {
    pattern: /(?:new\s+)?ice\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },

  // "freezing rain accumulation" patterns
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?less\s+than\s+(?:a\s+)?half\s*(?:an?\s+)?inch/i,
    handler: () => ({ low: 0, high: 0.5 })
  },
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?less\s+than\s+(?:1|one|an?)\s+inch/i,
    handler: () => ({ low: 0, high: 1 })
  },
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?around\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?up\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },
  {
    pattern: /(?:new\s+)?freezing\s+rain\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },

  // "X inches of ice" patterns
  {
    pattern: /(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+ice/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  {
    pattern: /around\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+ice/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
  {
    pattern: /up\s*to\s*(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+ice/i,
    handler: (m) => ({ low: 0, high: parseFloat(m[1]) })
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*inch(?:es)?\s+of\s+ice/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },

  // "total ice accumulation" patterns
  {
    pattern: /total\s+(?:ice|freezing\s+rain)\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[2]) })
  },
  {
    pattern: /total\s+(?:ice|freezing\s+rain)\s+accumulation[^.]*?(\d+(?:\.\d+)?)\s*inch/i,
    handler: (m) => ({ low: parseFloat(m[1]), high: parseFloat(m[1]) })
  },
]

function extractSnowAccumulation(text: string): AccumulationRange | null {
  for (const { pattern, handler } of SNOW_ACCUMULATION_PATTERNS) {
    const match = text.match(pattern)
    if (match) return handler(match)
  }
  return null
}

function extractIceAccumulation(text: string): AccumulationRange | null {
  for (const { pattern, handler } of ICE_ACCUMULATION_PATTERNS) {
    const match = text.match(pattern)
    if (match) return handler(match)
  }
  return null
}

function findEventWindow(
  periods: NWSForecastPeriod[],
  detector: (text: string) => boolean,
  extractor: (text: string) => AccumulationRange | null
): {
  startTime: string
  endTime: string
  lowAccumulation: number | null
  highAccumulation: number | null
} | null {
  let startTime: string | null = null
  let endTime: string | null = null
  let totalLow: number | null = null
  let totalHigh: number | null = null

  for (const period of periods) {
    // Skip periods that start after the forecast cutoff
    const periodStart = new Date(period.startTime)
    if (periodStart >= FORECAST_CUTOFF) continue

    const forecast = `${period.shortForecast} ${period.detailedForecast}`
    if (detector(forecast)) {
      if (!startTime) startTime = period.startTime
      endTime = period.endTime
      const accum = extractor(forecast)
      if (accum !== null) {
        // Sum accumulations across all periods in the event window
        totalLow = (totalLow ?? 0) + accum.low
        totalHigh = (totalHigh ?? 0) + accum.high
      }
    }
  }

  if (!startTime || !endTime) return null
  return { startTime, endTime, lowAccumulation: totalLow, highAccumulation: totalHigh }
}

async function fetchWithRetry<T>(url: string, maxRetries = 3): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      })

      if (response.status === 404) throw new Error("Location outside NWS coverage")
      if (!response.ok) throw new Error(`NWS API error: ${response.status}`)

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (lastError.message.includes("outside NWS coverage")) throw lastError
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error("Failed to fetch from NWS")
}

async function getGridpoint(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (gridpointCache[key]) return gridpointCache[key]

  const url = `${NWS_BASE_URL}/points/${lat.toFixed(4)},${lng.toFixed(4)}`
  const data = await fetchWithRetry<NWSPointResponse>(url)
  gridpointCache[key] = data.properties.forecast
  return data.properties.forecast
}

async function fetchForecast(airport: Airport): Promise<{
  airport_iata: string
  snow_inches_low: number | null
  snow_inches_high: number | null
  snow_start_time: string | null
  snow_end_time: string | null
  ice_inches_low: number | null
  ice_inches_high: number | null
  ice_start_time: string | null
  ice_end_time: string | null
  nws_generated_at: string
  error: string | null
}> {
  try {
    const forecastUrl = await getGridpoint(airport.lat, airport.lng)
    const forecast = await fetchWithRetry<NWSForecastResponse>(forecastUrl)

    const snow = findEventWindow(forecast.properties.periods, (t) => SNOW_PATTERN.test(t), extractSnowAccumulation)
    const ice = findEventWindow(forecast.properties.periods, (t) => ICE_PATTERN.test(t), extractIceAccumulation)

    return {
      airport_iata: airport.iata_code,
      snow_inches_low: snow?.lowAccumulation ?? null,
      snow_inches_high: snow?.highAccumulation ?? null,
      snow_start_time: snow?.startTime ?? null,
      snow_end_time: snow?.endTime ?? null,
      ice_inches_low: ice?.lowAccumulation ?? null,
      ice_inches_high: ice?.highAccumulation ?? null,
      ice_start_time: ice?.startTime ?? null,
      ice_end_time: ice?.endTime ?? null,
      nws_generated_at: forecast.properties.generatedAt,
      error: null,
    }
  } catch (error) {
    return {
      airport_iata: airport.iata_code,
      snow_inches_low: null,
      snow_inches_high: null,
      snow_start_time: null,
      snow_end_time: null,
      ice_inches_low: null,
      ice_inches_high: null,
      ice_start_time: null,
      ice_end_time: null,
      nws_generated_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Verify this is a cron call or authorized request
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all airports
    const { data: airports, error: airportsError } = await supabase
      .from("airports")
      .select("iata_code, lat, lng, state")
      .order("iata_code")

    if (airportsError) {
      throw new Error(`Failed to fetch airports: ${airportsError.message}`)
    }

    if (!airports || airports.length === 0) {
      return new Response(
        JSON.stringify({ message: "No airports found", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Process in batches
    const results: Awaited<ReturnType<typeof fetchForecast>>[] = []

    for (let i = 0; i < airports.length; i += BATCH_SIZE) {
      const batch = airports.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(fetchForecast))
      results.push(...batchResults)

      if (i + BATCH_SIZE < airports.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
      }
    }

    // Insert all forecasts
    const { error: insertError } = await supabase
      .from("weather_forecasts")
      .insert(results)

    if (insertError) {
      throw new Error(`Failed to insert forecasts: ${insertError.message}`)
    }

    // Cleanup old forecasts
    const { data: cleanupResult } = await supabase.rpc("cleanup_old_weather_forecasts")

    const errorCount = results.filter((r) => r.error !== null).length

    return new Response(
      JSON.stringify({
        message: "Weather forecasts fetched successfully",
        totalAirports: airports.length,
        successCount: airports.length - errorCount,
        errorCount,
        cleanedUp: cleanupResult ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error fetching weather forecasts:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
