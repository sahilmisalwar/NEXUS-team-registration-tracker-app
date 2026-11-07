-- The admin-leaders Edge Function uses Supabase's secret service key.
-- The core migration revoked PUBLIC table privileges, including privileges
-- inherited by service_role. Restore only the operations this function needs.
grant select, insert on public.profiles to service_role;
grant select on public.teams to service_role;
grant update (leader_user_id, leader_name) on public.teams to service_role;
