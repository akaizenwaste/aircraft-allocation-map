'use client'

import { useState, useMemo } from 'react'
import { NavBar } from '@/components/NavBar'
import { useWeatherForecasts } from '@/hooks/useWeatherForecasts'
import { WeatherImpactsTable } from '@/components/WeatherImpactsTable'

export interface WeatherFilters {
  search: string
  state: string
  weatherType: 'all' | 'snow' | 'ice' | 'both'
  minSnow: number | null
  minIce: number | null
}

export default function WeatherPage() {
  const { data, isLoading, error, refetch, isFetching } = useWeatherForecasts()
  const [showAllAirports, setShowAllAirports] = useState(false)
  const [isFetchingFromNWS, setIsFetchingFromNWS] = useState(false)
  const [filters, setFilters] = useState<WeatherFilters>({
    search: '',
    state: '',
    weatherType: 'all',
    minSnow: null,
    minIce: null,
  })

  // Get unique states from forecasts for the dropdown
  const states = useMemo(() => {
    if (!data?.forecasts) return []
    const uniqueStates = new Set(
      data.forecasts.map((f) => f.state).filter((s): s is string => s !== null)
    )
    return Array.from(uniqueStates).sort()
  }, [data?.forecasts])

  const handleFetchFromNWS = async () => {
    setIsFetchingFromNWS(true)
    try {
      const response = await fetch('/api/weather', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to fetch from NWS')
      }
      // Refetch from database after edge function completes
      await refetch()
    } catch (error) {
      console.error('Error fetching from NWS:', error)
      alert('Failed to fetch weather data from NWS. Please try again.')
    } finally {
      setIsFetchingFromNWS(false)
    }
  }

  const noData = !data?.lastFetchedAt

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Winter Weather Forecast</h1>
            <p className="text-[var(--muted-foreground)]">
              Snow and ice impacts for all stations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching || isFetchingFromNWS}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded text-sm transition-colors disabled:opacity-50"
              title="Reload from database"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isFetching ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Reload
            </button>

            <button
              onClick={handleFetchFromNWS}
              disabled={isFetching || isFetchingFromNWS}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors disabled:opacity-50"
              title="Fetch fresh data from NWS"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isFetchingFromNWS ? 'animate-spin' : ''}
              >
                <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                <line x1="8" y1="16" x2="8.01" y2="16" />
                <line x1="8" y1="20" x2="8.01" y2="20" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              {isFetchingFromNWS ? 'Fetching...' : 'Fetch from NWS'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-[300px]">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search stations..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* State Filter */}
            <div>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">All States</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Weather Type Filter */}
            <div>
              <select
                value={filters.weatherType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    weatherType: e.target.value as WeatherFilters['weatherType'],
                  })
                }
                className="px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Weather</option>
                <option value="snow">Snow Only</option>
                <option value="ice">Ice Only</option>
                <option value="both">Snow & Ice</option>
              </select>
            </div>

            {/* Min Snow Filter */}
            <div>
              <select
                value={filters.minSnow ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minSnow: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Any Snow</option>
                <option value="2">Snow 2"+</option>
                <option value="4">Snow 4"+</option>
                <option value="6">Snow 6"+</option>
                <option value="12">Snow 12"+</option>
              </select>
            </div>

            {/* Min Ice Filter */}
            <div>
              <select
                value={filters.minIce ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minIce: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Any Ice</option>
                <option value="0.25">Ice 0.25"+</option>
                <option value="0.5">Ice 0.5"+</option>
                <option value="1">Ice 1"+</option>
              </select>
            </div>

            {/* Show All Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={showAllAirports}
                onChange={(e) => setShowAllAirports(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              Show all airports
            </label>

            {/* Clear Filters */}
            {(filters.search ||
              filters.state ||
              filters.weatherType !== 'all' ||
              filters.minSnow !== null ||
              filters.minIce !== null) && (
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    state: '',
                    weatherType: 'all',
                    minSnow: null,
                    minIce: null,
                  })
                }
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Loading weather forecasts...
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Failed to load weather forecasts. Please try again.</span>
            </div>
          </div>
        ) : noData ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-[var(--muted-foreground)]"
            >
              <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
              <line x1="8" y1="16" x2="8.01" y2="16" />
              <line x1="8" y1="20" x2="8.01" y2="20" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
              <line x1="12" y1="22" x2="12.01" y2="22" />
              <line x1="16" y1="16" x2="16.01" y2="16" />
              <line x1="16" y1="20" x2="16.01" y2="20" />
            </svg>
            <h2 className="text-lg font-semibold mb-2">No Weather Data Yet</h2>
            <p className="text-[var(--muted-foreground)] mb-4">
              Weather forecasts haven&apos;t been fetched yet. Click the button below to fetch
              current forecasts from the National Weather Service.
            </p>
            <button
              onClick={handleFetchFromNWS}
              disabled={isFetchingFromNWS}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isFetchingFromNWS ? 'animate-spin' : ''}
              >
                <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                <line x1="8" y1="16" x2="8.01" y2="16" />
                <line x1="8" y1="20" x2="8.01" y2="20" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              {isFetchingFromNWS ? 'Fetching forecasts...' : 'Fetch Weather Forecasts'}
            </button>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">
              This may take a few minutes for all airports
            </p>
          </div>
        ) : data ? (
          <WeatherImpactsTable
            forecasts={data.forecasts}
            generatedAt={data.generatedAt}
            errorCount={data.errorCount}
            lastFetchedAt={data.lastFetchedAt}
            showAllAirports={showAllAirports}
            filters={filters}
          />
        ) : null}
      </main>
    </div>
  )
}
