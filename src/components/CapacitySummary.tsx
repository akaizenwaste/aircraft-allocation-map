'use client'

interface CapacitySummaryProps {
  totalAircraft: number
  totalCapacity: number | null // null if no stations have capacity configured
  className?: string
}

export function CapacitySummary({ totalAircraft, totalCapacity, className = '' }: CapacitySummaryProps) {
  const hasCapacity = totalCapacity !== null && totalCapacity > 0
  const available = hasCapacity ? totalCapacity - totalAircraft : null
  const isOverCapacity = hasCapacity && totalAircraft > totalCapacity
  const isNearCapacity = hasCapacity && !isOverCapacity && totalAircraft >= totalCapacity * 0.8

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-[var(--muted-foreground)]">Total Aircraft:</span>
        <span className="font-semibold">{totalAircraft}</span>
      </div>
      {hasCapacity && (
        <>
          <span className="text-[var(--border)]">|</span>
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted-foreground)]">Capacity:</span>
            <span className={`font-semibold ${
              isOverCapacity ? 'text-red-400' :
              isNearCapacity ? 'text-amber-400' :
              'text-green-400'
            }`}>
              {totalAircraft} / {totalCapacity}
            </span>
            {available !== null && (
              <span className={`text-xs ${
                isOverCapacity ? 'text-red-400' :
                isNearCapacity ? 'text-amber-400' :
                'text-[var(--muted-foreground)]'
              }`}>
                ({isOverCapacity ? `${Math.abs(available)} over` : `${available} available`})
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
