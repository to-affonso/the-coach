-- Grupo 2 — O plano: hierarquia da periodização (ver /docs/modelo-de-dados.md)

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  goal_type text not null check (goal_type in ('race', 'fitness')),
  race_name text,
  race_date date,
  race_type text check (
    race_type in ('sprint', 'olympic', 'half', 'full', 'other')
  ),
  status text not null check (
    status in ('draft', 'generating', 'active', 'completed', 'abandoned')
  ),
  strategy_text text,
  form_snapshot jsonb,
  weekly_hours_available numeric,
  week_skeletons jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

-- No máximo 1 plano `active` por usuário.
create unique index plans_one_active_per_user
on public.plans (user_id)
where (status = 'active');

create table public.plan_phases (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  "position" int not null,
  type text not null check (
    type in ('base', 'build', 'peak', 'taper', 'race_week', 'recovery')
  ),
  start_date date not null,
  end_date date not null,
  objective_text text,
  target_ctl numeric,
  min_adherence_pct numeric,
  key_workouts_target int,
  status text not null default 'upcoming' check (
    status in ('upcoming', 'current', 'completed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.plan_phases
for each row execute function public.set_updated_at();

create table public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  phase_id uuid not null references public.plan_phases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_date date not null,
  sport text not null check (
    sport in ('swim', 'bike', 'run', 'brick', 'strength', 'rest')
  ),
  title text,
  description text,
  structure jsonb,
  planned_duration_min int,
  planned_tss numeric,
  is_key_workout boolean not null default false,
  status text not null default 'planned' check (
    status in ('planned', 'completed', 'partial', 'skipped')
  ),
  -- FK para activities adicionada em grupo3_dados_realizados (a tabela ainda não existe aqui).
  matched_activity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.planned_workouts
for each row execute function public.set_updated_at();

create index planned_workouts_user_scheduled_date_idx
on public.planned_workouts (user_id, scheduled_date);
