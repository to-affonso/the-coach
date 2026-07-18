-- Infra: função trivial para o healthcheck de conexão da aplicação (não faz parte do modelo de dados).
create or replace function public.health_check()
returns boolean
language sql
stable
as $$
  select true;
$$;
