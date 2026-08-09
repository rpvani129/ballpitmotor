alter table public.events
  add column vehicle_id uuid,
  add column team_name text,
  add column driver_name text,
  add column event_type text,
  add column temperature_f numeric(5,1),
  add column conditions text,
  add column precipitation_in numeric(7,3),
  add column wind_speed_mph numeric(5,1),
  add column humidity_pct numeric(5,1),
  add column track_condition text,
  add column tire_set_business_id text,
  add column front_pad_set_business_id text,
  add column rear_pad_set_business_id text,
  add column notes text,
  add column source_url text,
  add constraint events_workspace_vehicle_fkey
    foreign key (workspace_id, vehicle_id)
    references public.vehicles(workspace_id, id)
    on delete set null (vehicle_id);

create index events_workspace_vehicle_idx on public.events(workspace_id, vehicle_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null,
  session_number integer not null check (session_number > 0),
  started_at time,
  best_lap_ms integer check (best_lap_ms is null or best_lap_ms > 0),
  is_fastest boolean not null default false,
  source_url text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, event_id)
    references public.events(workspace_id, id) on delete cascade,
  unique (event_id, session_number),
  unique (workspace_id, id)
);

create index sessions_workspace_event_idx on public.sessions(workspace_id, event_id);
create index sessions_workspace_created_at_idx on public.sessions(workspace_id, created_at desc);

create trigger sessions_workspace_id_immutable
before update on public.sessions
for each row execute function private.prevent_workspace_id_change();

alter table public.sessions enable row level security;
revoke all on public.sessions from anon;
grant select, insert, update, delete on public.sessions to authenticated;

create policy "workspace members read" on public.sessions for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.sessions for insert to authenticated
with check ((select private.can_edit_workspace(workspace_id)) and created_by = (select auth.uid()));
create policy "workspace editors update" on public.sessions for update to authenticated
using ((select private.can_edit_workspace(workspace_id)))
with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace admins delete" on public.sessions for delete to authenticated
using ((select private.can_admin_workspace(workspace_id)));

create or replace function private.sync_event_fastest_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.sessions
  set is_fastest = (id = (
    select s.id from public.sessions s
    where s.event_id = coalesce(new.event_id, old.event_id)
      and s.best_lap_ms is not null
    order by s.best_lap_ms asc, s.session_number asc limit 1
  ))
  where event_id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end;
$$;

revoke all on function private.sync_event_fastest_session() from public;
create trigger sessions_sync_fastest
after insert or update of best_lap_ms or delete on public.sessions
for each row execute function private.sync_event_fastest_session();
