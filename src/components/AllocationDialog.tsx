'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog } from '@base-ui/react'
import { useCarriers } from '@/hooks/useCarriers'
import { useAirports } from '@/hooks/useAirports'
import { useCreateAllocation, useUpdateAllocation } from '@/hooks/useAllocations'
import type { AllocationWithGroundTime, AllocationFormData } from '@/types/database'
import { DateTime } from 'luxon'

interface AllocationDialogProps {
  stationIata: string | null
  allocation: AllocationWithGroundTime | null
  onClose: () => void
}

export function AllocationDialog({
  stationIata,
  allocation,
  onClose,
}: AllocationDialogProps) {
  const { data: carriers } = useCarriers()
  const { data: airports } = useAirports()

  // When stationIata is null, user needs to select a station
  const [selectedStation, setSelectedStation] = useState<string>(stationIata || '')
  const [stationSearch, setStationSearch] = useState('')
  const [showStationDropdown, setShowStationDropdown] = useState(false)

  const effectiveStation = stationIata || selectedStation
  const createAllocation = useCreateAllocation(effectiveStation)
  const updateAllocation = useUpdateAllocation(effectiveStation)

  const isEditing = !!allocation
  const needsStationSelection = !stationIata

  // Filter airports by search
  const filteredAirports = airports?.filter(
    (airport) =>
      airport.iata_code.toLowerCase().includes(stationSearch.toLowerCase()) ||
      airport.name.toLowerCase().includes(stationSearch.toLowerCase()) ||
      airport.city?.toLowerCase().includes(stationSearch.toLowerCase())
  ).slice(0, 8)

  const [formData, setFormData] = useState<AllocationFormData>({
    carrier_id: allocation?.carrier_id || '',
    tail_number: allocation?.tail_number || '',
    airline_code: allocation?.airline_code || 'AA',
    inbound_flight_number: allocation?.inbound_flight_number || '',
    outbound_flight_number: allocation?.outbound_flight_number || '',
    arrival_time_local: allocation?.arrival_time_local
      ? DateTime.fromISO(allocation.arrival_time_local).toFormat("yyyy-MM-dd'T'HH:mm")
      : DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"),
    departure_time_local: allocation?.departure_time_local
      ? DateTime.fromISO(allocation.departure_time_local).toFormat("yyyy-MM-dd'T'HH:mm")
      : null,
  })

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

    if (!formData.arrival_time_local) {
      newErrors.arrival_time_local = 'Arrival time is required'
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
        arrival_time_local: new Date(formData.arrival_time_local).toISOString(),
        departure_time_local: formData.departure_time_local
          ? new Date(formData.departure_time_local).toISOString()
          : null,
        // Include station_iata for global add flow
        ...(needsStationSelection && { station_iata: selectedStation }),
      }

      if (isEditing && allocation) {
        await updateAllocation.mutateAsync({
          id: allocation.id,
          data: submitData,
        })
      } else {
        await createAllocation.mutateAsync(submitData)
      }

      onClose()
    } catch (error) {
      console.error('Error saving allocation:', error)
      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
          setErrors({ tail_number: 'This tail number already exists at another station' })
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
                  htmlFor="arrival_time_local"
                  className="block text-sm font-medium mb-1"
                >
                  Arrival Time (Local) *
                </label>
                <input
                  type="datetime-local"
                  id="arrival_time_local"
                  name="arrival_time_local"
                  value={formData.arrival_time_local}
                  onChange={handleChange}
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
                {errors.arrival_time_local && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.arrival_time_local}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="departure_time_local"
                  className="block text-sm font-medium mb-1"
                >
                  Departure Time (Local)
                </label>
                <input
                  type="datetime-local"
                  id="departure_time_local"
                  name="departure_time_local"
                  value={formData.departure_time_local || ''}
                  onChange={handleChange}
                  className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

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
