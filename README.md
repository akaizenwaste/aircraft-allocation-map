# Aircraft Allocation Map

Real-time multi-user aircraft allocation tracking with a map-first interface for allocating aircraft to airports/stations.

## Features

- **Full-screen Interactive Map**: Visualize aircraft allocations across all US airports using Mapbox GL JS
- **Multi-carrier Distribution**: Airport markers show ring segments representing carrier distribution
- **Real-time Updates**: Multi-user simultaneous editing with Supabase realtime subscriptions
- **Station Drawer**: Click any airport to see detailed aircraft list with ground time tracking
- **Smart Filters**: Filter by carrier, show only stations with aircraft, highlight long sits
- **Ground Time Tracking**: Automatic calculation using station timezone

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Components**: Base UI (@base-ui/react)
- **Map**: Mapbox GL JS
- **Database & Realtime**: Supabase (PostgreSQL)
- **Data Fetching**: React Query
- **Timezone**: Luxon

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Mapbox account

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

### Tables

- **airports**: US airports with IATA code, coordinates, timezone
- **carriers**: Airlines with colors (Envoy, Piedmont, PSA, etc.)
- **aircraft_allocations**: Current aircraft positions with ground time tracking

### Key Features

- Unique constraint on tail_number (one aircraft = one station)
- Realtime subscriptions enabled on aircraft_allocations
- Ground time computed from station timezone

## Project Structure

```
src/
  app/            # Next.js App Router pages
  components/     # React components
    Map.tsx       # Main Mapbox map with markers
    StationDrawer.tsx   # Right-side drawer for station details
    AllocationDialog.tsx # Add/edit allocation modal
    CommandBar.tsx      # Top filters and search
    CarrierLegend.tsx   # Bottom-left carrier legend
    LongestSits.tsx     # Longest sits nationwide widget
  hooks/          # React Query hooks for data fetching
  lib/            # Utilities and Supabase client
  types/          # TypeScript type definitions
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

## License

MIT
