-- Restringe as policies ao role `authenticated` (recomendação de performance do Supabase:
-- evita avaliar a expressão da policy para requisições anônimas).
alter policy "profiles_owner" on public.profiles to authenticated;
alter policy "athlete_thresholds_owner" on public.athlete_thresholds to authenticated;
alter policy "garmin_connections_owner" on public.garmin_connections to authenticated;
alter policy "plans_owner" on public.plans to authenticated;
alter policy "plan_phases_owner" on public.plan_phases to authenticated;
alter policy "planned_workouts_owner" on public.planned_workouts to authenticated;
alter policy "activities_owner" on public.activities to authenticated;
alter policy "activity_streams_owner" on public.activity_streams to authenticated;
alter policy "activity_insights_owner" on public.activity_insights to authenticated;
alter policy "daily_metrics_owner" on public.daily_metrics to authenticated;
alter policy "plan_adjustments_owner" on public.plan_adjustments to authenticated;
alter policy "ai_logs_owner" on public.ai_logs to authenticated;
