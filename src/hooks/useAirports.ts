'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Airport } from '@/types/database'

export function useAirports() {
  return useQuery({
    queryKey: ['airports'],
    queryFn: async (): Promise<Airport[]> => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .order('iata_code')

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

export function useAirport(iataCode: string | null) {
  return useQuery({
    queryKey: ['airport', iataCode],
    queryFn: async (): Promise<Airport | null> => {
      if (!iataCode) return null

      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('iata_code', iataCode)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!iataCode,
    staleTime: 1000 * 60 * 60,
  })
}
