-- RLS em todas as tabelas de usuário: user_id = auth.uid() (id = auth.uid() em profiles).
-- ENABLE ROW LEVEL SECURITY é explícito aqui (não depender do auto-enable da plataforma
-- hospedada do Supabase, que não existe num stack local via `supabase db reset`).

alter table public.profiles enable row level security;
create policy "profiles_owner" on public.profiles
for all
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter table public.athlete_thresholds enable row level security;
create policy "athlete_thresholds_owner" on public.athlete_thresholds
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.garmin_connections enable row level security;
create policy "garmin_connections_owner" on public.garmin_connections
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.plans enable row level security;
create policy "plans_owner" on public.plans
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.plan_phases enable row level security;
create policy "plan_phases_owner" on public.plan_phases
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.planned_workouts enable row level security;
create policy "planned_workouts_owner" on public.planned_workouts
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.activities enable row level security;
create policy "activities_owner" on public.activities
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.activity_streams enable row level security;
create policy "activity_streams_owner" on public.activity_streams
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.activity_insights enable row level security;
create policy "activity_insights_owner" on public.activity_insights
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.daily_metrics enable row level security;
create policy "daily_metrics_owner" on public.daily_metrics
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.plan_adjustments enable row level security;
create policy "plan_adjustments_owner" on public.plan_adjustments
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.ai_logs enable row level security;
create policy "ai_logs_owner" on public.ai_logs
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
