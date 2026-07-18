-- Grupo 3 — Dados realizados (ver /docs/modelo-de-dados.md)

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('garmin', 'file', 'manual')),
  external_id text,
  sport text not null check (
    sport in ('swim', 'bike', 'run', 'brick', 'strength', 'rest')
  ),
  start_time timestamptz not null,
  duration_s int,
  moving_time_s int,
  distance_m numeric,
  elevation_gain_m numeric,
  avg_hr numeric,
  max_hr numeric,
  avg_power numeric,
  normalized_power numeric,
  avg_cadence numeric,
  avg_speed_mps numeric,
  tss numeric,
  intensity_factor numeric,
  threshold_snapshot jsonb,
  hr_zones jsonb,
  power_zones jsonb,
  laps jsonb,
  route_polyline text,
  extra_metrics jsonb,
  fit_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create trigger set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

create index activities_user_start_time_idx
on public.activities (user_id, start_time desc);

-- planned_workouts.matched_activity_id foi criada em grupo2_plano antes de activities existir.
alter table public.planned_workouts
add constraint planned_workouts_matched_activity_id_fkey
foreign key (matched_activity_id) references public.activities (id)
on delete set null;

create table public.activity_streams (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  resolution_s int not null default 5,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.activity_streams
for each row execute function public.set_updated_at();

create table public.activity_insights (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  headline text,
  insight_text text,
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create table public.daily_metrics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  tss_total numeric not null default 0,
  ctl numeric,
  atl numeric,
  tsb numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create trigger set_updated_at
before update on public.daily_metrics
for each row execute function public.set_updated_at();
