'use client'

import { useState, useRef, useEffect } from 'react'
import { Popover } from '@base-ui/react'
import { useAirports } from '@/hooks/useAirports'
import { useCarriers } from '@/hooks/useCarriers'

interface CommandBarProps {
  carrierFilter: string[]
  onCarrierFilterChange: (carriers: string[]) => void
  showOnlyWithAircraft: boolean
  onShowOnlyWithAircraftChange: (show: boolean) => void
  highlightLongSits: number | null
  onHighlightLongSitsChange: (hours: number | null) => void
  onStationSelect: (iataCode: string) => void
}

export function CommandBar({
  carrierFilter,
  onCarrierFilterChange,
  showOnlyWithAircraft,
  onShowOnlyWithAircraftChange,
  highlightLongSits,
  onHighlightLongSitsChange,
  onStationSelect,
}: CommandBarProps) {
  const { data: airports } = useAirports()
  const { data: carriers } = useCarriers()

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Filter airports by search query
  const filteredAirports = airports?.filter(
    (airport) =>
      airport.iata_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      airport.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      airport.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10)

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCarrierToggle = (carrierId: string) => {
    if (carrierFilter.includes(carrierId)) {
      onCarrierFilterChange(carrierFilter.filter((id) => id !== carrierId))
    } else {
      onCarrierFilterChange([...carrierFilter, carrierId])
    }
  }

  const handleSelectAirport = (iataCode: string) => {
    onStationSelect(iataCode)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] rounded-lg p-2 shadow-lg">
      {/* Airport Search */}
      <div ref={searchRef} className="relative">
        <div className="flex items-center gap-2 bg-[var(--secondary)] rounded px-3 py-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--muted-foreground)]"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search airport (IATA/name)"
            className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery && filteredAirports && filteredAirports.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50">
            {filteredAirports.map((airport) => (
              <button
                key={airport.iata_code}
                onClick={() => handleSelectAirport(airport.iata_code)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--secondary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{airport.iata_code}</span>
                  <span className="text-sm text-[var(--muted-foreground)] truncate">
                    {airport.name}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {airport.city}, {airport.state}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Carrier Filter */}
      <Popover.Root>
        <Popover.Trigger className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--secondary)] rounded text-sm transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>
            Carriers
            {carrierFilter.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full">
                {carrierFilter.length}
              </span>
            )}
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-3 min-w-[200px] z-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Carrier</span>
                  {carrierFilter.length > 0 && (
                    <button
                      onClick={() => onCarrierFilterChange([])}
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {carriers?.map((carrier) => (
                  <label
                    key={carrier.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[var(--secondary)] px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={carrierFilter.includes(carrier.id)}
                      onChange={() => handleCarrierToggle(carrier.id)}
                      className="w-4 h-4 rounded border-[var(--border)]"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: carrier.color }}
                    />
                    <span className="text-sm">{carrier.name}</span>
                  </label>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Only with Aircraft Toggle */}
      <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--secondary)] rounded text-sm transition-colors">
        <input
          type="checkbox"
          checked={showOnlyWithAircraft}
          onChange={(e) => onShowOnlyWithAircraftChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--border)]"
        />
        <span>With aircraft only</span>
      </label>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Highlight Long Sits */}
      <Popover.Root>
        <Popover.Trigger className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--secondary)] rounded text-sm transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={highlightLongSits ? '#ef4444' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            Long sits
            {highlightLongSits && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                {highlightLongSits}h+
              </span>
            )}
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-3 min-w-[180px] z-50">
              <div className="space-y-2">
                <span className="text-sm font-medium block mb-2">
                  Highlight aircraft on ground
                </span>
                {[null, 4, 6, 8, 12].map((hours) => (
                  <label
                    key={hours ?? 'none'}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[var(--secondary)] px-2 py-1 rounded"
                  >
                    <input
                      type="radio"
                      name="highlightLongSits"
                      checked={highlightLongSits === hours}
                      onChange={() => onHighlightLongSitsChange(hours)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {hours === null ? 'Off' : `${hours}+ hours`}
                    </span>
                  </label>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
