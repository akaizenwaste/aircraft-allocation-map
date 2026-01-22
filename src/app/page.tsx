'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CommandBar } from '@/components/CommandBar'
import { CarrierLegend } from '@/components/CarrierLegend'
import { LongestSits } from '@/components/LongestSits'
import { StationDrawer } from '@/components/StationDrawer'
import { AddTailDialog } from '@/components/AddTailDialog'

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
        onAddTail={() => setShowAddTailDialog(true)}
      />

      {/* Carrier Legend (bottom left) */}
      <CarrierLegend />

      {/* Longest Sits (bottom right) */}
      <LongestSits onStationClick={handleStationClick} />

      {/* Station Drawer (right side) */}
      {selectedStation && (
        <StationDrawer
          stationIata={selectedStation}
          onClose={handleCloseDrawer}
        />
      )}

      {/* Add Tail Dialog */}
      {showAddTailDialog && (
        <AddTailDialog onClose={() => setShowAddTailDialog(false)} />
      )}
    </div>
  )
}
