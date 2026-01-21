'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Carrier } from '@/types/database'

export function useCarriers() {
  return useQuery({
    queryKey: ['carriers'],
    queryFn: async (): Promise<Carrier[]> => {
      const { data, error } = await supabase
        .from('carriers')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
