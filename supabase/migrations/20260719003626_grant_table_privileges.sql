-- No projeto hospedado do Supabase, toda tabela nova já recebe ALL PRIVILEGES para
-- anon/authenticated/service_role por padrão da plataforma (RLS é o gate real).
-- Um stack local (supabase start / `supabase test db`) não tem esse default privilege
-- configurado, então replicamos aqui para as migrations serem a fonte da verdade completa.
grant all on
  public.profiles,
  public.athlete_thresholds,
  public.garmin_connections,
  public.plans,
  public.plan_phases,
  public.planned_workouts,
  public.activities,
  public.activity_streams,
  public.activity_insights,
  public.daily_metrics,
  public.plan_adjustments,
  public.ai_logs
to anon, authenticated, service_role;
