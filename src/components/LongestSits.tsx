'use client'

import { useState } from 'react'
import { useLongestSitsNationwide } from '@/hooks/useAllocations'
import { formatGroundTime, cn } from '@/lib/utils'

interface LongestSitsProps {
  onStationClick: (iataCode: string) => void
}

export function LongestSits({ onStationClick }: LongestSitsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: longestSits, isLoading } = useLongestSitsNationwide(10)

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-20 bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] rounded-lg shadow-lg transition-all',
        isExpanded ? 'w-80' : 'w-auto'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--secondary)] rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-medium">Longest Sits</span>
        </div>
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
          className={cn(
            'transition-transform',
            isExpanded ? 'rotate-180' : ''
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border)] max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-[var(--muted-foreground)] text-sm">
              Loading...
            </div>
          ) : longestSits && longestSits.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {longestSits.map((allocation, index) => (
                <button
                  key={allocation.id}
                  onClick={() => onStationClick(allocation.station_iata)}
                  className="w-full p-3 text-left hover:bg-[var(--secondary)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--muted-foreground)] text-xs w-4">
                        {index + 1}.
                      </span>
                      <span className="font-mono font-medium">
                        {allocation.tail_number}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: allocation.carrier_color }}
                      />
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        allocation.ground_time_minutes >= 480
                          ? 'bg-red-500/20 text-red-400'
                          : allocation.ground_time_minutes >= 240
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                      )}
                    >
                      {formatGroundTime(allocation.ground_time_minutes)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)] ml-6">
                    {allocation.station_iata} — {allocation.airport_name}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-[var(--muted-foreground)] text-sm">
              No aircraft currently on ground
            </div>
          )}
        </div>
      )}
    </div>
  )
}
