'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { DateTime } from 'luxon'
import { supabase } from '@/lib/supabase'
import { useDebouncedValue } from './useDebouncedValue'
import type {
  AllocationSummary,
  AllocationWithGroundTime,
  AllocationFormData,
  CarrierBreakdown,
  Airport,
  AircraftAllocation
} from '@/types/database'

// Fetch allocation summary for all airports (for map overlay)
// viewTime filters to allocations active at that point in time
export function useAllocationSummary(viewTime: DateTime | null) {
  const queryClient = useQueryClient()
  // Use a stable fallback time for debouncing when viewTime is null (won't be used due to enabled: false)
  const fallbackTime = DateTime.fromMillis(0)
  const debouncedTime = useDebouncedValue(viewTime ?? fallbackTime, 200)
  // Round to minute for cache hits during scrubbing
  const cacheKey = viewTime ? debouncedTime.startOf('minute').toISO() : null
  const timeISO = viewTime ? debouncedTime.toISO() : null

  const query = useQuery({
    queryKey: ['allocation-summary', cacheKey],
    queryFn: async (): Promise<Map<string, AllocationSummary>> => {
      if (!timeISO) return new Map()

      // Get allocations active at viewTime with carrier info
      // Active means: period_start <= viewTime AND (period_end IS NULL OR period_end > viewTime)
      const { data: allocations, error } = await supabase
        .from('aircraft_allocations')
        .select(`
          station_iata,
          carrier_id,
          carriers (
            id,
            name,
            color
          )
        `)
        .lte('period_start', timeISO)
        .or(`period_end.is.null,period_end.gt.${timeISO}`)

      if (error) throw error

      type AllocationWithCarrier = {
        station_iata: string
        carrier_id: string
        carriers: { id: string; name: string; color: string } | { id: string; name: string; color: string }[]
      }
      const allocationList = (allocations || []) as unknown as AllocationWithCarrier[]

      // Get all airports
      const { data: airports, error: airportError } = await supabase
        .from('airports')
        .select('iata_code, name, lat, lng, total_spots')

      if (airportError) throw airportError

      // Build summary map
      const summaryMap = new Map<string, AllocationSummary>()

      // Initialize with all airports
      const airportList = (airports || []) as Pick<Airport, 'iata_code' | 'name' | 'lat' | 'lng' | 'total_spots'>[]
      airportList.forEach(airport => {
        summaryMap.set(airport.iata_code, {
          station_iata: airport.iata_code,
          total_count: 0,
          carrier_breakdown: [],
          airport_name: airport.name,
          lat: airport.lat,
          lng: airport.lng,
          total_spots: airport.total_spots,
        })
      })

      // Aggregate allocations by station
      const stationCarrierCounts = new Map<string, Map<string, { count: number; carrier: { id: string; name: string; color: string } }>>()

      allocationList.forEach(alloc => {
        const station = alloc.station_iata
        const carrierData = alloc.carriers
        const carrier = Array.isArray(carrierData) ? carrierData[0] : carrierData
        if (!carrier) return

        if (!stationCarrierCounts.has(station)) {
          stationCarrierCounts.set(station, new Map())
        }

        const carrierMap = stationCarrierCounts.get(station)!
        if (!carrierMap.has(carrier.id)) {
          carrierMap.set(carrier.id, { count: 0, carrier })
        }
        carrierMap.get(carrier.id)!.count++
      })

      // Update summary with counts
      stationCarrierCounts.forEach((carrierMap, station) => {
        const summary = summaryMap.get(station)
        if (summary) {
          const breakdown: CarrierBreakdown[] = []
          let total = 0

          carrierMap.forEach(({ count, carrier }) => {
            breakdown.push({
              carrier_id: carrier.id,
              carrier_name: carrier.name,
              carrier_color: carrier.color,
              count,
            })
            total += count
          })

          summary.total_count = total
          summary.carrier_breakdown = breakdown.sort((a, b) => b.count - a.count)
        }
      })

      return summaryMap
    },
    enabled: !!viewTime,
    refetchInterval: 60000, // Refetch every minute
  })

  // Set up realtime subscription - invalidate queries matching allocation-summary prefix
  useEffect(() => {
    const channel = supabase
      .channel('allocation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aircraft_allocations',
        },
        () => {
          // Invalidate all allocation-summary queries
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'allocation-summary'
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// Fetch detailed allocations for a specific station at a specific time
export function useStationAllocations(stationIata: string | null, viewTime: DateTime) {
  const queryClient = useQueryClient()
  const debouncedTime = useDebouncedValue(viewTime, 200)
  // Round to minute for cache hits during scrubbing
  const cacheKey = debouncedTime.startOf('minute').toISO()
  const timeISO = debouncedTime.toISO()

  const query = useQuery({
    queryKey: ['station-allocations', stationIata, cacheKey],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      if (!stationIata) return []

      // Active means: period_start <= viewTime AND (period_end IS NULL OR period_end > viewTime)
      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .eq('station_iata', stationIata)
        .lte('period_start', timeISO)
        .or(`period_end.is.null,period_end.gt.${timeISO}`)
        .order('ground_time_minutes', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!stationIata,
    refetchInterval: 60000, // Refetch every minute for live ground time updates
  })

  // Set up realtime subscription for this station
  useEffect(() => {
    if (!stationIata) return

    const channel = supabase
      .channel(`station-${stationIata}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aircraft_allocations',
          filter: `station_iata=eq.${stationIata}`,
        },
        () => {
          // Invalidate all queries for this station across all time keys
          queryClient.invalidateQueries({
            predicate: (q) =>
              q.queryKey[0] === 'station-allocations' && q.queryKey[1] === stationIata
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stationIata, queryClient])

  return query
}

// Create allocation mutation
export function useCreateAllocation(stationIata?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AllocationFormData & { station_iata?: string }) => {
      // Use station from data if provided (global add), otherwise use hook param
      const station = data.station_iata || stationIata
      if (!station) throw new Error('Station is required')

      const { station_iata: _, ...rest } = data
      const { data: result, error } = await supabase
        .from('aircraft_allocations')
        .insert({
          ...rest,
          station_iata: station,
        })
        .select()
        .single()

      if (error) throw error
      return result as AircraftAllocation
    },
    onSuccess: (_data, variables) => {
      const station = variables.station_iata || stationIata
      queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
      if (station) {
        queryClient.invalidateQueries({ queryKey: ['station-allocations', station] })
      }
    },
  })
}

// Update allocation mutation
export function useUpdateAllocation(stationIata: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => {
      const { data: result, error } = await supabase
        .from('aircraft_allocations')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
      queryClient.invalidateQueries({ queryKey: ['station-allocations', stationIata] })
    },
  })
}

// Delete allocation mutation
export function useDeleteAllocation(stationIata?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aircraft_allocations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
      queryClient.invalidateQueries({ queryKey: ['allocations-range'] })
      if (stationIata) {
        queryClient.invalidateQueries({ queryKey: ['station-allocations', stationIata] })
      } else {
        // Invalidate all station queries when no specific station
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === 'station-allocations'
        })
      }
    },
  })
}

// Top longest sits nationwide (ongoing allocations with no end time)
export function useLongestSitsNationwide(limit = 10) {
  return useQuery({
    queryKey: ['longest-sits', limit],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .is('period_end', null)
        .order('ground_time_minutes', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data as AllocationWithGroundTime[]) || []
    },
    refetchInterval: 60000,
  })
}

// Fetch allocations for a date range with optional filters
export function useAllocationsInRange(
  startDate: DateTime,
  endDate: DateTime,
  filters?: {
    carrierIds?: string[]
    stationIatas?: string[]
    tailNumber?: string
  }
) {
  const queryClient = useQueryClient()
  const startISO = startDate.startOf('day').toISO()
  const endISO = endDate.endOf('day').toISO()
  const cacheKey = `${startISO}-${endISO}-${JSON.stringify(filters || {})}`

  const query = useQuery({
    queryKey: ['allocations-range', cacheKey],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      // Get allocations that overlap with the date range
      // Overlap means: period_start < endDate AND (period_end IS NULL OR period_end > startDate)
      let queryBuilder = supabase
        .from('allocations_with_ground_time')
        .select('*')
        .lt('period_start', endISO)
        .or(`period_end.is.null,period_end.gt.${startISO}`)

      // Apply optional filters
      if (filters?.carrierIds && filters.carrierIds.length > 0) {
        queryBuilder = queryBuilder.in('carrier_id', filters.carrierIds)
      }
      if (filters?.stationIatas && filters.stationIatas.length > 0) {
        queryBuilder = queryBuilder.in('station_iata', filters.stationIatas)
      }
      if (filters?.tailNumber) {
        queryBuilder = queryBuilder.ilike('tail_number', `%${filters.tailNumber}%`)
      }

      const { data, error } = await queryBuilder.order('period_start', { ascending: false })

      if (error) throw error
      return data || []
    },
    refetchInterval: 60000,
  })

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('allocations-range-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aircraft_allocations',
        },
        () => {
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'allocations-range'
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// Fetch all allocations for a specific aircraft (for AircraftPanel)
export function useAircraftAllocations(tailNumber: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['aircraft-periods', tailNumber],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      if (!tailNumber) return []

      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .eq('tail_number', tailNumber)
        .order('period_start', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!tailNumber,
  })

  // Set up realtime subscription for this aircraft
  useEffect(() => {
    if (!tailNumber) return

    const channel = supabase
      .channel(`aircraft-${tailNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aircraft_allocations',
          filter: `tail_number=eq.${tailNumber}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['aircraft-periods', tailNumber] })
          // Also invalidate summary and station queries
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'allocation-summary'
          })
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'station-allocations'
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tailNumber, queryClient])

  return query
}
