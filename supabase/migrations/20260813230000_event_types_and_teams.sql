create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

alter table public.events
  add column event_type_id uuid,
  add column team_id uuid;

insert into public.event_types (workspace_id, name)
select distinct workspace_id, trim(event_type)
from public.events
where nullif(trim(event_type), '') is not null
on conflict (workspace_id, name) do nothing;

insert into public.teams (workspace_id, name)
select distinct e.workspace_id, trim(e.team_name)
from public.events e
where nullif(trim(e.team_name), '') is not null
  and not exists (
    select 1
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = e.workspace_id
      and lower(u.email) = 'roshan.p.vani@gmail.com'
      and m.status = 'active'
  )
on conflict (workspace_id, name) do nothing;

insert into public.teams (workspace_id, name)
select distinct m.workspace_id, 'Ball Pit Motor'
from public.memberships m
join auth.users u on u.id = m.user_id
where lower(u.email) = 'roshan.p.vani@gmail.com'
  and m.status = 'active'
on conflict (workspace_id, name) do nothing;

update public.events e
set event_type_id = t.id
from public.event_types t
where t.workspace_id = e.workspace_id
  and t.name = trim(e.event_type);

update public.events e
set team_id = t.id
from public.teams t
where t.workspace_id = e.workspace_id
  and t.name = trim(e.team_name);

update public.events e
set team_id = t.id,
    team_name = t.name
from public.teams t
where t.workspace_id = e.workspace_id
  and t.name = 'Ball Pit Motor'
  and exists (
    select 1
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = e.workspace_id
      and lower(u.email) = 'roshan.p.vani@gmail.com'
      and m.status = 'active'
  );

alter table public.events
  add constraint events_event_type_workspace_fk
    foreign key (workspace_id, event_type_id)
    references public.event_types(workspace_id, id) on delete restrict,
  add constraint events_team_workspace_fk
    foreign key (workspace_id, team_id)
    references public.teams(workspace_id, id) on delete restrict;

create index events_event_type_id_idx on public.events(workspace_id, event_type_id);
create index events_team_id_idx on public.events(workspace_id, team_id);

alter table public.event_types enable row level security;
alter table public.teams enable row level security;
revoke all on public.event_types from anon;
revoke all on public.teams from anon;
grant select, insert, update, delete on public.event_types to authenticated;
grant select, insert, update, delete on public.teams to authenticated;

create policy "workspace members read" on public.event_types
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.event_types
  for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors update" on public.event_types
  for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.event_types
  for delete to authenticated using ((select private.can_edit_workspace(workspace_id)));

create policy "workspace members read" on public.teams
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.teams
  for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors update" on public.teams
  for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.teams
  for delete to authenticated using ((select private.can_edit_workspace(workspace_id)));

create trigger event_types_workspace_id_immutable
  before update on public.event_types
  for each row execute function private.prevent_workspace_id_change();
create trigger teams_workspace_id_immutable
  before update on public.teams
  for each row execute function private.prevent_workspace_id_change();
