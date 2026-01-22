'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { DateTime } from 'luxon'
import { NavBar } from '@/components/NavBar'
import { CommandBar } from '@/components/CommandBar'
import { CarrierLegend } from '@/components/CarrierLegend'
import { StationDrawer } from '@/components/StationDrawer'
import { AllocationDialog } from '@/components/AllocationDialog'
import { TimelineSlider } from '@/components/TimelineSlider'
import { AircraftPanel } from '@/components/AircraftPanel'
import { CapacitySummary } from '@/components/CapacitySummary'
import { useAllocationSummary } from '@/hooks/useAllocations'

// Dynamic import for Map to avoid SSR issues with Mapbox
const AircraftMap = dynamic(() => import('@/components/Map').then((mod) => mod.AircraftMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--background)]">
      <div className="text-[var(--muted-foreground)]">Loading map...</div>
    </div>
  ),
})

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [carrierFilter, setCarrierFilter] = useState<string[]>([])
  const [showOnlyWithAircraft, setShowOnlyWithAircraft] = useState(false)
  const [highlightLongSits, setHighlightLongSits] = useState<number | null>(null)
  const [showAddTailDialog, setShowAddTailDialog] = useState(false)

  // Timeline state
  const [viewTime, setViewTime] = useState<DateTime>(() => DateTime.now())

  // Get allocation summary for capacity totals
  const { data: allocationSummary } = useAllocationSummary(viewTime)

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

  // Aircraft panel state
  const [selectedTailNumber, setSelectedTailNumber] = useState<string | null>(null)
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null)
  const [addingPeriodForTail, setAddingPeriodForTail] = useState<string | null>(null)

  const handleStationClick = useCallback((iataCode: string) => {
    setSelectedStation(iataCode)
    setSelectedTailNumber(null) // Close aircraft panel when selecting a station
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedStation(null)
  }, [])

  const handleAddTail = useCallback(() => {
    setShowAddTailDialog(true)
  }, [])

  // Aircraft panel handlers
  const handleAircraftClick = useCallback((tailNumber: string) => {
    setSelectedTailNumber(tailNumber)
    setSelectedStation(null) // Close station drawer when selecting an aircraft
  }, [])

  const handleCloseAircraftPanel = useCallback(() => {
    setSelectedTailNumber(null)
  }, [])

  const handleEditPeriod = useCallback((allocationId: string) => {
    setEditingAllocationId(allocationId)
  }, [])

  const handleAddPeriod = useCallback((tailNumber: string) => {
    setAddingPeriodForTail(tailNumber)
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <NavBar />

      {/* Main content area */}
      <div className="flex-1 relative flex">
        {/* Map takes remaining space */}
        <div className="flex-1 relative">
          <AircraftMap
            onStationClick={handleStationClick}
            onMapClick={handleCloseDrawer}
            selectedStation={selectedStation}
            carrierFilter={carrierFilter}
            showOnlyWithAircraft={showOnlyWithAircraft}
            highlightLongSits={highlightLongSits}
            viewTime={viewTime}
          />

          {/* Command Bar (top center) */}
          <CommandBar
            carrierFilter={carrierFilter}
            onCarrierFilterChange={setCarrierFilter}
            showOnlyWithAircraft={showOnlyWithAircraft}
            onShowOnlyWithAircraftChange={setShowOnlyWithAircraft}
            highlightLongSits={highlightLongSits}
            onHighlightLongSitsChange={setHighlightLongSits}
            onStationSelect={handleStationClick}
          />

          {/* Floating Add Tail Button - positioned above timeline */}
          <button
            onClick={handleAddTail}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Add Tail</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Carrier Legend (bottom left) */}
          <CarrierLegend />

          {/* Capacity Summary (top left) - hidden on mobile */}
          <div className="hidden sm:block absolute top-4 left-4 z-30 bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-4 py-2 shadow-lg">
            <CapacitySummary
              totalAircraft={capacityTotals.totalAircraft}
              totalCapacity={capacityTotals.totalCapacity}
            />
          </div>
        </div>

        {/* Station Drawer (right side) */}
        {selectedStation && (
          <StationDrawer
            stationIata={selectedStation}
            viewTime={viewTime}
            onClose={handleCloseDrawer}
            onAircraftClick={handleAircraftClick}
          />
        )}

        {/* Aircraft Panel (right side) */}
        {selectedTailNumber && (
          <AircraftPanel
            tailNumber={selectedTailNumber}
            onClose={handleCloseAircraftPanel}
            onEditPeriod={handleEditPeriod}
            onAddPeriod={handleAddPeriod}
          />
        )}
      </div>

      {/* Timeline Slider (bottom) */}
      <TimelineSlider viewTime={viewTime} onViewTimeChange={setViewTime} />

      {/* Global Add Tail Dialog */}
      {showAddTailDialog && (
        <AllocationDialog
          stationIata={null}
          allocation={null}
          onClose={() => setShowAddTailDialog(false)}
        />
      )}

      {/* Edit Period Dialog */}
      {editingAllocationId && (
        <AllocationDialog
          stationIata={null}
          allocationId={editingAllocationId}
          onClose={() => setEditingAllocationId(null)}
        />
      )}

      {/* Add Period for specific tail Dialog */}
      {addingPeriodForTail && (
        <AllocationDialog
          stationIata={null}
          allocation={null}
          prefillTailNumber={addingPeriodForTail}
          onClose={() => setAddingPeriodForTail(null)}
        />
      )}
    </div>
  )
}
