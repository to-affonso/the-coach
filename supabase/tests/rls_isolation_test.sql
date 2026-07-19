begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- Fixtures: dois usuários, uma linha em cada uma das 12 tabelas de usuário.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'user.a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'user.b@example.com');

insert into public.profiles (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'User A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'User B');

insert into public.athlete_thresholds (user_id, sport, metric, value, effective_from, source) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bike', 'ftp', 200, current_date, 'test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bike', 'ftp', 210, current_date, 'test');

insert into public.garmin_connections (user_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'disconnected'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'disconnected');

insert into public.plans (id, user_id, goal_type, status) values
  ('aaaa1111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'fitness', 'draft'),
  ('bbbb1111-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'fitness', 'draft');

insert into public.plan_phases (id, plan_id, user_id, "position", type, start_date, end_date) values
  ('aaaa2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'base', current_date, current_date + 27),
  ('bbbb2222-0000-0000-0000-000000000002', 'bbbb1111-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 'base', current_date, current_date + 27);

insert into public.planned_workouts (plan_id, phase_id, user_id, scheduled_date, sport) values
  ('aaaa1111-0000-0000-0000-000000000001', 'aaaa2222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date, 'run'),
  ('bbbb1111-0000-0000-0000-000000000002', 'bbbb2222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', current_date, 'run');

insert into public.activities (id, user_id, source, sport, start_time) values
  ('aaaa3333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'manual', 'run', now()),
  ('bbbb3333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'manual', 'run', now());

insert into public.activity_streams (activity_id, user_id, resolution_s, data) values
  ('aaaa3333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 5, '{}'),
  ('bbbb3333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 5, '{}');

insert into public.activity_insights (activity_id, user_id, headline) values
  ('aaaa3333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bom treino'),
  ('bbbb3333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Bom treino');

insert into public.daily_metrics (user_id, date, tss_total) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date, 50),
  ('bbbbbbbb-0000-0000-0000-000000000002', current_date, 60);

insert into public.plan_adjustments (plan_id, user_id, level, "trigger") values
  ('aaaa1111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'week', 'scheduled_review'),
  ('bbbb1111-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'week', 'scheduled_review');

insert into public.ai_logs (user_id, module, success) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'insight', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'insight', true);

-- Como usuário A: deve enxergar exatamente 1 linha (a própria) em cada tabela.
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select results_eq('select count(*) from public.profiles', array[1::bigint], 'A vê só o próprio profile');
select results_eq('select count(*) from public.athlete_thresholds', array[1::bigint], 'A vê só o próprio athlete_thresholds');
select results_eq('select count(*) from public.garmin_connections', array[1::bigint], 'A vê só o próprio garmin_connections');
select results_eq('select count(*) from public.plans', array[1::bigint], 'A vê só o próprio plans');
select results_eq('select count(*) from public.plan_phases', array[1::bigint], 'A vê só o próprio plan_phases');
select results_eq('select count(*) from public.planned_workouts', array[1::bigint], 'A vê só o próprio planned_workouts');
select results_eq('select count(*) from public.activities', array[1::bigint], 'A vê só o próprio activities');
select results_eq('select count(*) from public.activity_streams', array[1::bigint], 'A vê só o próprio activity_streams');
select results_eq('select count(*) from public.activity_insights', array[1::bigint], 'A vê só o próprio activity_insights');
select results_eq('select count(*) from public.daily_metrics', array[1::bigint], 'A vê só o próprio daily_metrics');
select results_eq('select count(*) from public.plan_adjustments', array[1::bigint], 'A vê só o próprio plan_adjustments');
select results_eq('select count(*) from public.ai_logs', array[1::bigint], 'A vê só o próprio ai_logs');

-- A não consegue alterar dado do B.
select results_ne(
  $$ update public.plans set title = 'hacked' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1 $$,
  $$ values(1) $$,
  'A não consegue atualizar o plano de B'
);

-- Como usuário B: mesma checagem, espelhada.
set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

select results_eq('select count(*) from public.profiles', array[1::bigint], 'B vê só o próprio profile');
select results_eq('select count(*) from public.athlete_thresholds', array[1::bigint], 'B vê só o próprio athlete_thresholds');
select results_eq('select count(*) from public.garmin_connections', array[1::bigint], 'B vê só o próprio garmin_connections');
select results_eq('select count(*) from public.plans', array[1::bigint], 'B vê só o próprio plans');
select results_eq('select count(*) from public.plan_phases', array[1::bigint], 'B vê só o próprio plan_phases');
select results_eq('select count(*) from public.planned_workouts', array[1::bigint], 'B vê só o próprio planned_workouts');
select results_eq('select count(*) from public.activities', array[1::bigint], 'B vê só o próprio activities');
select results_eq('select count(*) from public.activity_streams', array[1::bigint], 'B vê só o próprio activity_streams');
select results_eq('select count(*) from public.activity_insights', array[1::bigint], 'B vê só o próprio activity_insights');
select results_eq('select count(*) from public.daily_metrics', array[1::bigint], 'B vê só o próprio daily_metrics');
select results_eq('select count(*) from public.plan_adjustments', array[1::bigint], 'B vê só o próprio plan_adjustments');
select results_eq('select count(*) from public.ai_logs', array[1::bigint], 'B vê só o próprio ai_logs');

-- Anônimo (sem JWT) não vê nada de ninguém.
reset role;
set local role anon;
set local request.jwt.claim.sub = '';

select results_eq('select count(*) from public.plans', array[0::bigint], 'anônimo não vê nenhum plano');

select * from finish();
rollback;
