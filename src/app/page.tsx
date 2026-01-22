'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CommandBar } from '@/components/CommandBar'
import { CarrierLegend } from '@/components/CarrierLegend'
import { StationDrawer } from '@/components/StationDrawer'
import { AllocationDialog } from '@/components/AllocationDialog'

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

  const handleStationClick = useCallback((iataCode: string) => {
    setSelectedStation(iataCode)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedStation(null)
  }, [])

  const handleAddTail = useCallback(() => {
    setShowAddTailDialog(true)
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Map */}
      <AircraftMap
        onStationClick={handleStationClick}
        selectedStation={selectedStation}
        carrierFilter={carrierFilter}
        showOnlyWithAircraft={showOnlyWithAircraft}
        highlightLongSits={highlightLongSits}
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

      {/* Floating Add Tail Button */}
      <button
        onClick={handleAddTail}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
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
        Add Tail
      </button>

      {/* Carrier Legend (bottom left) */}
      <CarrierLegend />

      {/* Station Drawer (right side) */}
      {selectedStation && (
        <StationDrawer
          stationIata={selectedStation}
          onClose={handleCloseDrawer}
        />
      )}

      {/* Global Add Tail Dialog */}
      {showAddTailDialog && (
        <AllocationDialog
          stationIata={null}
          allocation={null}
          onClose={() => setShowAddTailDialog(false)}
        />
      )}
    </div>
  )
}
