import type { NWSForecastPeriod } from './types'

// Regex patterns for detecting winter weather
const SNOW_PATTERN = /snow|blizzard|flurries|wintry mix/i
const ICE_PATTERN = /freezing rain|ice pellets|sleet|freezing drizzle|ice storm/i

// Patterns for extracting accumulation amounts
const ACCUMULATION_PATTERNS = [
  // "2 to 4 inches" → take upper bound (4)
  /(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
  // "around 1 inch" → 1
  /around\s*(\d+(?:\.\d+)?)\s*inch/i,
  // "up to 3 inches" → 3
  /up\s*to\s*(\d+(?:\.\d+)?)\s*inch/i,
  // "1-2 inches" → 2
  /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*inch/i,
  // "less than 1 inch" or "less than one inch" → 0.5 (trace)
  /less\s*than\s*(?:1|one|an?)\s*inch/i,
  // "trace" → 0.1
  /trace\s*(?:amounts?)?/i,
  // "light accumulation" → 0.5
  /light\s*accumulation/i,
  // Just "X inches" or "X inch"
  /(\d+(?:\.\d+)?)\s*inch/i,
]

interface WinterWeatherEvent {
  startTime: string
  endTime: string
  accumulation: number | null
}

function hasSnow(text: string): boolean {
  return SNOW_PATTERN.test(text)
}

function hasIce(text: string): boolean {
  return ICE_PATTERN.test(text)
}

function extractAccumulation(text: string): number | null {
  for (const pattern of ACCUMULATION_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      // Handle "less than 1 inch" / "trace"
      if (pattern.source.includes('less\\s*than')) {
        return 0.5
      }
      if (pattern.source.includes('trace')) {
        return 0.1
      }
      if (pattern.source.includes('light\\s*accumulation')) {
        return 0.5
      }

      // For range patterns, take the upper bound
      if (match[2]) {
        return parseFloat(match[2])
      }
      // For single value patterns
      if (match[1]) {
        return parseFloat(match[1])
      }
    }
  }

  return null
}

function findEventWindows(
  periods: NWSForecastPeriod[],
  detector: (text: string) => boolean
): WinterWeatherEvent | null {
  let startTime: string | null = null
  let endTime: string | null = null
  let totalAccumulation: number | null = null

  for (const period of periods) {
    const forecast = `${period.shortForecast} ${period.detailedForecast}`
    const hasEvent = detector(forecast)

    if (hasEvent) {
      // Start of event or continuing event
      if (!startTime) {
        startTime = period.startTime
      }
      endTime = period.endTime

      // Try to extract accumulation from this period
      const accum = extractAccumulation(forecast)
      if (accum !== null) {
        // Take the maximum accumulation mentioned across all periods
        if (totalAccumulation === null || accum > totalAccumulation) {
          totalAccumulation = accum
        }
      }
    }
  }

  if (!startTime || !endTime) {
    return null
  }

  return {
    startTime,
    endTime,
    accumulation: totalAccumulation,
  }
}

export interface ParsedForecast {
  snow: WinterWeatherEvent | null
  ice: WinterWeatherEvent | null
  generatedAt: string
}

export function parseForecast(
  periods: NWSForecastPeriod[],
  generatedAt: string
): ParsedForecast {
  return {
    snow: findEventWindows(periods, hasSnow),
    ice: findEventWindows(periods, hasIce),
    generatedAt,
  }
}
