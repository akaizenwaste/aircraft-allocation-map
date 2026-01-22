'use client'

import { DateTime } from 'luxon'
import { useCallback } from 'react'

interface TimelineSliderProps {
  viewTime: DateTime
  onViewTimeChange: (time: DateTime) => void
}

export function TimelineSlider({ viewTime, onViewTimeChange }: TimelineSliderProps) {
  const dayStart = viewTime.startOf('day')
  const totalMinutes = 24 * 60
  const currentMinutes = viewTime.diff(dayStart, 'minutes').minutes

  // Slider changes time-of-day, preserves date
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = Number(e.target.value)
    onViewTimeChange(dayStart.plus({ minutes }))
  }, [dayStart, onViewTimeChange])

  // Date picker changes date, preserves time-of-day
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = DateTime.fromISO(e.target.value)
    if (newDate.isValid) {
      onViewTimeChange(newDate.set({ hour: viewTime.hour, minute: viewTime.minute }))
    }
  }, [viewTime, onViewTimeChange])

  const jumpToNow = useCallback(() => {
    onViewTimeChange(DateTime.now())
  }, [onViewTimeChange])

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[var(--card)] border-t border-[var(--border)]">
      {/* Date picker */}
      <input
        type="date"
        value={viewTime.toISODate() ?? ''}
        onChange={handleDateChange}
        className="px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--secondary)]"
      />

      {/* Timeline slider */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-[var(--muted-foreground)] w-12">00:00</span>
        <input
          type="range"
          min={0}
          max={totalMinutes}
          value={currentMinutes}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-[var(--muted-foreground)] w-12">23:59</span>
      </div>

      {/* Current time display */}
      <span className="font-mono text-lg font-medium text-blue-500 w-14">
        {viewTime.toFormat('HH:mm')}
      </span>

      <button
        onClick={jumpToNow}
        className="px-3 py-1.5 text-xs bg-[var(--secondary)] hover:bg-[var(--accent)] rounded transition-colors"
      >
        Now
      </button>
    </div>
  )
}
