'use client'

import { useState, useMemo } from 'react'
import { DateTime } from 'luxon'
import { NavBar } from '@/components/NavBar'
import { AllocationDialog } from '@/components/AllocationDialog'
import { useAllocationsInRange, useDeleteAllocation } from '@/hooks/useAllocations'
import { useCarriers } from '@/hooks/useCarriers'
import { useAirports } from '@/hooks/useAirports'
import { formatLocalDateTime, formatGroundTime, getGroundTimeClass } from '@/lib/utils'
import type { AllocationWithGroundTime } from '@/types/database'

type SortField = 'tail_number' | 'carrier_name' | 'station_iata' | 'period_start' | 'period_end' | 'ground_time_minutes'
type SortDirection = 'asc' | 'desc'

export default function AircraftPage() {
  // Date range filter
  const [startDate, setStartDate] = useState(() => DateTime.now().startOf('day'))
  const [endDate, setEndDate] = useState(() => DateTime.fromISO('2026-01-27').endOf('day'))

  // Filters
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([])
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [tailSearch, setTailSearch] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('period_start')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Dialog state
  const [editingAllocation, setEditingAllocation] = useState<AllocationWithGroundTime | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Data fetching
  const { data: carriers } = useCarriers()
  const { data: airports } = useAirports()
  const { data: allocations, isLoading } = useAllocationsInRange(
    startDate,
    endDate,
    {
      carrierIds: selectedCarriers.length > 0 ? selectedCarriers : undefined,
      stationIatas: selectedStations.length > 0 ? selectedStations : undefined,
      tailNumber: tailSearch || undefined,
    }
  )

  // Delete mutation - no station context, will invalidate all station queries
  const deleteAllocationMutation = useDeleteAllocation()

  // Sort allocations
  const sortedAllocations = useMemo(() => {
    if (!allocations) return []

    return [...allocations].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'tail_number':
          comparison = a.tail_number.localeCompare(b.tail_number)
          break
        case 'carrier_name':
          comparison = a.carrier_name.localeCompare(b.carrier_name)
          break
        case 'station_iata':
          comparison = a.station_iata.localeCompare(b.station_iata)
          break
        case 'period_start':
          comparison = new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
          break
        case 'period_end':
          const aEnd = a.period_end ? new Date(a.period_end).getTime() : Infinity
          const bEnd = b.period_end ? new Date(b.period_end).getTime() : Infinity
          comparison = aEnd - bEnd
          break
        case 'ground_time_minutes':
          comparison = a.ground_time_minutes - b.ground_time_minutes
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [allocations, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDelete = async (allocation: AllocationWithGroundTime) => {
    if (!confirm(`Delete allocation for ${allocation.tail_number} at ${allocation.station_iata}?`)) {
      return
    }

    try {
      await deleteAllocationMutation.mutateAsync(allocation.id)
    } catch (error) {
      console.error('Failed to delete allocation:', error)
      alert('Failed to delete allocation')
    }
  }

  const exportToCSV = () => {
    if (!sortedAllocations.length) return

    const headers = [
      'Tail Number',
      'Carrier',
      'Station',
      'Airport',
      'Inbound Flight',
      'Outbound Flight',
      'Period Start',
      'Period End',
      'Ground Time',
    ]

    const rows = sortedAllocations.map((a) => [
      a.tail_number,
      a.carrier_name,
      a.station_iata,
      a.airport_name,
      a.inbound_flight_number || '',
      a.outbound_flight_number || '',
      a.period_start,
      a.period_end || 'Ongoing',
      formatGroundTime(a.ground_time_minutes),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aircraft-allocations-${startDate.toISODate()}-to-${endDate.toISODate()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) {
      return (
        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Aircraft Management</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              disabled={!sortedAllocations.length}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--primary)] hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Allocation
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
                Start Date
              </label>
              <input
                type="date"
                value={startDate.toISODate() || ''}
                onChange={(e) => {
                  const dt = DateTime.fromISO(e.target.value)
                  if (dt.isValid) setStartDate(dt)
                }}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
                End Date
              </label>
              <input
                type="date"
                value={endDate.toISODate() || ''}
                onChange={(e) => {
                  const dt = DateTime.fromISO(e.target.value)
                  if (dt.isValid) setEndDate(dt)
                }}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Carrier Filter */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
                Carrier
              </label>
              <select
                value={selectedCarriers.length === 1 ? selectedCarriers[0] : ''}
                onChange={(e) => setSelectedCarriers(e.target.value ? [e.target.value] : [])}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">All Carriers</option>
                {carriers?.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Station Filter */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
                Station
              </label>
              <select
                value={selectedStations.length === 1 ? selectedStations[0] : ''}
                onChange={(e) => setSelectedStations(e.target.value ? [e.target.value] : [])}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">All Stations</option>
                {airports?.map((airport) => (
                  <option key={airport.iata_code} value={airport.iata_code}>
                    {airport.iata_code} - {airport.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tail Number Search */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
                Tail Number
              </label>
              <input
                type="text"
                value={tailSearch}
                onChange={(e) => setTailSearch(e.target.value)}
                placeholder="Search tail..."
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {/* Quick date presets */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--muted-foreground)]">Quick:</span>
            <button
              onClick={() => {
                setStartDate(DateTime.now().startOf('day'))
                setEndDate(DateTime.now().endOf('day'))
              }}
              className="px-2 py-1 text-xs bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                setStartDate(DateTime.now().minus({ days: 1 }).startOf('day'))
                setEndDate(DateTime.now().minus({ days: 1 }).endOf('day'))
              }}
              className="px-2 py-1 text-xs bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                setStartDate(DateTime.now().startOf('week'))
                setEndDate(DateTime.now().endOf('week'))
              }}
              className="px-2 py-1 text-xs bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => {
                setStartDate(DateTime.now().minus({ days: 7 }).startOf('day'))
                setEndDate(DateTime.now().endOf('day'))
              }}
              className="px-2 py-1 text-xs bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                setStartDate(DateTime.now().startOf('month'))
                setEndDate(DateTime.now().endOf('month'))
              }}
              className="px-2 py-1 text-xs bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded transition-colors"
            >
              This Month
            </button>
            {(selectedCarriers.length > 0 || selectedStations.length > 0 || tailSearch) && (
              <button
                onClick={() => {
                  setSelectedCarriers([])
                  setSelectedStations([])
                  setTailSearch('')
                }}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {isLoading ? 'Loading...' : `${sortedAllocations.length} allocation${sortedAllocations.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Table */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50">
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('tail_number')}
                  >
                    <div className="flex items-center gap-1">
                      Tail #
                      <SortIcon field="tail_number" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('carrier_name')}
                  >
                    <div className="flex items-center gap-1">
                      Carrier
                      <SortIcon field="carrier_name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('station_iata')}
                  >
                    <div className="flex items-center gap-1">
                      Station
                      <SortIcon field="station_iata" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Flights
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('period_start')}
                  >
                    <div className="flex items-center gap-1">
                      Start
                      <SortIcon field="period_start" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('period_end')}
                  >
                    <div className="flex items-center gap-1">
                      End
                      <SortIcon field="period_end" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-[var(--secondary)]"
                    onClick={() => handleSort('ground_time_minutes')}
                  >
                    <div className="flex items-center gap-1">
                      Ground Time
                      <SortIcon field="ground_time_minutes" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading allocations...
                      </div>
                    </td>
                  </tr>
                ) : sortedAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                      No allocations found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  sortedAllocations.map((allocation) => (
                    <tr
                      key={allocation.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--secondary)]/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium">{allocation.tail_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: allocation.carrier_color }}
                          />
                          <span className="text-sm">{allocation.carrier_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono font-medium">{allocation.station_iata}</span>
                          <p className="text-xs text-[var(--muted-foreground)]">{allocation.airport_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {allocation.inbound_flight_number && (
                          <span className="font-mono">
                            {allocation.airline_code}{allocation.inbound_flight_number}
                          </span>
                        )}
                        {allocation.inbound_flight_number && allocation.outbound_flight_number && ' / '}
                        {allocation.outbound_flight_number && (
                          <span className="font-mono">
                            {allocation.airline_code}{allocation.outbound_flight_number}
                          </span>
                        )}
                        {!allocation.inbound_flight_number && !allocation.outbound_flight_number && '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatLocalDateTime(allocation.period_start, allocation.airport_timezone)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {allocation.period_end
                          ? formatLocalDateTime(allocation.period_end, allocation.airport_timezone)
                          : <span className="text-amber-400">Ongoing</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${getGroundTimeClass(allocation.ground_time_minutes)}`}>
                          {formatGroundTime(allocation.ground_time_minutes)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingAllocation(allocation)}
                            className="p-1.5 hover:bg-[var(--secondary)] rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(allocation)}
                            className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      {editingAllocation && (
        <AllocationDialog
          stationIata={editingAllocation.station_iata}
          allocation={editingAllocation}
          onClose={() => setEditingAllocation(null)}
        />
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <AllocationDialog
          stationIata={null}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
