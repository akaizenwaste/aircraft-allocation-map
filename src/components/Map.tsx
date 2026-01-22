'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { DateTime } from 'luxon'
import { useAllocationSummary } from '@/hooks/useAllocations'
import { generateRingMarkerSVG, getMarkerSize } from '@/lib/utils'
import type { AllocationSummary } from '@/types/database'

interface MapProps {
  onStationClick: (iataCode: string) => void
  selectedStation: string | null
  carrierFilter: string[]
  showOnlyWithAircraft: boolean
  highlightLongSits: number | null
  viewTime: DateTime
}


export function AircraftMap({
  onStationClick,
  selectedStation,
  carrierFilter,
  showOnlyWithAircraft,
  highlightLongSits,
  viewTime,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<globalThis.Map<string, { marker: mapboxgl.Marker; summary: AllocationSummary }>>(new globalThis.Map())
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  const { data: allocationSummary, isLoading } = useAllocationSummary(viewTime)

  const [mapLoaded, setMapLoaded] = useState(false)

  // Update marker element
  const updateMarkerElement = useCallback(
    (el: HTMLElement, summary: AllocationSummary) => {
      // Filter by carrier if filter is active
      let filteredBreakdown = summary.carrier_breakdown
      let filteredTotal = summary.total_count

      if (carrierFilter.length > 0) {
        filteredBreakdown = summary.carrier_breakdown.filter((c) =>
          carrierFilter.includes(c.carrier_id)
        )
        filteredTotal = filteredBreakdown.reduce((sum, c) => sum + c.count, 0)
      }

      const size = getMarkerSize(filteredTotal)
      const svg = generateRingMarkerSVG(filteredBreakdown, filteredTotal, size)

      el.innerHTML = svg
      el.style.width = `${size}px`
      el.style.height = `${size}px`

      // Reset styles
      el.style.boxShadow = ''
      el.style.borderRadius = ''

      // Capacity-based outline (only when total_spots is configured)
      if (summary.total_spots !== null && summary.total_spots !== undefined) {
        const capacityRatio = filteredTotal / summary.total_spots
        el.style.borderRadius = '50%'
        if (capacityRatio > 1) {
          // Over capacity - red
          el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.7)'
        } else if (capacityRatio >= 0.8) {
          // Near capacity (80%+) - amber
          el.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.7)'
        } else {
          // Available - green
          el.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.5)'
        }
      }

      // Add highlight ring for long sits (overrides capacity)
      if (highlightLongSits && summary.total_count > 0) {
        el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)'
        el.style.borderRadius = '50%'
      }

      // Highlight selected station (overrides all)
      if (selectedStation === summary.station_iata) {
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.8)'
        el.style.borderRadius = '50%'
      }
    },
    [carrierFilter, highlightLongSits, selectedStation]
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      minZoom: 1,
      maxZoom: 18,
      dragRotate: false,
      touchPitch: false,
    })

    // Set default cursor to pointer instead of grab hand
    mapRef.current.getCanvas().style.cursor = 'default'

    mapRef.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create popup content
  const createPopupContent = useCallback((summary: AllocationSummary): string => {
    const carrierRows = summary.carrier_breakdown
      .slice(0, 5)
      .map(
        (c) => `
        <div class="flex items-center gap-2 text-sm">
          <span class="w-3 h-3 rounded-full" style="background-color: ${c.carrier_color}"></span>
          <span class="text-zinc-300">${c.carrier_name}</span>
          <span class="ml-auto font-medium">${c.count}</span>
        </div>
      `
      )
      .join('')

    // Capacity display
    let capacityHtml = ''
    if (summary.total_spots !== null && summary.total_spots !== undefined) {
      const available = summary.total_spots - summary.total_count
      const isOverCapacity = summary.total_count > summary.total_spots
      const isAtCapacity = summary.total_count === summary.total_spots

      let statusColor = 'text-green-400'
      let statusText = `${available} spots available`

      if (isOverCapacity) {
        statusColor = 'text-red-400'
        statusText = `${Math.abs(available)} over capacity`
      } else if (isAtCapacity) {
        statusColor = 'text-amber-400'
        statusText = 'At capacity'
      }

      capacityHtml = `
        <div class="mt-2 pt-2 border-t border-zinc-700">
          <div class="flex items-center justify-between text-sm">
            <span class="text-zinc-400">Capacity</span>
            <span class="${statusColor}">${summary.total_count} / ${summary.total_spots}</span>
          </div>
          <div class="text-xs ${statusColor} mt-1">${statusText}</div>
        </div>
      `
    }

    return `
      <div class="p-3 min-w-[200px]">
        <div class="font-semibold text-base mb-1">${summary.station_iata}</div>
        <div class="text-sm text-zinc-400 mb-3">${summary.airport_name}</div>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl font-bold">${summary.total_count}</span>
          <span class="text-zinc-400 text-sm">aircraft</span>
        </div>
        ${
          summary.carrier_breakdown.length > 0
            ? `<div class="space-y-1 border-t border-zinc-700 pt-2">${carrierRows}</div>`
            : '<div class="text-zinc-500 text-sm">No aircraft allocated</div>'
        }
        ${capacityHtml}
      </div>
    `
  }, [])

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !allocationSummary) return

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current.clear()

    // Add markers for each airport
    allocationSummary.forEach((summary, iataCode) => {
      // Default: hide stations with no capacity configured AND no aircraft
      const hasCapacity = summary.total_spots !== null && summary.total_spots !== undefined
      const hasAircraft = summary.total_count > 0
      if (!hasCapacity && !hasAircraft) return

      // Filter: only show airports with aircraft if filter is on
      if (showOnlyWithAircraft && summary.total_count === 0) return

      // Filter by carrier
      if (carrierFilter.length > 0) {
        const hasMatchingCarrier = summary.carrier_breakdown.some((c) =>
          carrierFilter.includes(c.carrier_id)
        )
        if (!hasMatchingCarrier && summary.total_count > 0) return
      }

      const el = document.createElement('div')
      el.className = 'marker-container cursor-pointer'

      updateMarkerElement(el, summary)

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([summary.lng, summary.lat])
        .addTo(mapRef.current!)

      // Hover popup
      el.addEventListener('mouseenter', () => {
        if (popupRef.current) {
          popupRef.current.remove()
        }

        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15,
        })
          .setLngLat([summary.lng, summary.lat])
          .setHTML(createPopupContent(summary))
          .addTo(mapRef.current!)
      })

      el.addEventListener('mouseleave', () => {
        if (popupRef.current) {
          popupRef.current.remove()
          popupRef.current = null
        }
      })

      // Click handler
      el.addEventListener('click', () => {
        onStationClick(iataCode)
      })

      markersRef.current.set(iataCode, { marker, summary })
    })
  }, [
    allocationSummary,
    mapLoaded,
    carrierFilter,
    showOnlyWithAircraft,
    highlightLongSits,
    selectedStation,
    updateMarkerElement,
    createPopupContent,
    onStationClick,
  ])

  // Fly to selected station
  useEffect(() => {
    if (!mapRef.current || !selectedStation || !allocationSummary) return

    const summary = allocationSummary.get(selectedStation)
    if (summary) {
      mapRef.current.flyTo({
        center: [summary.lng, summary.lat],
        zoom: 8,
        duration: 1000,
      })
    }
  }, [selectedStation, allocationSummary])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Loading map data...</div>
        </div>
      )}
    </div>
  )
}
