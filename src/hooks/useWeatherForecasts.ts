'use client'

import { useQuery } from '@tanstack/react-query'
import type { WeatherApiResponse, AirportWeatherForecast } from '@/types/weather'

const STALE_TIME = 1000 * 60 * 30 // 30 minutes

async function fetchWeatherForecasts(): Promise<WeatherApiResponse> {
  const response = await fetch('/api/weather')
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecasts')
  }
  return response.json()
}

export function useWeatherForecasts() {
  return useQuery({
    queryKey: ['weather-forecasts'],
    queryFn: fetchWeatherForecasts,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false, // Respect NWS rate limits
  })
}

export function useWinterWeatherImpacts() {
  const query = useWeatherForecasts()

  const impactedAirports: AirportWeatherForecast[] = query.data?.forecasts.filter(
    (f) =>
      !f.error &&
      (f.snowInches !== null || f.iceInches !== null)
  ) ?? []

  return {
    ...query,
    impactedAirports,
  }
}
