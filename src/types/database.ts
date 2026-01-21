export interface Database {
  public: {
    Tables: {
      airports: {
        Row: {
          iata_code: string
          name: string
          lat: number
          lng: number
          timezone: string
          city: string | null
          state: string | null
          created_at: string
        }
        Insert: {
          iata_code: string
          name: string
          lat: number
          lng: number
          timezone: string
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Update: {
          iata_code?: string
          name?: string
          lat?: number
          lng?: number
          timezone?: string
          city?: string | null
          state?: string | null
          created_at?: string
        }
      }
      carriers: {
        Row: {
          id: string
          name: string
          color: string
          short_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          short_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          short_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      aircraft_allocations: {
        Row: {
          id: string
          carrier_id: string
          station_iata: string
          tail_number: string
          airline_code: string | null
          inbound_flight_number: string | null
          outbound_flight_number: string | null
          arrival_time_local: string
          departure_time_local: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          carrier_id: string
          station_iata: string
          tail_number: string
          airline_code?: string | null
          inbound_flight_number?: string | null
          outbound_flight_number?: string | null
          arrival_time_local: string
          departure_time_local?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          carrier_id?: string
          station_iata?: string
          tail_number?: string
          airline_code?: string | null
          inbound_flight_number?: string | null
          outbound_flight_number?: string | null
          arrival_time_local?: string
          departure_time_local?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
    Views: {
      allocations_with_ground_time: {
        Row: {
          id: string
          carrier_id: string
          station_iata: string
          tail_number: string
          airline_code: string | null
          inbound_flight_number: string | null
          outbound_flight_number: string | null
          arrival_time_local: string
          departure_time_local: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          carrier_name: string
          carrier_color: string
          carrier_short_code: string | null
          airport_name: string
          airport_timezone: string
          airport_city: string | null
          airport_state: string | null
          ground_time_minutes: number
        }
      }
    }
    Functions: {
      get_allocation_summary: {
        Args: Record<string, never>
        Returns: {
          station_iata: string
          total_count: number
          carrier_breakdown: CarrierBreakdown[]
          airport_name: string
          lat: number
          lng: number
        }[]
      }
      compute_ground_time_minutes: {
        Args: {
          arrival_time: string
          departure_time: string | null
          station_tz: string
        }
        Returns: number
      }
    }
  }
}

export interface CarrierBreakdown {
  carrier_id: string
  carrier_name: string
  carrier_color: string
  count: number
}

export interface AllocationSummary {
  station_iata: string
  total_count: number
  carrier_breakdown: CarrierBreakdown[]
  airport_name: string
  lat: number
  lng: number
}

export type Airport = Database['public']['Tables']['airports']['Row']
export type Carrier = Database['public']['Tables']['carriers']['Row']
export type AircraftAllocation = Database['public']['Tables']['aircraft_allocations']['Row']
export type AllocationWithGroundTime = Database['public']['Views']['allocations_with_ground_time']['Row']

export interface AllocationFormData {
  carrier_id: string
  tail_number: string
  airline_code: string
  inbound_flight_number: string
  outbound_flight_number: string
  arrival_time_local: string
  departure_time_local: string | null
}
