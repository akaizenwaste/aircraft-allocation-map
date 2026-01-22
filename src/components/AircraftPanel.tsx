'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DateTime } from 'luxon'
import type { AllocationWithGroundTime } from '@/types/database'

interface AircraftPanelProps {
  tailNumber: string
  onClose: () => void
  onEditPeriod: (allocationId: string) => void
  onAddPeriod: (tailNumber: string) => void
}

export function AircraftPanel({
  tailNumber,
  onClose,
  onEditPeriod,
  onAddPeriod,
}: AircraftPanelProps) {
  const queryClient = useQueryClient()

  // Inline query - no separate hook needed
  const { data: allocations, isLoading, error } = useQuery({
    queryKey: ['aircraft-periods', tailNumber],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .eq('tail_number', tailNumber)
        .order('period_start', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from('aircraft_allocations')
        .delete()
        .eq('id', allocationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft-periods', tailNumber] })
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'allocation-summary'
      })
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'station-allocations'
      })
    },
  })

  const handleDelete = (allocationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this time period?')) {
      deleteMutation.mutate(allocationId)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-96 h-full bg-[var(--card)] border-l border-[var(--border)] flex items-center justify-center">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-96 h-full bg-[var(--card)] border-l border-[var(--border)] p-4">
        <div className="text-red-400">Error loading allocations</div>
        <button onClick={onClose} className="mt-2 text-sm text-[var(--muted-foreground)] hover:underline">
          Close
        </button>
      </div>
    )
  }

  const carrierInfo = allocations?.[0]

  // Empty state
  if (!allocations?.length) {
    return (
      <div className="w-96 h-full bg-[var(--card)] border-l border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold font-mono">{tailNumber}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--secondary)] rounded transition-colors"
            aria-label="Close panel"
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
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-[var(--muted-foreground)]">
          <p>No allocations found</p>
          <button
            onClick={() => onAddPeriod(tailNumber)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Add First Allocation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 h-full bg-[var(--card)] border-l border-[var(--border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-mono">{tailNumber}</h2>
          {carrierInfo && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: carrierInfo.carrier_color }}
              />
              <span className="text-sm text-[var(--muted-foreground)]">
                {carrierInfo.carrier_name}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--secondary)] rounded transition-colors"
          aria-label="Close panel"
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
        <div className="text-sm text-[var(--muted-foreground)]">
          {allocations.length} time period{allocations.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Time periods list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allocations.map((allocation) => (
          <div
            key={allocation.id}
            className="p-3 bg-[var(--secondary)] rounded-lg hover:bg-zinc-700/50 cursor-pointer group transition-colors"
            onClick={() => onEditPeriod(allocation.id)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium font-mono">{allocation.station_iata}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {allocation.airport_name}
                </span>
                <button
                  onClick={(e) => handleDelete(allocation.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                  title="Delete"
                  aria-label="Delete time period"
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
            <div className="mt-2 text-sm text-[var(--muted-foreground)]">
              {DateTime.fromISO(allocation.period_start).toFormat('MMM d, HH:mm')}
              {' → '}
              {allocation.period_end
                ? DateTime.fromISO(allocation.period_end).toFormat('MMM d, HH:mm')
                : 'Ongoing'}
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={() => onAddPeriod(tailNumber)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          + Add Time Period
        </button>
      </div>
    </div>
  )
}
