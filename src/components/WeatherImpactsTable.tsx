'use client'

import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import type { AirportWeatherForecast, ChangeDirection } from '@/types/weather'
import { WeatherDetailDrawer } from './WeatherDetailDrawer'
import type { WeatherFilters } from '@/app/weather/page'

type SortField = 'airport' | 'state' | 'snow' | 'snowStart' | 'ice' | 'iceStart'
type SortDirection = 'asc' | 'desc'

interface WeatherImpactsTableProps {
  forecasts: AirportWeatherForecast[]
  generatedAt: string
  errorCount: number
  lastFetchedAt: string | null
  showAllAirports?: boolean
  filters?: WeatherFilters
}

function formatTime(isoTime: string | null): string {
  if (!isoTime) return '-'
  const dt = DateTime.fromISO(isoTime)
  return dt.toFormat('EEE h:mm a')
}

function formatRange(low: number | null, high: number | null): string {
  if (low === null || high === null) return '-'
  if (low === high) return `${high}"`
  return `${low}-${high}"`
}

function ChangeIndicator({ change, label }: { change: ChangeDirection; label?: string }) {
  if (!change) return null

  if (change === 'new') {
    return (
      <span className="ml-1 text-xs text-purple-400" title="New forecast">
        NEW
      </span>
    )
  }

  if (change === 'up') {
    return (
      <span className="ml-1 text-red-400" title={label || 'Increased'}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="inline"
        >
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      </span>
    )
  }

  if (change === 'down') {
    return (
      <span className="ml-1 text-green-400" title={label || 'Decreased'}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="inline"
        >
          <path d="M12 20l8-8h-5v-8h-6v8h-5z" />
        </svg>
      </span>
    )
  }

  return null
}

function SnowBadge({
  low,
  high,
  change,
  prevHigh,
}: {
  low: number | null
  high: number | null
  change: ChangeDirection
  prevHigh: number | null
}) {
  if (high === null) return <span className="text-[var(--muted-foreground)]">-</span>

  let colorClass = ''
  if (high > 6) {
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'
  } else if (high >= 2) {
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  } else {
    colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  const changeLabel =
    change === 'up' && prevHigh !== null
      ? `Increased from ${prevHigh}"`
      : change === 'down' && prevHigh !== null
        ? `Decreased from ${prevHigh}"`
        : undefined

  return (
    <span className="inline-flex items-center">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      >
        {formatRange(low, high)}
      </span>
      <ChangeIndicator change={change} label={changeLabel} />
    </span>
  )
}

function IceBadge({
  low,
  high,
  change,
  prevHigh,
}: {
  low: number | null
  high: number | null
  change: ChangeDirection
  prevHigh: number | null
}) {
  if (high === null) return <span className="text-[var(--muted-foreground)]">-</span>

  let colorClass = ''
  if (high > 0.5) {
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'
  } else if (high >= 0.25) {
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  } else {
    colorClass = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }

  const changeLabel =
    change === 'up' && prevHigh !== null
      ? `Increased from ${prevHigh}"`
      : change === 'down' && prevHigh !== null
        ? `Decreased from ${prevHigh}"`
        : undefined

  return (
    <span className="inline-flex items-center">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      >
        {formatRange(low, high)}
      </span>
      <ChangeIndicator change={change} label={changeLabel} />
    </span>
  )
}

function TimeWindow({
  startTime,
  endTime,
  change,
}: {
  startTime: string | null
  endTime: string | null
  change: ChangeDirection
}) {
  if (!startTime) {
    return <span className="text-[var(--muted-foreground)]">-</span>
  }

  const timingLabel =
    change === 'up' ? 'Event moved earlier' : change === 'down' ? 'Event moved later' : undefined

  return (
    <span className="inline-flex items-center">
      <span>
        {formatTime(startTime)} - {formatTime(endTime)}
      </span>
      <ChangeIndicator change={change} label={timingLabel} />
    </span>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ml-1 inline-block transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
    >
      {direction === 'asc' ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" />
      )}
    </svg>
  )
}

