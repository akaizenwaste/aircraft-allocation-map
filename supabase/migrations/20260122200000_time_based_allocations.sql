-- Migration: Time-Based Aircraft Allocations
-- Description: Enable multiple allocations per aircraft with distinct time periods
-- Date: 2026-01-22

-- Step 0: Drop the view first (will recreate at end)
DROP VIEW IF EXISTS allocations_with_ground_time;

-- Step 1: Rename existing columns (no data duplication)
ALTER TABLE aircraft_allocations
  RENAME COLUMN arrival_time_local TO period_start;
ALTER TABLE aircraft_allocations
  RENAME COLUMN departure_time_local TO period_end;

-- Step 2: Make period_start NOT NULL (should already have data)
ALTER TABLE aircraft_allocations
  ALTER COLUMN period_start SET NOT NULL;

-- Step 3: Remove the UNIQUE constraint on tail_number
ALTER TABLE aircraft_allocations
  DROP CONSTRAINT IF EXISTS aircraft_allocations_tail_number_key;

-- Step 4: Add btree_gist extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 5: Add exclusion constraint to prevent overlapping periods
-- Uses [) semantics: inclusive start, exclusive end
ALTER TABLE aircraft_allocations
  ADD CONSTRAINT no_overlapping_periods
  EXCLUDE USING GIST (
    tail_number WITH =,
    tstzrange(period_start, period_end, '[)') WITH &&
  );

-- Step 6: Add GiST index for time-based queries
CREATE INDEX idx_allocations_period
  ON aircraft_allocations
  USING GIST (tstzrange(period_start, period_end, '[)'));

-- Step 7: Add B-tree index for tail_number lookups
CREATE INDEX idx_allocations_tail_number
  ON aircraft_allocations (tail_number);

-- Step 8: Recreate the view with new column names
CREATE OR REPLACE VIEW allocations_with_ground_time AS
SELECT
  a.*,
  c.name as carrier_name,
  c.color as carrier_color,
  c.short_code as carrier_short_code,
  ap.name as airport_name,
  ap.timezone as airport_timezone,
  ap.city as airport_city,
  ap.state as airport_state,
  compute_ground_time_minutes(a.period_start, a.period_end, ap.timezone) as ground_time_minutes
FROM aircraft_allocations a
JOIN carriers c ON a.carrier_id = c.id
JOIN airports ap ON a.station_iata = ap.iata_code;
