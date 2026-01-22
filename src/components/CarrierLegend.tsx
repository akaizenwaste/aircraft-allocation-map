'use client'

import { useCarriers } from '@/hooks/useCarriers'

export function CarrierLegend() {
  const { data: carriers } = useCarriers()

  if (!carriers) return null

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] rounded-lg p-2 sm:p-3 shadow-lg">
      <h3 className="text-xs font-medium text-[var(--muted-foreground)] mb-1.5 sm:mb-2 uppercase tracking-wide hidden sm:block">
        Carriers
      </h3>
      {/* Mobile: horizontal layout */}
      <div className="flex sm:hidden gap-2">
        {carriers.map((carrier) => (
          <div key={carrier.id} className="flex items-center gap-1" title={carrier.name}>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: carrier.color }}
            />
            <span className="text-xs">{carrier.short_code}</span>
          </div>
        ))}
      </div>
      {/* Desktop: vertical layout */}
      <div className="hidden sm:block space-y-1.5">
        {carriers.map((carrier) => (
          <div key={carrier.id} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: carrier.color }}
            />
            <span className="text-sm">{carrier.short_code || carrier.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