export function WeatherImpactsTable({
  forecasts,
  generatedAt,
  errorCount,
  lastFetchedAt,
  showAllAirports = false,
  filters,
}: WeatherImpactsTableProps) {
  const [sortField, setSortField] = useState<SortField>('snow')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedForecast, setSelectedForecast] = useState<AirportWeatherForecast | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const displayForecasts = useMemo(() => {
    let filtered = showAllAirports
      ? forecasts
      : forecasts.filter((f) => !f.error && (f.snowInchesHigh !== null || f.iceInchesHigh !== null))

    // Apply filters
    if (filters) {
      // Search filter - match IATA code
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter((f) => f.iataCode.toLowerCase().includes(searchLower))
      }

      // State filter
      if (filters.state) {
        filtered = filtered.filter((f) => f.state === filters.state)
      }

      // Weather type filter
      if (filters.weatherType === 'snow') {
        filtered = filtered.filter((f) => f.snowInchesHigh !== null)
      } else if (filters.weatherType === 'ice') {
        filtered = filtered.filter((f) => f.iceInchesHigh !== null)
      } else if (filters.weatherType === 'both') {
        filtered = filtered.filter((f) => f.snowInchesHigh !== null && f.iceInchesHigh !== null)
      }

      // Min snow filter (compare against high value)
      if (filters.minSnow !== null) {
        filtered = filtered.filter((f) => f.snowInchesHigh !== null && f.snowInchesHigh >= filters.minSnow!)
      }

      // Min ice filter (compare against high value)
      if (filters.minIce !== null) {
        filtered = filtered.filter((f) => f.iceInchesHigh !== null && f.iceInchesHigh >= filters.minIce!)
      }
    }

    return [...filtered].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1

      switch (sortField) {
        case 'airport':
          return multiplier * a.iataCode.localeCompare(b.iataCode)
        case 'state':
          return multiplier * (a.state ?? '').localeCompare(b.state ?? '')
        case 'snow':
          return multiplier * ((a.snowInchesHigh ?? -1) - (b.snowInchesHigh ?? -1))
        case 'snowStart':
          if (!a.snowStartTime && !b.snowStartTime) return 0
          if (!a.snowStartTime) return multiplier
          if (!b.snowStartTime) return -multiplier
          return multiplier * a.snowStartTime.localeCompare(b.snowStartTime)
        case 'ice':
          return multiplier * ((a.iceInchesHigh ?? -1) - (b.iceInchesHigh ?? -1))
        case 'iceStart':
          if (!a.iceStartTime && !b.iceStartTime) return 0
          if (!a.iceStartTime) return multiplier
          if (!b.iceStartTime) return -multiplier
          return multiplier * a.iceStartTime.localeCompare(b.iceStartTime)
        default:
          return 0
      }
    })
  }, [forecasts, sortField, sortDirection, showAllAirports, filters])

  const handleRowClick = (forecast: AirportWeatherForecast) => {
    setSelectedForecast(forecast)
  }

  const formattedFetchedAt = lastFetchedAt
    ? DateTime.fromISO(lastFetchedAt).toFormat("MMM d, h:mm a")
    : 'Never'

  const impactCount = forecasts.filter(
    (f) => !f.error && (f.snowInchesHigh !== null || f.iceInchesHigh !== null)
  ).length

  // Count forecasts with changes
  const changedCount = forecasts.filter(
    (f) =>
      f.changes.snowAmount ||
      f.changes.snowTiming ||
      f.changes.iceAmount ||
      f.changes.iceTiming
  ).length

  const hasActiveFilters = filters && (
    filters.search ||
    filters.state ||
    filters.weatherType !== 'all' ||
    filters.minSnow !== null ||
    filters.minIce !== null
  )

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Winter Weather Impacts</h2>
          <span className="text-sm text-[var(--muted-foreground)]">
            {hasActiveFilters ? (
              <>{displayForecasts.length} of {impactCount} airports</>
            ) : (
              <>{impactCount} airports with impacts</>
            )}
          </span>
          {changedCount > 0 && (
            <span className="text-sm text-purple-400">{changedCount} changed</span>
          )}
          {errorCount > 0 && <span className="text-sm text-amber-400">{errorCount} errors</span>}
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">
          Last fetched: {formattedFetchedAt}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50">
              <th
                onClick={() => handleSort('airport')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                Airport
                <SortIcon active={sortField === 'airport'} direction={sortDirection} />
              </th>
              <th
                onClick={() => handleSort('state')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                State
                <SortIcon active={sortField === 'state'} direction={sortDirection} />
              </th>
              <th
                onClick={() => handleSort('snow')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                Snow
                <SortIcon active={sortField === 'snow'} direction={sortDirection} />
              </th>
              <th
                onClick={() => handleSort('snowStart')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                Snow Window
                <SortIcon active={sortField === 'snowStart'} direction={sortDirection} />
              </th>
              <th
                onClick={() => handleSort('ice')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                Ice
                <SortIcon active={sortField === 'ice'} direction={sortDirection} />
              </th>
              <th
                onClick={() => handleSort('iceStart')}
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)] transition-colors"
              >
                Ice Window
                <SortIcon active={sortField === 'iceStart'} direction={sortDirection} />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayForecasts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No winter weather impacts forecasted
                </td>
              </tr>
            ) : (
              displayForecasts.map((forecast) => (
                <tr
                  key={forecast.iataCode}
                  onClick={() => handleRowClick(forecast)}
                  className="border-b border-[var(--border)] hover:bg-[var(--secondary)]/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{forecast.iataCode}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {forecast.state ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <SnowBadge
                      low={forecast.snowInchesLow}
                      high={forecast.snowInchesHigh}
                      change={forecast.changes.snowAmount}
                      prevHigh={forecast.prevSnowInchesHigh}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <TimeWindow
                      startTime={forecast.snowStartTime}
                      endTime={forecast.snowEndTime}
                      change={forecast.changes.snowTiming}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <IceBadge
                      low={forecast.iceInchesLow}
                      high={forecast.iceInchesHigh}
                      change={forecast.changes.iceAmount}
                      prevHigh={forecast.prevIceInchesHigh}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <TimeWindow
                      startTime={forecast.iceStartTime}
                      endTime={forecast.iceEndTime}
                      change={forecast.changes.iceTiming}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedForecast && (
        <WeatherDetailDrawer
          forecast={selectedForecast}
          onClose={() => setSelectedForecast(null)}
        />
      )}
    </div>
  )
}
