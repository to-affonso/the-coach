-- Feed (2.7) precisa de um título por atividade no header do card. O Garmin
-- já fornece isso (activity.activityName na API de listagem), mas o sync
-- não gravava. Nullable: atividades já sincronizadas ficam sem nome (a API
-- de listagem não é reconsultada para linhas existentes) e o card degrada
-- para o nome do esporte.
alter table public.activities
add column name text;
