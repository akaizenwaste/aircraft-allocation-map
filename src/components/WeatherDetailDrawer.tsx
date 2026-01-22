'use client'

import { useEffect, useRef } from 'react'
import { DateTime } from 'luxon'
import type { AirportWeatherForecast, ChangeDirection } from '@/types/weather'

interface WeatherDetailDrawerProps {
  forecast: AirportWeatherForecast
  onClose: () => void
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return 'No event forecasted'
  const start = DateTime.fromISO(startTime)
  const end = endTime ? DateTime.fromISO(endTime) : null

  const startStr = start.toFormat('EEE, MMM d, h:mm a')
  const endStr = end ? end.toFormat('EEE, MMM d, h:mm a') : 'ongoing'

  return `${startStr} — ${endStr}`
}

function formatDuration(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return ''
  const start = DateTime.fromISO(startTime)
  const end = DateTime.fromISO(endTime)
  const hours = end.diff(start, 'hours').hours

  if (hours < 24) {
    return `${Math.round(hours)} hours`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`
}

function formatTimeUntil(startTime: string | null): string {
  if (!startTime) return ''
  const start = DateTime.fromISO(startTime)
  const now = DateTime.now()

  if (start < now) {
    return 'In progress'
  }

  const diff = start.diff(now, ['days', 'hours']).toObject()
  const days = Math.floor(diff.days || 0)
  const hours = Math.round(diff.hours || 0)

  if (days > 0) {
    return `Starts in ${days}d ${hours}h`
  }
  return `Starts in ${hours}h`
}

function ChangeLabel({ change, type }: { change: ChangeDirection; type: 'amount' | 'timing' }) {
  if (!change) return null

  const labels = {
    amount: {
      new: 'Newly forecasted',
      up: 'Increased from previous forecast',
      down: 'Decreased from previous forecast',
    },
    timing: {
      new: 'Newly forecasted',
      up: 'Moved earlier than previous forecast',
      down: 'Moved later than previous forecast',
    },
  }

  const colors = {
    new: 'text-purple-400 bg-purple-500/10',
    up: 'text-red-400 bg-red-500/10',
    down: 'text-green-400 bg-green-500/10',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[change]}`}>
      {labels[type][change]}
    </span>
  )
}

