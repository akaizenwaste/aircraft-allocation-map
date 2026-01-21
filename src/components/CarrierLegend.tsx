'use client'

import { useCarriers } from '@/hooks/useCarriers'

export function CarrierLegend() {
  const { data: carriers } = useCarriers()

  if (!carriers) return null

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] rounded-lg p-3 shadow-lg">
      <h3 className="text-xs font-medium text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
        Carriers
      </h3>
      <div className="space-y-1.5">
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
