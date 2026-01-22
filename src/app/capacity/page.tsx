'use client'

import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { NavBar } from '@/components/NavBar'
import { CapacitySummary } from '@/components/CapacitySummary'
import { useAirports } from '@/hooks/useAirports'
import { useAllocationSummary } from '@/hooks/useAllocations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Airport } from '@/types/database'

export default function CapacityPage() {
  const { data: airports, isLoading } = useAirports()
  const { data: allocationSummary } = useAllocationSummary(DateTime.now())
  const [search, setSearch] = useState('')
  const [editingStation, setEditingStation] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const queryClient = useQueryClient()

  // Calculate total aircraft and capacity
  const capacityTotals = useMemo(() => {
    if (!allocationSummary) return { totalAircraft: 0, totalCapacity: null }

    let totalAircraft = 0
    let totalCapacity = 0
    let hasAnyCapacity = false

    allocationSummary.forEach((summary) => {
      totalAircraft += summary.total_count
      if (summary.total_spots !== null && summary.total_spots !== undefined) {
        totalCapacity += summary.total_spots
        hasAnyCapacity = true
      }
    })

    return {
      totalAircraft,
      totalCapacity: hasAnyCapacity ? totalCapacity : null,
    }
  }, [allocationSummary])

  const updateCapacity = useMutation({
    mutationFn: async ({ iataCode, totalSpots }: { iataCode: string; totalSpots: number | null }) => {
      const { error } = await supabase
        .from('airports')
        .update({ total_spots: totalSpots })
        .eq('iata_code', iataCode)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airports'] })
      queryClient.invalidateQueries({ queryKey: ['airport'] })
      setEditingStation(null)
    },
  })

  const filteredAirports = airports?.filter(
    (airport) =>
      airport.iata_code.toLowerCase().includes(search.toLowerCase()) ||
      airport.name.toLowerCase().includes(search.toLowerCase()) ||
      airport.city?.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (airport: Airport) => {
    setEditingStation(airport.iata_code)
    setEditValue(airport.total_spots?.toString() || '')
  }

  const handleSave = (iataCode: string) => {
    const value = editValue.trim()
    const totalSpots = value === '' ? null : parseInt(value, 10)

    if (value !== '' && (isNaN(totalSpots!) || totalSpots! < 0)) {
      alert('Please enter a valid non-negative number or leave empty for unlimited')
      return
    }

    updateCapacity.mutate({ iataCode, totalSpots })
  }

  const handleCancel = () => {
    setEditingStation(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, iataCode: string) => {
    if (e.key === 'Enter') {
      handleSave(iataCode)
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold mb-2">Station Capacity</h1>
              <p className="text-sm sm:text-base text-[var(--muted-foreground)]">
                Set the maximum number of aircraft spots for each station. Leave empty for unlimited capacity.
              </p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 shrink-0">
              <CapacitySummary
                totalAircraft={capacityTotals.totalAircraft}
                totalCapacity={capacityTotals.totalCapacity}
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Search stations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            Loading stations...
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50">
                  <th className="text-left px-4 py-3 text-sm font-medium">Station</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-sm font-medium w-40">Capacity</th>
                  <th className="text-left px-4 py-3 text-sm font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAirports?.map((airport) => (
                  <tr
                    key={airport.iata_code}
                    className="border-b border-[var(--border)] hover:bg-[var(--secondary)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium">{airport.iata_code}</td>
                    <td className="px-4 py-3 text-sm">{airport.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      {airport.city}, {airport.state}
                    </td>
                    <td className="px-4 py-3">
                      {editingStation === airport.iata_code ? (
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, airport.iata_code)}
                          placeholder="Unlimited"
                          className="w-24 bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          autoFocus
                        />
                      ) : (
                        <span className={airport.total_spots === null ? 'text-[var(--muted-foreground)]' : ''}>
                          {airport.total_spots === null ? 'Unlimited' : `${airport.total_spots} spots`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingStation === airport.iata_code ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSave(airport.iata_code)}
                            disabled={updateCapacity.isPending}
                            className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] rounded transition-colors"
                            title="Cancel"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(airport)}
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded transition-colors"
                          title="Edit capacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAirports?.length === 0 && (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                No stations found matching &quot;{search}&quot;
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