function SeverityIndicator({ inches, type }: { inches: number | null; type: 'snow' | 'ice' }) {
  if (inches === null) return null

  const snowLevels = [
    { min: 12, label: 'Extreme', color: 'bg-purple-500', description: 'Major travel disruptions likely' },
    { min: 6, label: 'Heavy', color: 'bg-red-500', description: 'Significant impacts expected' },
    { min: 2, label: 'Moderate', color: 'bg-amber-500', description: 'Some travel delays possible' },
    { min: 0, label: 'Light', color: 'bg-blue-500', description: 'Minor impacts' },
  ]

  const iceLevels = [
    { min: 0.5, label: 'Severe', color: 'bg-purple-500', description: 'Dangerous conditions, major disruptions' },
    { min: 0.25, label: 'Significant', color: 'bg-red-500', description: 'Hazardous travel conditions' },
    { min: 0.1, label: 'Light', color: 'bg-amber-500', description: 'Some icing on surfaces' },
    { min: 0, label: 'Trace', color: 'bg-cyan-500', description: 'Minimal accumulation' },
  ]

  const levels = type === 'snow' ? snowLevels : iceLevels
  const level = levels.find(l => inches >= l.min) || levels[levels.length - 1]

  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${level.color}`} />
      <div>
        <div className="font-medium">{level.label}</div>
        <div className="text-xs text-[var(--muted-foreground)]">{level.description}</div>
      </div>
    </div>
  )
}

function formatAccumulation(low: number | null, high: number | null): string {
  if (low === null || high === null) return '—'
  if (low === high) return `${high}`
  return `${low}-${high}`
}

function WeatherCard({
  title,
  icon,
  inchesLow,
  inchesHigh,
  startTime,
  endTime,
  amountChange,
  timingChange,
  prevInchesHigh,
  type,
}: {
  title: string
  icon: React.ReactNode
  inchesLow: number | null
  inchesHigh: number | null
  startTime: string | null
  endTime: string | null
  amountChange: ChangeDirection
  timingChange: ChangeDirection
  prevInchesHigh: number | null
  type: 'snow' | 'ice'
}) {
  const hasEvent = inchesHigh !== null || startTime !== null

  return (
    <div className="bg-[var(--secondary)] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>

      {!hasEvent ? (
        <div className="text-[var(--muted-foreground)] text-center py-6">
          No {title.toLowerCase()} forecasted
        </div>
      ) : (
        <div className="space-y-4">
          {/* Accumulation */}
          <div>
            <div className="text-sm text-[var(--muted-foreground)] mb-1">Accumulation</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {formatAccumulation(inchesLow, inchesHigh)}
              </span>
              <span className="text-xl text-[var(--muted-foreground)]">inches</span>
              {prevInchesHigh !== null && amountChange && (
                <span className="text-sm text-[var(--muted-foreground)]">
                  (was {prevInchesHigh}")
                </span>
              )}
            </div>
            <div className="mt-2">
              <ChangeLabel change={amountChange} type="amount" />
            </div>
          </div>

          {/* Severity */}
          <div>
            <div className="text-sm text-[var(--muted-foreground)] mb-1">Severity</div>
            <SeverityIndicator inches={inchesHigh} type={type} />
          </div>

          {/* Time Window */}
          <div>
            <div className="text-sm text-[var(--muted-foreground)] mb-1">Time Window</div>
            <div className="font-medium">{formatTimeRange(startTime, endTime)}</div>
            <div className="flex items-center gap-4 mt-1 text-sm text-[var(--muted-foreground)]">
              {startTime && endTime && (
                <span>Duration: {formatDuration(startTime, endTime)}</span>
              )}
              {startTime && (
                <span className="text-amber-400">{formatTimeUntil(startTime)}</span>
              )}
            </div>
            <div className="mt-2">
              <ChangeLabel change={timingChange} type="timing" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function WeatherDetailDrawer({ forecast, onClose }: WeatherDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return

    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    drawer.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => drawer.removeEventListener('keydown', handleTab)
  }, [])

  const hasAnyWeather = forecast.snowInchesHigh !== null || forecast.iceInchesHigh !== null ||
    forecast.snowStartTime !== null || forecast.iceStartTime !== null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] shadow-xl z-50 drawer-enter overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 id="drawer-title" className="text-xl font-semibold">
              {forecast.iataCode}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {forecast.state ? `${forecast.state}, US` : 'United States'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
            aria-label="Close drawer"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Banner */}
          {!hasAnyWeather ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2 text-green-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <div className="font-medium text-green-400">No Winter Weather</div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">
                No snow or ice impacts forecasted for this location
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
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
                className="text-amber-400 flex-shrink-0"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div className="text-sm">
                <span className="font-medium text-amber-400">Winter Weather Alert</span>
                <span className="text-[var(--muted-foreground)]"> — Impacts forecasted for this location</span>
              </div>
            </div>
          )}

          {/* Snow Card */}
          <WeatherCard
            title="Snow"
            icon={
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
                className="text-blue-400"
              >
                <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" />
              </svg>
            }
            inchesLow={forecast.snowInchesLow}
            inchesHigh={forecast.snowInchesHigh}
            startTime={forecast.snowStartTime}
            endTime={forecast.snowEndTime}
            amountChange={forecast.changes.snowAmount}
            timingChange={forecast.changes.snowTiming}
            prevInchesHigh={forecast.prevSnowInchesHigh}
            type="snow"
          />

          {/* Ice Card */}
          <WeatherCard
            title="Ice"
            icon={
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
                className="text-cyan-400"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            }
            inchesLow={forecast.iceInchesLow}
            inchesHigh={forecast.iceInchesHigh}
            startTime={forecast.iceStartTime}
            endTime={forecast.iceEndTime}
            amountChange={forecast.changes.iceAmount}
            timingChange={forecast.changes.iceTiming}
            prevInchesHigh={forecast.prevIceInchesHigh}
            type="ice"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center justify-between">
            <span>
              Forecast generated:{' '}
              {DateTime.fromISO(forecast.forecastGeneratedAt).toFormat('MMM d, h:mm a')}
            </span>
            <span>
              Fetched:{' '}
              {DateTime.fromISO(forecast.fetchedAt).toFormat('MMM d, h:mm a')}
            </span>
          </div>
          <div className="mt-1 text-center">
            Data from National Weather Service
          </div>
        </div>
      </div>
    </>
  )
}
