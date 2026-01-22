'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog } from '@base-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCarriers } from '@/hooks/useCarriers'
import { useAirports, useAirport } from '@/hooks/useAirports'
import { useCreateAllocation, useUpdateAllocation, useAircraftAllocations, useStationAllocations } from '@/hooks/useAllocations'
import { useOverlapValidation } from '@/hooks/useOverlapValidation'
import { supabase } from '@/lib/supabase'
import type { AllocationWithGroundTime, AllocationFormData } from '@/types/database'
import { DateTime } from 'luxon'

interface AllocationDialogProps {
  stationIata: string | null
  allocation?: AllocationWithGroundTime | null
  allocationId?: string | null  // For editing by ID (from AircraftPanel)
  prefillTailNumber?: string | null  // For adding new period with tail pre-filled
  onClose: () => void
}

export function AllocationDialog({
  stationIata,
  allocation,
  allocationId,
  prefillTailNumber,
  onClose,
}: AllocationDialogProps) {
  const { data: carriers } = useCarriers()
  const { data: airports } = useAirports()

  // Load allocation by ID if provided
  const { data: loadedAllocation } = useQuery({
    queryKey: ['allocation', allocationId],
    queryFn: async () => {
      if (!allocationId) return null
      const { data, error } = await supabase
        .from('allocations_with_ground_time')
        .select('*')
        .eq('id', allocationId)
        .single()
      if (error) throw error
      return data as AllocationWithGroundTime
    },
    enabled: !!allocationId,
  })

  // Use loaded allocation or passed allocation
  const effectiveAllocation = loadedAllocation || allocation || null

  // When stationIata is null, user needs to select a station
  const [selectedStation, setSelectedStation] = useState<string>(stationIata || effectiveAllocation?.station_iata || '')
  const [stationSearch, setStationSearch] = useState('')
  const [showStationDropdown, setShowStationDropdown] = useState(false)

  const effectiveStation = stationIata || selectedStation
  const createAllocation = useCreateAllocation(effectiveStation)
  const updateAllocation = useUpdateAllocation(effectiveStation)

  // Fetch airport for capacity info
  const { data: airport } = useAirport(effectiveStation || null)

  const isEditing = !!effectiveAllocation
  const needsStationSelection = !stationIata && !effectiveAllocation

  // Filter airports by search
  const filteredAirports = airports?.filter(
    (airport) =>
      airport.iata_code.toLowerCase().includes(stationSearch.toLowerCase()) ||
      airport.name.toLowerCase().includes(stationSearch.toLowerCase()) ||
      airport.city?.toLowerCase().includes(stationSearch.toLowerCase())
  ).slice(0, 8)

  const [formData, setFormData] = useState<AllocationFormData>({
    carrier_id: effectiveAllocation?.carrier_id || '',
    tail_number: effectiveAllocation?.tail_number || prefillTailNumber || '',
    airline_code: effectiveAllocation?.airline_code || 'AA',
    inbound_flight_number: effectiveAllocation?.inbound_flight_number || '',
    outbound_flight_number: effectiveAllocation?.outbound_flight_number || '',
    period_start: effectiveAllocation?.period_start
      ? DateTime.fromISO(effectiveAllocation.period_start).toFormat("yyyy-MM-dd'T'HH:mm")
      : DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"),
    period_end: effectiveAllocation?.period_end
      ? DateTime.fromISO(effectiveAllocation.period_end).toFormat("yyyy-MM-dd'T'HH:mm")
      : null,
  })

  // Update form data when loaded allocation changes
  useEffect(() => {
    if (loadedAllocation) {
      setFormData({
        carrier_id: loadedAllocation.carrier_id,
        tail_number: loadedAllocation.tail_number,
        airline_code: loadedAllocation.airline_code || 'AA',
        inbound_flight_number: loadedAllocation.inbound_flight_number || '',
        outbound_flight_number: loadedAllocation.outbound_flight_number || '',
        period_start: DateTime.fromISO(loadedAllocation.period_start).toFormat("yyyy-MM-dd'T'HH:mm"),
        period_end: loadedAllocation.period_end
          ? DateTime.fromISO(loadedAllocation.period_end).toFormat("yyyy-MM-dd'T'HH:mm")
          : null,
      })
      setSelectedStation(loadedAllocation.station_iata)
    }
  }, [loadedAllocation])

  // Fetch all allocations for this aircraft for overlap validation
  const { data: aircraftAllocations } = useAircraftAllocations(formData.tail_number || null)

  // Overlap validation
  const overlapCheck = useOverlapValidation({
    tailNumber: formData.tail_number,
    periodStart: formData.period_start,
    periodEnd: formData.period_end,
    existingAllocations: aircraftAllocations,
    excludeId: effectiveAllocation?.id,
  })

  // Fetch current allocations at station for capacity check (at period_start time)
  const capacityCheckTime = formData.period_start
    ? DateTime.fromFormat(formData.period_start, "yyyy-MM-dd'T'HH:mm")
    : DateTime.now()
  const { data: stationAllocations } = useStationAllocations(effectiveStation || null, capacityCheckTime)

  // Capacity check
  const totalSpots = airport?.total_spots
  const currentCount = stationAllocations?.length || 0
  const isAtCapacity = totalSpots !== null && totalSpots !== undefined && currentCount >= totalSpots

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)

  // Set first carrier as default if not editing
  useEffect(() => {
    if (!isEditing && carriers && carriers.length > 0 && !formData.carrier_id) {
      setFormData((prev) => ({ ...prev, carrier_id: carriers[0].id }))
    }
  }, [carriers, isEditing, formData.carrier_id])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (needsStationSelection && !selectedStation) {
      newErrors.station = 'Station is required'
    }

    if (!formData.carrier_id) {
      newErrors.carrier_id = 'Carrier is required'
    }

    if (!formData.tail_number.trim()) {
      newErrors.tail_number = 'Tail number is required'
    }

    if (!formData.period_start) {
      newErrors.period_start = 'Start time is required'
    }

    // Check for overlap
    if (overlapCheck.hasOverlap) {
      newErrors.period_start = overlapCheck.message || 'Time period overlaps with existing allocation'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        period_start: new Date(formData.period_start).toISOString(),
        period_end: formData.period_end
          ? new Date(formData.period_end).toISOString()
          : null,
        // Include station_iata for global add flow
        ...(needsStationSelection && { station_iata: selectedStation }),
      }

      if (isEditing && effectiveAllocation) {
        await updateAllocation.mutateAsync({
          id: effectiveAllocation.id,
          data: submitData,
        })
      } else {
        await createAllocation.mutateAsync(submitData)
      }

      onClose()
    } catch (error) {
      console.error('Error saving allocation:', error)
      if (error instanceof Error) {
        if (error.message.includes('no_overlapping_periods') || error.message.includes('exclusion')) {
          setErrors({ period_start: 'This time period overlaps with another allocation for this aircraft' })
        } else {
          setErrors({ submit: error.message })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when field changes
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-6">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {isEditing ? 'Edit Aircraft Allocation' : 'Add Aircraft Allocation'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--muted-foreground)] mb-4">
            {isEditing
              ? `Editing ${allocation?.tail_number} at ${effectiveStation}`
              : effectiveStation
                ? `Add a new aircraft to ${effectiveStation}`
                : 'Select a station and add aircraft details'}
          </Dialog.Description>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Station Select (only when no station provided) */}
            {needsStationSelection && (
              <div className="relative">
                <label
                  htmlFor="station"
                  className="block text-sm font-medium mb-1"
                >
                  Station *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="station"
                    value={selectedStation || stationSearch}
                    onChange={(e) => {
                      setStationSearch(e.target.value)
                      setSelectedStation('')
                      setShowStationDropdown(true)
                      if (errors.station) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.station
                          return next
                        })
                      }
                    }}
                    onFocus={() => setShowStationDropdown(true)}
                    placeholder="Search airport (IATA/name)..."
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  {selectedStation && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStation('')
                        setStationSearch('')
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {showStationDropdown && stationSearch && !selectedStation && filteredAirports && filteredAirports.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                    {filteredAirports.map((airport) => (
                      <button
                        key={airport.iata_code}
                        type="button"
                        onClick={() => {
                          setSelectedStation(airport.iata_code)
                          setStationSearch('')
                          setShowStationDropdown(false)
                        }}
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
                {errors.station && (
                  <p className="text-red-400 text-xs mt-1">{errors.station}</p>
                )}
              </div>
            )}

            {/* Carrier Select */}
            <div>
              <label
                htmlFor="carrier_id"
                className="block text-sm font-medium mb-1"
              >
                Carrier *
              </label>
              <select
                id="carrier_id"
                name="carrier_id"
                value={formData.carrier_id}
                onChange={handleChange}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Select carrier...</option>
                {carriers?.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name} ({carrier.short_code})
                  </option>
                ))}
              </select>
              {errors.carrier_id && (
                <p className="text-red-400 text-xs mt-1">{errors.carrier_id}</p>
              )}
            </div>

            {/* Tail Number */}
            <div>
              <label
                htmlFor="tail_number"
                className="block text-sm font-medium mb-1"
              >
                Tail Number *
              </label>
              <input
                type="text"
                id="tail_number"
                name="tail_number"
                value={formData.tail_number}
                onChange={handleChange}
                placeholder="N123AB"
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                disabled={isEditing}
              />
              {errors.tail_number && (
                <p className="text-red-400 text-xs mt-1">{errors.tail_number}</p>
              )}
            </div>

            {/* Airline Code */}
            <div>
              <label
                htmlFor="airline_code"
                className="block text-sm font-medium mb-1"
              >
                Airline Code
              </label>
              <input
                type="text"
                id="airline_code"
                name="airline_code"
                value={formData.airline_code}
                onChange={handleChange}
                placeholder="AA"
                maxLength={2}
                className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Flight Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inbound_flight_number"
                  className="block text-sm font-medium mb-1"
                >
                  Inbound Flight
                </label>
                <input
                  type="text"
                  id="inbound_flight_number"
                  name="inbound_flight_number"
                  value={formData.inbound_flight_number}
                  onChange={handleChange}
                  placeholder="4401"
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label
                  htmlFor="outbound_flight_number"
                  className="block text-sm font-medium mb-1"
                >
                  Outbound Flight
                </label>
                <input
                  type="text"
                  id="outbound_flight_number"
                  name="outbound_flight_number"
                  value={formData.outbound_flight_number}
                  onChange={handleChange}
                  placeholder="4402"
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="period_start"
                  className="block text-sm font-medium mb-1"
                >
                  Period Start *
                </label>
                <input
                  type="datetime-local"
                  id="period_start"
                  name="period_start"
                  value={formData.period_start}
                  onChange={handleChange}
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
                {errors.period_start && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.period_start}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="period_end"
                  className="block text-sm font-medium mb-1"
                >
                  Period End
                </label>
                <input
                  type="datetime-local"
                  id="period_end"
                  name="period_end"
                  value={formData.period_end || ''}
                  onChange={handleChange}
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            {/* Overlap Warning */}
            {overlapCheck.hasOverlap && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  {overlapCheck.message}
                </p>
              </div>
            )}

            {/* Capacity Warning */}
            {isAtCapacity && !isEditing && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-400 text-sm">
                  Station is at capacity ({currentCount}/{totalSpots} spots). You can still add this aircraft.
                </span>
              </div>
            )}

            {errors.submit && (
              <p className="text-red-400 text-sm p-2 bg-red-500/10 rounded">
                {errors.submit}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Dialog.Close className="px-4 py-2 text-sm hover:bg-[var(--secondary)] rounded transition-colors">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Add Aircraft'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
