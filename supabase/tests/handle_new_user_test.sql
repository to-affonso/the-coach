begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, email) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'novo.usuario@example.com');

select results_eq(
  $$ select count(*) from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000005' $$,
  array[1::bigint],
  'signup cria profile automaticamente'
);

select is(
  (select display_name from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000005'),
  null,
  'profile criado sem dados ainda (preenchidos depois no onboarding)'
);

select * from finish();
rollback;
