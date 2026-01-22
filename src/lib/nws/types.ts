// NWS API response types
// https://www.weather.gov/documentation/services-web-api

export interface NWSPointResponse {
  properties: {
    gridId: string
    gridX: number
    gridY: number
    forecastHourly: string
    forecast: string
  }
}

export interface NWSForecastPeriod {
  number: number
  name: string
  startTime: string // ISO 8601
  endTime: string
  isDaytime: boolean
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  shortForecast: string
  detailedForecast: string
}

export interface NWSForecastResponse {
  properties: {
    updated: string
    generatedAt: string
    periods: NWSForecastPeriod[]
  }
}

export interface GridpointCache {
  [key: string]: {
    forecastHourlyUrl: string
    fetchedAt: number
  }
}
