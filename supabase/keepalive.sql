-- Run once in the Supabase SQL Editor. The row is inserted and deleted in one transaction.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.project_keepalive (
  id boolean primary key default true check (id),
  touched_at timestamptz not null
);
revoke all on table private.project_keepalive from public, anon, authenticated, service_role;

create or replace function public.touch_project_keepalive()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.project_keepalive (id, touched_at)
  values (true, pg_catalog.clock_timestamp())
  on conflict (id) do update set touched_at = excluded.touched_at;

  delete from private.project_keepalive where id = true;
end;
$$;

revoke all on function public.touch_project_keepalive() from public, anon, authenticated, service_role;
grant execute on function public.touch_project_keepalive() to service_role;
