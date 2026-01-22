export type ChangeDirection = 'up' | 'down' | 'new' | null

export interface ForecastChange {
  snowAmount: ChangeDirection
  snowTiming: ChangeDirection
  iceAmount: ChangeDirection
  iceTiming: ChangeDirection
}

export interface AirportWeatherForecast {
  iataCode: string
  state: string | null
  country: 'US'
  // Snow accumulation range
  snowInchesLow: number | null
  snowInchesHigh: number | null
  snowStartTime: string | null // ISO 8601
  snowEndTime: string | null
  // Ice accumulation range
  iceInchesLow: number | null
  iceInchesHigh: number | null
  iceStartTime: string | null
  iceEndTime: string | null
  forecastGeneratedAt: string
  fetchedAt: string
  error: string | null
  // Change tracking (comparing high values)
  prevSnowInchesLow: number | null
  prevSnowInchesHigh: number | null
  prevIceInchesLow: number | null
  prevIceInchesHigh: number | null
  prevSnowStartTime: string | null
  prevIceStartTime: string | null
  changes: ForecastChange
}

export interface WeatherApiResponse {
  forecasts: AirportWeatherForecast[]
  generatedAt: string
  errorCount: number
  lastFetchedAt: string | null
}
