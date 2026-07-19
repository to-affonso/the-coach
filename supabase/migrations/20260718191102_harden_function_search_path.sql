-- Infra: fixa search_path vazio nas funções para evitar search_path hijacking (linter de segurança do Supabase).
alter function public.health_check() set search_path = '';
alter function public.set_updated_at() set search_path = '';
