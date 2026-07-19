-- activity_streams não denormalizava user_id, contrariando a regra geral de RLS
-- do modelo de dados ("tabelas filhas denormalizam user_id"). Tabela ainda vazia
-- em produção, então a coluna pode entrar NOT NULL diretamente, sem backfill.
alter table public.activity_streams
add column user_id uuid references public.profiles (id) on delete cascade;

update public.activity_streams as s
set user_id = a.user_id
from public.activities as a
where a.id = s.activity_id;

alter table public.activity_streams
alter column user_id set not null;
