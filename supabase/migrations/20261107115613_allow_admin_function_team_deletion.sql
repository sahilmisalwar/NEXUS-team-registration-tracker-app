-- Only the admin-checked Edge Function can remove teams.
-- Authenticated browser sessions retain no DELETE privilege on teams.
grant delete on public.teams to service_role;
