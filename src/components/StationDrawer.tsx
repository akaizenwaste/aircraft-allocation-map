'use client'

import { useEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { useAirport } from '@/hooks/useAirports'
import { useStationAllocations, useDeleteAllocation } from '@/hooks/useAllocations'
import { formatGroundTime, formatLocalTime, cn } from '@/lib/utils'
import type { AllocationWithGroundTime } from '@/types/database'
import { AllocationDialog } from './AllocationDialog'

interface StationDrawerProps {
  stationIata: string
  viewTime: DateTime
  onClose: () => void
  onAircraftClick: (tailNumber: string) => void
}

type SortField = 'ground_time' | 'period_start' | 'carrier' | 'tail_number'
type SortDirection = 'asc' | 'desc'

export function StationDrawer({ stationIata, viewTime, onClose, onAircraftClick }: StationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const { data: airport } = useAirport(stationIata)
  const { data: allocations, isLoading } = useStationAllocations(stationIata, viewTime)
  const deleteAllocation = useDeleteAllocation(stationIata)

  const [sortField, setSortField] = useState<SortField>('ground_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState<AllocationWithGroundTime | null>(null)

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

  // Sort allocations
  const sortedAllocations = [...(allocations || [])].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'ground_time':
        comparison = a.ground_time_minutes - b.ground_time_minutes
        break
      case 'period_start':
        comparison =
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        break
      case 'carrier':
        comparison = a.carrier_name.localeCompare(b.carrier_name)
        break
      case 'tail_number':
        comparison = a.tail_number.localeCompare(b.tail_number)
        break
    }

    return sortDirection === 'desc' ? -comparison : comparison
  })

  // Group by carrier for summary
  const carrierSummary = (allocations || []).reduce(
    (acc, alloc) => {
      if (!acc[alloc.carrier_name]) {
        acc[alloc.carrier_name] = { count: 0, color: alloc.carrier_color }
      }
      acc[alloc.carrier_name].count++
      return acc
    },
    {} as Record<string, { count: number; color: string }>
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this aircraft?')) {
      await deleteAllocation.mutateAsync(id)
    }
  }

  const handleEdit = (allocation: AllocationWithGroundTime) => {
    setEditingAllocation(allocation)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingAllocation(null)
    setDialogOpen(true)
  }

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
              {stationIata}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {airport?.name || 'Loading...'}
            </p>
            {airport && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {airport.city}, {airport.state} · {airport.timezone}
              </p>
            )}
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

        {/* Summary */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-bold">{allocations?.length || 0}</div>
            <div className="text-[var(--muted-foreground)]">aircraft allocated</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(carrierSummary).map(([name, { count, color }]) => (
              <div
                key={name}
                className="flex items-center gap-2 px-2 py-1 bg-[var(--secondary)] rounded text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{name}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
          {/* Capacity Display */}
          {airport?.total_spots !== null && airport?.total_spots !== undefined && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className={cn(
                'flex items-center gap-2 text-sm',
                (allocations?.length || 0) > airport.total_spots && 'text-red-400',
                (allocations?.length || 0) === airport.total_spots && 'text-amber-400'
              )}>
                <span className="font-medium">
                  {allocations?.length || 0} of {airport.total_spots} spots
                </span>
                {(allocations?.length || 0) > airport.total_spots && (
                  <span className="px-2 py-0.5 bg-red-500/20 rounded text-xs">
                    {(allocations?.length || 0) - airport.total_spots} over capacity
                  </span>
                )}
                {(allocations?.length || 0) === airport.total_spots && (
                  <span className="px-2 py-0.5 bg-amber-500/20 rounded text-xs">
                    At capacity
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted-foreground)]">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="bg-[var(--secondary)] border border-[var(--border)] rounded px-2 py-1 text-sm"
            >
              <option value="ground_time">Ground Time</option>
              <option value="period_start">Start Time</option>
              <option value="carrier">Carrier</option>
              <option value="tail_number">Tail Number</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-[var(--secondary)] rounded"
              aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortDirection === 'desc' ? '↓' : '↑'}
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-[var(--primary)] hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            + Add Aircraft
          </button>
        </div>

        {/* Aircraft List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-[var(--muted-foreground)] py-8">
              Loading aircraft...
            </div>
          ) : sortedAllocations.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] py-8">
              No aircraft at this station
            </div>
          ) : (
            <div className="space-y-2">
              {sortedAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="p-3 bg-[var(--secondary)] rounded-lg hover:bg-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => onAircraftClick(allocation.tail_number)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: allocation.carrier_color }}
                      />
                      <span className="font-mono font-medium">
                        {allocation.tail_number}
                      </span>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {allocation.carrier_short_code || allocation.carrier_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(allocation)}
                        className="p-1 hover:bg-[var(--accent)] rounded"
                        aria-label="Edit allocation"
                      >
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
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(allocation.id)}
                        className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded"
                        aria-label="Remove allocation"
                      >
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
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--muted-foreground)]">In:</span>
                      <span>{allocation.inbound_flight_number || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--muted-foreground)]">Out:</span>
                      <span>{allocation.outbound_flight_number || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--muted-foreground)]">Start:</span>
                      <span>
                        {formatLocalTime(
                          allocation.period_start,
                          allocation.airport_timezone
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
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
                      {formatGroundTime(allocation.ground_time_minutes)} on ground
                    </span>
                    {allocation.period_end && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        End:{' '}
                        {formatLocalTime(
                          allocation.period_end,
                          allocation.airport_timezone
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dialogOpen && (
        <AllocationDialog
          stationIata={stationIata}
          allocation={editingAllocation}
          onClose={() => {
            setDialogOpen(false)
            setEditingAllocation(null)
          }}
        />
      )}
    </>
  )
}
