'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  AllocationSummary,
  AllocationWithGroundTime,
  AllocationFormData,
  CarrierBreakdown,
  Airport,
  AircraftAllocation
} from '@/types/database'

// Fetch allocation summary for all airports (for map overlay)
export function useAllocationSummary() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['allocation-summary'],
    queryFn: async (): Promise<Map<string, AllocationSummary>> => {
      // Get all allocations with carrier info
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
        .select('iata_code, name, lat, lng')

      if (airportError) throw airportError

      // Build summary map
      const summaryMap = new Map<string, AllocationSummary>()

      // Initialize with all airports
      const airportList = (airports || []) as Pick<Airport, 'iata_code' | 'name' | 'lat' | 'lng'>[]
      airportList.forEach(airport => {
        summaryMap.set(airport.iata_code, {
          station_iata: airport.iata_code,
          total_count: 0,
          carrier_breakdown: [],
          airport_name: airport.name,
          lat: airport.lat,
          lng: airport.lng,
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
    refetchInterval: 60000, // Refetch every minute
  })

  // Set up realtime subscription
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
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// Fetch detailed allocations for a specific station
export function useStationAllocations(stationIata: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['station-allocations', stationIata],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      if (!stationIata) return []

      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .eq('station_iata', stationIata)
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
          queryClient.invalidateQueries({ queryKey: ['station-allocations', stationIata] })
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
export function useDeleteAllocation(stationIata: string) {
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
      queryClient.invalidateQueries({ queryKey: ['station-allocations', stationIata] })
    },
  })
}

// Top longest sits nationwide
export function useLongestSitsNationwide(limit = 10) {
  return useQuery({
    queryKey: ['longest-sits', limit],
    queryFn: async (): Promise<AllocationWithGroundTime[]> => {
      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .is('departure_time_local', null)
        .order('ground_time_minutes', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data as AllocationWithGroundTime[]) || []
    },
    refetchInterval: 60000,
  })
}
