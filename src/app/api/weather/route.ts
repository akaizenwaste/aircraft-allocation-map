import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type {
  AirportWeatherForecast,
  WeatherApiResponse,
  ChangeDirection,
  ForecastChange,
} from '@/types/weather'

const CACHE_DURATION = 300 // 5 minutes - more frequent since we're just reading from DB

interface DbForecastRow {
  airport_iata: string
  state: string | null
  snow_inches_low: number | null
  snow_inches_high: number | null
  snow_start_time: string | null
  snow_end_time: string | null
  ice_inches_low: number | null
  ice_inches_high: number | null
  ice_start_time: string | null
  ice_end_time: string | null
  nws_generated_at: string
  fetched_at: string
  error: string | null
  prev_snow_inches_low: number | null
  prev_snow_inches_high: number | null
  prev_ice_inches_low: number | null
  prev_ice_inches_high: number | null
  prev_snow_start_time: string | null
  prev_ice_start_time: string | null
}

function computeAmountChange(
  currentHigh: number | null,
  previousHigh: number | null
): ChangeDirection {
  if (currentHigh === null && previousHigh === null) return null
  if (currentHigh !== null && previousHigh === null) return 'new'
  if (currentHigh === null && previousHigh !== null) return null // Forecast removed
  if (currentHigh! > previousHigh!) return 'up'
  if (currentHigh! < previousHigh!) return 'down'
  return null
}

function computeTimingChange(
  current: string | null,
  previous: string | null
): ChangeDirection {
  if (current === null && previous === null) return null
  if (current !== null && previous === null) return 'new'
  if (current === null && previous !== null) return null

  const currentTime = new Date(current!).getTime()
  const previousTime = new Date(previous!).getTime()

  // If timing moved earlier, that's "up" (more urgent)
  // If timing moved later, that's "down" (less urgent)
  const diffHours = (previousTime - currentTime) / (1000 * 60 * 60)

  if (diffHours > 1) return 'up' // Event moved earlier by more than 1 hour
  if (diffHours < -1) return 'down' // Event moved later by more than 1 hour
  return null
}

function computeChanges(row: DbForecastRow): ForecastChange {
  return {
    snowAmount: computeAmountChange(row.snow_inches_high, row.prev_snow_inches_high),
    snowTiming: computeTimingChange(row.snow_start_time, row.prev_snow_start_time),
    iceAmount: computeAmountChange(row.ice_inches_high, row.prev_ice_inches_high),
    iceTiming: computeTimingChange(row.ice_start_time, row.prev_ice_start_time),
  }
}

function transformRow(row: DbForecastRow): AirportWeatherForecast {
  return {
    iataCode: row.airport_iata,
    state: row.state,
    country: 'US',
    snowInchesLow: row.snow_inches_low,
    snowInchesHigh: row.snow_inches_high,
    snowStartTime: row.snow_start_time,
    snowEndTime: row.snow_end_time,
    iceInchesLow: row.ice_inches_low,
    iceInchesHigh: row.ice_inches_high,
    iceStartTime: row.ice_start_time,
    iceEndTime: row.ice_end_time,
    forecastGeneratedAt: row.nws_generated_at,
    fetchedAt: row.fetched_at,
    error: row.error,
    prevSnowInchesLow: row.prev_snow_inches_low,
    prevSnowInchesHigh: row.prev_snow_inches_high,
    prevIceInchesLow: row.prev_ice_inches_low,
    prevIceInchesHigh: row.prev_ice_inches_high,
    prevSnowStartTime: row.prev_snow_start_time,
    prevIceStartTime: row.prev_ice_start_time,
    changes: computeChanges(row),
  }
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Call the database function that returns forecasts with change tracking
    const { data, error } = await supabase.rpc('get_weather_forecasts_with_changes')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch weather forecasts' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      // No forecasts yet - return empty response
      return NextResponse.json(
        {
          forecasts: [],
          generatedAt: new Date().toISOString(),
          errorCount: 0,
          lastFetchedAt: null,
        } as WeatherApiResponse,
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
          },
        }
      )
    }

    const forecasts = (data as DbForecastRow[]).map(transformRow)
    const errorCount = forecasts.filter((f) => f.error !== null).length
    const lastFetchedAt = forecasts[0]?.fetchedAt ?? null

    const response: WeatherApiResponse = {
      forecasts,
      generatedAt: new Date().toISOString(),
      errorCount,
      lastFetchedAt,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
      },
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger a manual refresh (calls the edge function)
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()

    // Get the edge function URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('fetch-weather-forecasts')

    if (error) {
      console.error('Edge function error:', error)
      return NextResponse.json(
        { error: 'Failed to trigger weather fetch' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Weather refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
