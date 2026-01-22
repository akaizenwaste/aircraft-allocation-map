import { useMemo } from 'react'
import { DateTime } from 'luxon'
import type { AllocationWithGroundTime, OverlapCheckResult } from '@/types/database'

interface UseOverlapValidationProps {
  tailNumber: string
  periodStart: string | null
  periodEnd: string | null
  existingAllocations: AllocationWithGroundTime[] | undefined
  excludeId?: string // For editing - exclude current allocation from check
}

export function useOverlapValidation({
  tailNumber,
  periodStart,
  periodEnd,
  existingAllocations,
  excludeId,
}: UseOverlapValidationProps): OverlapCheckResult {
  return useMemo(() => {
    if (!periodStart || !existingAllocations || !tailNumber) {
      return { hasOverlap: false, message: null }
    }

    const newStart = DateTime.fromISO(periodStart)
    if (!newStart.isValid) {
      return { hasOverlap: false, message: null }
    }

    const newEnd = periodEnd ? DateTime.fromISO(periodEnd) : null

    // Filter to same aircraft, excluding self if editing
    const otherAllocations = existingAllocations.filter(
      (a) => a.tail_number === tailNumber && a.id !== excludeId
    )

    for (const alloc of otherAllocations) {
      const existingStart = DateTime.fromISO(alloc.period_start)
      const existingEnd = alloc.period_end ? DateTime.fromISO(alloc.period_end) : null

      // Check overlap using [) interval semantics
      // Two intervals [a, b) and [c, d) overlap if a < d AND c < b
      // If end is null, treat as infinity
      const overlaps =
        newStart < (existingEnd ?? DateTime.fromMillis(Number.MAX_SAFE_INTEGER)) &&
        (newEnd === null || newEnd > existingStart)

      if (overlaps) {
        return {
          hasOverlap: true,
          message: `Overlaps with allocation at ${alloc.station_iata} (${existingStart.toFormat('MMM d, HH:mm')} - ${existingEnd?.toFormat('MMM d, HH:mm') ?? 'ongoing'})`,
          conflictingAllocation: {
            id: alloc.id,
            station_iata: alloc.station_iata,
            period_start: alloc.period_start,
            period_end: alloc.period_end,
          },
        }
      }
    }

    return { hasOverlap: false, message: null }
  }, [tailNumber, periodStart, periodEnd, existingAllocations, excludeId])
}
