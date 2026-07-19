-- Cria automaticamente a linha em public.profiles no signup (auth.users).
-- security definer + search_path vazio: a policy de profiles exige id = auth.uid(),
-- mas no momento do signup ainda não há sessão/JWT, então o insert precisa bypassar RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
