-- Grupo 4 — Ajustes e auditoria (ver /docs/modelo-de-dados.md)

create table public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  level text not null check (level in ('week', 'phase')),
  "trigger" text not null check (
    "trigger" in (
      'scheduled_review',
      'low_adherence',
      'high_fatigue',
      'illness',
      'user_request',
      'phase_end'
    )
  ),
  proposal jsonb,
  rationale_text text,
  status text not null default 'proposed' check (
    status in ('proposed', 'approved', 'rejected', 'superseded')
  ),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.plan_adjustments
for each row execute function public.set_updated_at();

create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module text not null check (
    module in ('plan_generator', 'plan_reviewer', 'insight')
  ),
  ref_id uuid,
  prompt_version text,
  input_tokens int,
  output_tokens int,
  success boolean not null,
  error text,
  created_at timestamptz not null default now()
);
