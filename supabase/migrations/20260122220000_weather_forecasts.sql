-- Store weather forecast snapshots for tracking changes over time
create table weather_forecasts (
  id uuid primary key default gen_random_uuid(),
  airport_iata text not null references airports(iata_code) on delete cascade,
  snow_inches numeric(4,2),
  snow_start_time timestamptz,
  snow_end_time timestamptz,
  ice_inches numeric(4,2),
  ice_start_time timestamptz,
  ice_end_time timestamptz,
  nws_generated_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now()
);

-- Index for querying latest forecast per airport
create index idx_weather_forecasts_airport_fetched
  on weather_forecasts(airport_iata, fetched_at desc);

-- Index for cleanup of old forecasts
create index idx_weather_forecasts_created_at
  on weather_forecasts(created_at);

-- Function to get the latest forecast for each airport with change indicators
create or replace function get_weather_forecasts_with_changes()
returns table (
  airport_iata text,
  state text,
  snow_inches numeric,
  snow_start_time timestamptz,
  snow_end_time timestamptz,
  ice_inches numeric,
  ice_start_time timestamptz,
  ice_end_time timestamptz,
  nws_generated_at timestamptz,
  fetched_at timestamptz,
  error text,
  prev_snow_inches numeric,
  prev_ice_inches numeric,
  prev_snow_start_time timestamptz,
  prev_ice_start_time timestamptz
) as $$
  with ranked_forecasts as (
    select
      wf.*,
      row_number() over (partition by wf.airport_iata order by wf.fetched_at desc) as rn
    from weather_forecasts wf
  ),
  latest as (
    select * from ranked_forecasts where rn = 1
  ),
  previous as (
    select * from ranked_forecasts where rn = 2
  )
  select
    l.airport_iata,
    a.state,
    l.snow_inches,
    l.snow_start_time,
    l.snow_end_time,
    l.ice_inches,
    l.ice_start_time,
    l.ice_end_time,
    l.nws_generated_at,
    l.fetched_at,
    l.error,
    p.snow_inches as prev_snow_inches,
    p.ice_inches as prev_ice_inches,
    p.snow_start_time as prev_snow_start_time,
    p.ice_start_time as prev_ice_start_time
  from latest l
  join airports a on a.iata_code = l.airport_iata
  left join previous p on p.airport_iata = l.airport_iata
  order by l.airport_iata;
$$ language sql stable;

-- Function to clean up old forecasts (keep last 48 hours)
create or replace function cleanup_old_weather_forecasts()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from weather_forecasts
  where created_at < now() - interval '48 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

-- Enable RLS
alter table weather_forecasts enable row level security;

-- Allow read access to all (forecasts are public data)
create policy "Weather forecasts are viewable by everyone"
  on weather_forecasts for select
  using (true);

-- Allow insert/update for service role only (edge functions)
create policy "Service role can insert weather forecasts"
  on weather_forecasts for insert
  with check (true);

comment on table weather_forecasts is 'Stores NWS weather forecast snapshots for tracking changes over time';
