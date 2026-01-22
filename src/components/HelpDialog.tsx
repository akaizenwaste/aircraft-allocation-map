'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react'

interface HelpSection {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

const helpSections: HelpSection[] = [
  {
    id: 'overview',
    title: 'Getting Started',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Disclaimer
          </p>
          <p className="text-amber-300/80 text-sm mt-1">
            This is an informational tool only. Do not use this application for flight planning, dispatch, or any operational decision-making purposes.
          </p>
        </div>
        <p>
          The Aircraft Allocation Map helps you track and manage aircraft positions across airports in real-time.
        </p>
        <div className="space-y-2">
          <h4 className="font-medium">Main Pages:</h4>
          <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
            <li><strong className="text-[var(--foreground)]">Map</strong> - Interactive visual dashboard showing aircraft at airports</li>
            <li><strong className="text-[var(--foreground)]">Weather</strong> - Winter weather forecasts that may impact operations</li>
            <li><strong className="text-[var(--foreground)]">Capacity</strong> - Set and manage parking spot limits per station</li>
            <li><strong className="text-[var(--foreground)]">Aircraft</strong> - Table view of all allocations with filtering and export</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'map',
    title: 'Using the Map',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <h4 className="font-medium">Airport Markers</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Marker size indicates the number of aircraft at that station</li>
          <li>Colored ring segments show the breakdown by carrier</li>
          <li>Border colors indicate capacity status:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><span className="text-green-400">Green</span> - Under capacity</li>
              <li><span className="text-amber-400">Amber</span> - Near or at capacity</li>
              <li><span className="text-red-400">Red</span> - Over capacity</li>
            </ul>
          </li>
        </ul>
        <h4 className="font-medium mt-4">Command Bar (Top)</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li><strong className="text-[var(--foreground)]">Search</strong> - Jump to any airport by IATA code, name, or city</li>
          <li><strong className="text-[var(--foreground)]">Carrier Filter</strong> - Show only aircraft from specific airlines</li>
          <li><strong className="text-[var(--foreground)]">With Aircraft Only</strong> - Hide empty airports</li>
          <li><strong className="text-[var(--foreground)]">Long Sits</strong> - Highlight aircraft on ground for 4h, 6h, 8h, or 12h+</li>
        </ul>
        <h4 className="font-medium mt-4">Longest Sits Widget (Bottom Right)</h4>
        <p className="text-[var(--muted-foreground)]">
          Shows the top 10 longest aircraft sits nationwide. Click any entry to navigate to that station on the map.
        </p>
      </div>
    ),
  },
  {
    id: 'timeline',
    title: 'Timeline Slider',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          The timeline slider at the bottom controls which allocations are visible based on the selected date and time.
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li><strong className="text-[var(--foreground)]">Date Picker</strong> - Change the viewing date</li>
          <li><strong className="text-[var(--foreground)]">Time Slider</strong> - Adjust the time of day (00:00 - 23:59)</li>
          <li><strong className="text-[var(--foreground)]">Jump to Now</strong> - Return to the current date and time</li>
        </ul>
        <p className="text-[var(--muted-foreground)] mt-2">
          Only aircraft that are &quot;on ground&quot; at the selected time will appear on the map. Ground time is calculated based on each allocation&apos;s start and end times.
        </p>
      </div>
    ),
  },
  {
    id: 'allocations',
    title: 'Managing Allocations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <h4 className="font-medium">Adding Aircraft</h4>
        <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Click the blue <strong className="text-[var(--foreground)]">+ Add Tail</strong> button (bottom right)</li>
          <li>Select a station by searching for the airport</li>
          <li>Choose the carrier and enter the tail number</li>
          <li>Set the period start time (and optionally end time)</li>
          <li>Add inbound/outbound flight numbers if known</li>
          <li>Click <strong className="text-[var(--foreground)]">Add Aircraft</strong> to save</li>
        </ol>
        <h4 className="font-medium mt-4">Editing or Deleting</h4>
        <p className="text-[var(--muted-foreground)]">
          Click an airport marker to open the station drawer, then use the edit (pencil) or delete (trash) buttons next to each aircraft.
        </p>
        <h4 className="font-medium mt-4">Overlap Protection</h4>
        <p className="text-[var(--muted-foreground)]">
          The system prevents double-booking aircraft. If you try to assign an aircraft to two stations at the same time, you&apos;ll see a warning.
        </p>
      </div>
    ),
  },
  {
    id: 'station-drawer',
    title: 'Station Details',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          Click any airport marker to open the station drawer on the right side of the screen.
        </p>
        <h4 className="font-medium">What You&apos;ll See:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Airport name, IATA code, location, and timezone</li>
          <li>Total aircraft count with carrier breakdown</li>
          <li>Capacity status (e.g., &quot;3 of 5 spots&quot;)</li>
          <li>Sortable list of all aircraft at the station</li>
        </ul>
        <h4 className="font-medium mt-4">Ground Time Colors:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li><span className="text-green-400">Green</span> - Less than 4 hours</li>
          <li><span className="text-yellow-400">Yellow</span> - 4 to 8 hours</li>
          <li><span className="text-red-400">Red</span> - More than 8 hours</li>
        </ul>
        <p className="text-[var(--muted-foreground)] mt-2">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--secondary)] rounded text-xs">ESC</kbd> to close the drawer.
        </p>
      </div>
    ),
  },
  {
    id: 'aircraft-panel',
    title: 'Aircraft History',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          Click on any aircraft in a station drawer to view its full allocation history.
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>See all past and current allocation periods</li>
          <li>View which stations the aircraft has visited</li>
          <li>Add new time periods for the same aircraft</li>
          <li>Edit or delete any allocation period</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'weather',
    title: 'Weather Forecasts',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="16" x2="8.01" y2="16" />
        <line x1="8" y1="20" x2="8.01" y2="20" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <line x1="12" y1="22" x2="12.01" y2="22" />
        <line x1="16" y1="16" x2="16.01" y2="16" />
        <line x1="16" y1="20" x2="16.01" y2="20" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          The Weather page shows winter weather forecasts from the National Weather Service that may impact aircraft operations.
        </p>
        <h4 className="font-medium">Features:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Snow and ice accumulation forecasts</li>
          <li>Filter by state, weather type, and precipitation amounts</li>
          <li>Click <strong className="text-[var(--foreground)]">Fetch from NWS</strong> to get the latest data</li>
          <li>Click any row to see the full 7-day forecast</li>
        </ul>
        <h4 className="font-medium mt-4">Indicators:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li><span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">NEW</span> - Newly reported weather</li>
          <li>Up/down arrows indicate increasing or decreasing trends</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'capacity',
    title: 'Capacity Management',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          The Capacity page lets you set the maximum number of aircraft parking spots available at each station.
        </p>
        <h4 className="font-medium">Setting Capacity:</h4>
        <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Search for the station by IATA code, name, or city</li>
          <li>Click the edit button next to the station</li>
          <li>Enter the total number of spots (or leave empty for unlimited)</li>
          <li>Press <kbd className="px-1.5 py-0.5 bg-[var(--secondary)] rounded text-xs">Enter</kbd> to save or <kbd className="px-1.5 py-0.5 bg-[var(--secondary)] rounded text-xs">ESC</kbd> to cancel</li>
        </ol>
        <p className="text-[var(--muted-foreground)] mt-2">
          When a station reaches capacity, you&apos;ll see visual warnings on the map and in the allocation dialog.
        </p>
      </div>
    ),
  },
  {
    id: 'aircraft-table',
    title: 'Aircraft Table',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    content: (
      <div className="space-y-3">
        <p>
          The Aircraft page provides a comprehensive table view of all allocations with powerful filtering options.
        </p>
        <h4 className="font-medium">Filters:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Date range with quick presets (Today, This Week, Last 7 Days, etc.)</li>
          <li>Carrier filter</li>
          <li>Station filter</li>
          <li>Tail number search</li>
        </ul>
        <h4 className="font-medium mt-4">Features:</h4>
        <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
          <li>Click any column header to sort</li>
          <li>Edit or delete allocations directly from the table</li>
          <li>Export to CSV for external reporting</li>
        </ul>
      </div>
    ),
  },
]

interface HelpDialogProps {
  open: boolean
  onClose: () => void
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[80vh] bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              How to Use This App
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-[var(--secondary)] rounded transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-56 shrink-0 border-r border-[var(--border)] overflow-y-auto py-2">
              {helpSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-[var(--secondary)] text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/50'
                  }`}
                >
                  {section.icon}
                  {section.title}
                </button>
              ))}
            </nav>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {helpSections.map((section) => (
                <div
                  key={section.id}
                  className={activeSection === section.id ? 'block' : 'hidden'}
                >
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </h3>
                  <div className="text-sm leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--secondary)]/30 space-y-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              Tip: All changes are saved in real-time and sync across all users viewing the map.
            </p>
            <p className="text-xs text-amber-400/70">
              This is an informational tool only. Not for flight planning or operational use.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Help button component to use in NavBar
export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/50 transition-colors"
        title="Help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        <span className="hidden sm:inline">Help</span>
      </button>
      <HelpDialog open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
