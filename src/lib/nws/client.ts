import type {
  NWSPointResponse,
  NWSForecastResponse,
  GridpointCache,
} from './types'

const NWS_BASE_URL = 'https://api.weather.gov'
const USER_AGENT = 'aircraft-allocation-map/1.0 (contact@example.com)'

// In-memory cache for gridpoint lookups (lat/lng → forecast URL)
// These rarely change, so we can cache them indefinitely
const gridpointCache: GridpointCache = {}

function getCacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places for cache key
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/geo+json',
        },
      })

      if (response.status === 404) {
        throw new Error('Location outside NWS coverage area')
      }

      if (response.status === 503 || response.status === 500) {
        throw new Error(`NWS service unavailable (${response.status})`)
      }

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry for 404s (location outside coverage)
      if (lastError.message.includes('outside NWS coverage')) {
        throw lastError
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Failed to fetch from NWS')
}

export async function getGridpoint(
  lat: number,
  lng: number
): Promise<string> {
  const cacheKey = getCacheKey(lat, lng)

  // Check cache first
  const cached = gridpointCache[cacheKey]
  if (cached) {
    return cached.forecastHourlyUrl
  }

  // Fetch from NWS
  const url = `${NWS_BASE_URL}/points/${lat.toFixed(4)},${lng.toFixed(4)}`
  const data = await fetchWithRetry<NWSPointResponse>(url)

  // Cache the result
  gridpointCache[cacheKey] = {
    forecastHourlyUrl: data.properties.forecastHourly,
    fetchedAt: Date.now(),
  }

  return data.properties.forecastHourly
}

export async function getHourlyForecast(
  forecastUrl: string
): Promise<NWSForecastResponse> {
  return fetchWithRetry<NWSForecastResponse>(forecastUrl)
}

export async function getForecastForLocation(
  lat: number,
  lng: number
): Promise<NWSForecastResponse> {
  const forecastUrl = await getGridpoint(lat, lng)
  return getHourlyForecast(forecastUrl)
}
