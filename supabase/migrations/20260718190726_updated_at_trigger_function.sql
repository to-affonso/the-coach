-- Infra: função compartilhada que mantém updated_at em tabelas mutáveis.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
