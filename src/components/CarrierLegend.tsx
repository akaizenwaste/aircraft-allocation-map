'use client'

import { useState } from 'react'
import { useCarriers } from '@/hooks/useCarriers'

export function CarrierLegend() {
  const { data: carriers } = useCarriers()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!carriers) return null

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] rounded-lg shadow-lg">
      {/* Mobile: collapsible, Desktop: always expanded */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full flex items-center justify-between p-3"
      >
        <h3 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          Carriers
        </h3>
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
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Desktop header (non-interactive) */}
      <h3 className="hidden md:block text-xs font-medium text-[var(--muted-foreground)] p-3 pb-0 uppercase tracking-wide">
        Carriers
      </h3>

      {/* Carrier list - always visible on desktop, collapsible on mobile */}
      <div className={`space-y-1.5 p-3 pt-2 ${isExpanded ? 'block' : 'hidden'} md:block`}>
        {carriers.map((carrier) => (
          <div key={carrier.id} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: carrier.color }}
            />
            <span className="text-sm">{carrier.short_code || carrier.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
