import { DateTime } from 'luxon'

export function formatGroundTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function getGroundTimeClass(minutes: number): string {
  if (minutes >= 480) return 'badge-critical' // 8+ hours
  if (minutes >= 240) return 'badge-warning' // 4+ hours
  return 'badge-normal'
}

export function formatLocalTime(isoString: string, timezone: string): string {
  return DateTime.fromISO(isoString)
    .setZone(timezone)
    .toFormat('HH:mm')
}

export function formatLocalDateTime(isoString: string, timezone: string): string {
  return DateTime.fromISO(isoString)
    .setZone(timezone)
    .toFormat('MMM d, HH:mm')
}

export function getMarkerSize(count: number): number {
  if (count === 0) return 20
  if (count <= 3) return 36
  if (count <= 10) return 48
  if (count <= 25) return 60
  return 72
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Generate SVG for ring marker with carrier segments
export function generateRingMarkerSVG(
  carrierBreakdown: { carrier_color: string; count: number }[],
  totalCount: number,
  size: number
): string {
  if (totalCount === 0) {
    // Empty marker - just a small dot
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#27272a" stroke="#3f3f46" stroke-width="1"/>
    </svg>`
  }

  const cx = size / 2
  const cy = size / 2
  const outerRadius = size / 2 - 2
  const innerRadius = outerRadius * 0.6
  const ringWidth = outerRadius - innerRadius

  let paths = ''
  let currentAngle = -90 // Start from top

  carrierBreakdown.forEach((carrier) => {
    const percentage = carrier.count / totalCount
    const angle = percentage * 360
    const endAngle = currentAngle + angle

    const startAngleRad = (currentAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1Outer = cx + outerRadius * Math.cos(startAngleRad)
    const y1Outer = cy + outerRadius * Math.sin(startAngleRad)
    const x2Outer = cx + outerRadius * Math.cos(endAngleRad)
    const y2Outer = cy + outerRadius * Math.sin(endAngleRad)

    const x1Inner = cx + innerRadius * Math.cos(endAngleRad)
    const y1Inner = cy + innerRadius * Math.sin(endAngleRad)
    const x2Inner = cx + innerRadius * Math.cos(startAngleRad)
    const y2Inner = cy + innerRadius * Math.sin(startAngleRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    paths += `<path d="M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner} Z" fill="${carrier.carrier_color}"/>`

    currentAngle = endAngle
  })

  // Center circle with count
  const centerRadius = innerRadius - 2
  const fontSize = Math.max(10, size / 3)

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="${centerRadius}" fill="#18181b"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fafafa" font-size="${fontSize}" font-weight="600" font-family="system-ui, sans-serif">${totalCount}</text>
  </svg>`
}
