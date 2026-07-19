-- Grupo 1 — Identidade e configuração do atleta (ver /docs/modelo-de-dados.md)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  birth_date date,
  sex text check (sex in ('male', 'female', 'other')),
  weight_kg numeric,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.athlete_thresholds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null check (sport in ('swim', 'bike', 'run')),
  metric text not null check (
    metric in ('ftp', 'threshold_pace', 'css', 'lthr', 'max_hr')
  ),
  value numeric not null,
  effective_from date not null,
  source text not null check (
    source in ('manual', 'test', 'data_estimate', 'ai_estimate')
  ),
  created_at timestamptz not null default now(),
  unique (user_id, sport, metric, effective_from)
);

create table public.garmin_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  oauth_tokens text,
  token_expires_at timestamptz,
  status text not null default 'disconnected' check (
    status in ('active', 'expired', 'error', 'disconnected')
  ),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.garmin_connections
for each row execute function public.set_updated_at();
