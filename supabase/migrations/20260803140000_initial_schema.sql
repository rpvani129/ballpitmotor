create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.membership_role as enum ('owner', 'admin', 'editor', 'contributor', 'viewer');
create type public.membership_status as enum ('invited', 'active', 'deactivated');
create type public.event_status as enum ('planned', 'active', 'complete', 'cancelled', 'needs_review');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  unique (id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, id)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (btrim(display_name) <> ''),
  created_at timestamptz not null default now(),
  unique (workspace_id, linked_user_id),
  unique (workspace_id, id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id text not null check (btrim(business_id) <> ''),
  name text not null check (btrim(name) <> ''),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, business_id),
  unique (workspace_id, id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id text not null check (btrim(business_id) <> ''),
  event_date date not null,
  event_name text not null check (btrim(event_name) <> ''),
  track_name text not null check (btrim(track_name) <> ''),
  configuration_name text not null check (btrim(configuration_name) <> ''),
  organization_name text,
  status public.event_status not null default 'planned',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, business_id),
  unique (workspace_id, id)
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, name, version),
  unique (workspace_id, id)
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null,
  position integer not null check (position >= 0),
  label text not null check (btrim(label) <> ''),
  response_type text not null default 'boolean',
  is_required boolean not null default true,
  foreign key (workspace_id, template_id)
    references public.checklist_templates(workspace_id, id) on delete cascade,
  unique (template_id, position),
  unique (workspace_id, id)
);

create table public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid,
  vehicle_id uuid,
  template_id uuid not null,
  template_version integer not null check (template_version > 0),
  template_snapshot jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  foreign key (workspace_id, event_id)
    references public.events(workspace_id, id) on delete cascade,
  foreign key (workspace_id, vehicle_id)
    references public.vehicles(workspace_id, id) on delete set null (vehicle_id),
  foreign key (workspace_id, template_id)
    references public.checklist_templates(workspace_id, id),
  unique (workspace_id, id)
);

create table public.checklist_item_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  checklist_run_id uuid not null,
  template_item_id uuid,
  response jsonb,
  note text,
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  foreign key (workspace_id, checklist_run_id)
    references public.checklist_runs(workspace_id, id) on delete cascade,
  foreign key (workspace_id, template_item_id)
    references public.checklist_template_items(workspace_id, id) on delete set null (template_item_id),
  unique (workspace_id, id)
);

create index memberships_user_id_active_idx
  on public.memberships(user_id, workspace_id)
  where status = 'active';
create index people_workspace_id_idx on public.people(workspace_id);
create index vehicles_workspace_id_idx on public.vehicles(workspace_id);
create index events_workspace_date_idx on public.events(workspace_id, event_date desc);
create index events_created_by_idx on public.events(created_by);
create index checklist_templates_workspace_id_idx on public.checklist_templates(workspace_id);
create index checklist_template_items_workspace_id_idx on public.checklist_template_items(workspace_id);
create index checklist_template_items_template_id_idx on public.checklist_template_items(template_id);
create index checklist_runs_workspace_id_idx on public.checklist_runs(workspace_id);
create index checklist_runs_event_id_idx on public.checklist_runs(event_id);
create index checklist_runs_vehicle_id_idx on public.checklist_runs(vehicle_id);
create index checklist_runs_template_id_idx on public.checklist_runs(template_id);
create index checklist_item_results_workspace_id_idx on public.checklist_item_results(workspace_id);
create index checklist_item_results_run_id_idx on public.checklist_item_results(checklist_run_id);
create index checklist_item_results_template_item_id_idx on public.checklist_item_results(template_item_id);

create or replace function private.current_membership_role(target_workspace_id uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships as m
  where m.workspace_id = target_workspace_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
  limit 1;
$$;

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_membership_role(target_workspace_id)) is not null;
$$;

create or replace function private.can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_membership_role(target_workspace_id))
    in ('owner'::public.membership_role, 'admin'::public.membership_role, 'editor'::public.membership_role);
$$;

create or replace function private.can_admin_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_membership_role(target_workspace_id))
    in ('owner'::public.membership_role, 'admin'::public.membership_role);
$$;

create or replace function private.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_membership_role(target_workspace_id))
    = 'owner'::public.membership_role;
$$;

create or replace function private.prevent_workspace_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function private.protect_last_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_active_owner boolean;
begin
  if tg_op = 'DELETE' then
    removes_active_owner :=
      old.role = 'owner'::public.membership_role
      and old.status = 'active'::public.membership_status;
  else
    removes_active_owner :=
      old.role = 'owner'::public.membership_role
      and old.status = 'active'::public.membership_status
      and (
        new.role <> 'owner'::public.membership_role
        or new.status <> 'active'::public.membership_status
        or new.user_id <> old.user_id
      );
  end if;

  if removes_active_owner
    and exists (
      select 1 from public.workspaces as w where w.id = old.workspace_id
    )
    and not exists (
      select 1
      from public.memberships as m
      where m.workspace_id = old.workspace_id
        and m.id <> old.id
        and m.role = 'owner'::public.membership_role
        and m.status = 'active'::public.membership_status
    )
  then
    raise exception 'a workspace must retain at least one active owner';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger memberships_workspace_id_immutable
before update on public.memberships
for each row execute function private.prevent_workspace_id_change();
create trigger memberships_retain_active_owner
before update or delete on public.memberships
for each row execute function private.protect_last_workspace_owner();
create trigger people_workspace_id_immutable
before update on public.people
for each row execute function private.prevent_workspace_id_change();
create trigger vehicles_workspace_id_immutable
before update on public.vehicles
for each row execute function private.prevent_workspace_id_change();
create trigger events_workspace_id_immutable
before update on public.events
for each row execute function private.prevent_workspace_id_change();
create trigger checklist_templates_workspace_id_immutable
before update on public.checklist_templates
for each row execute function private.prevent_workspace_id_change();
create trigger checklist_template_items_workspace_id_immutable
before update on public.checklist_template_items
for each row execute function private.prevent_workspace_id_change();
create trigger checklist_runs_workspace_id_immutable
before update on public.checklist_runs
for each row execute function private.prevent_workspace_id_change();
create trigger checklist_item_results_workspace_id_immutable
before update on public.checklist_item_results
for each row execute function private.prevent_workspace_id_change();

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_workspace_id uuid;
  normalized_name text := btrim(workspace_name);
  normalized_slug text := lower(btrim(workspace_slug));
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;
  if normalized_name = '' then
    raise exception 'workspace name is required';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug)
  values (normalized_name, normalized_slug)
  returning id into new_workspace_id;

  insert into public.memberships (workspace_id, user_id, role, status)
  values (new_workspace_id, caller_id, 'owner', 'active');

  return new_workspace_id;
end;
$$;

revoke all on function private.current_membership_role(uuid) from public;
revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.can_edit_workspace(uuid) from public;
revoke all on function private.can_admin_workspace(uuid) from public;
revoke all on function private.is_workspace_owner(uuid) from public;
revoke all on function private.prevent_workspace_id_change() from public;
revoke all on function private.protect_last_workspace_owner() from public;
revoke all on function public.create_workspace(text, text) from public;
revoke all on function public.create_workspace(text, text) from anon;

grant usage on schema private to authenticated;
grant execute on function private.current_membership_role(uuid) to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.can_edit_workspace(uuid) to authenticated;
grant execute on function private.can_admin_workspace(uuid) to authenticated;
grant execute on function private.is_workspace_owner(uuid) to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.workspaces,
  public.memberships,
  public.people,
  public.vehicles,
  public.events,
  public.checklist_templates,
  public.checklist_template_items,
  public.checklist_runs,
  public.checklist_item_results
to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.people enable row level security;
alter table public.vehicles enable row level security;
alter table public.events enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.checklist_item_results enable row level security;

create policy "members read workspaces"
on public.workspaces for select to authenticated
using ((select private.is_workspace_member(id)));
create policy "admins update workspaces"
on public.workspaces for update to authenticated
using ((select private.can_admin_workspace(id)))
with check ((select private.can_admin_workspace(id)));
create policy "owners delete workspaces"
on public.workspaces for delete to authenticated
using ((select private.is_workspace_owner(id)));

create policy "members read memberships"
on public.memberships for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy "owners insert memberships"
on public.memberships for insert to authenticated
with check ((select private.is_workspace_owner(workspace_id)));
create policy "owners update memberships"
on public.memberships for update to authenticated
using ((select private.is_workspace_owner(workspace_id)))
with check ((select private.is_workspace_owner(workspace_id)));
create policy "owners delete memberships"
on public.memberships for delete to authenticated
using ((select private.is_workspace_owner(workspace_id)));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'people',
    'vehicles',
    'checklist_templates',
    'checklist_template_items',
    'checklist_runs',
    'checklist_item_results'
  ]
  loop
    execute format(
      'create policy "workspace members read" on public.%I for select to authenticated using ((select private.is_workspace_member(workspace_id)))',
      table_name
    );
    execute format(
      'create policy "workspace editors insert" on public.%I for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)))',
      table_name
    );
    execute format(
      'create policy "workspace editors update" on public.%I for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)))',
      table_name
    );
    execute format(
      'create policy "workspace admins delete" on public.%I for delete to authenticated using ((select private.can_admin_workspace(workspace_id)))',
      table_name
    );
  end loop;
end
$$;

create policy "workspace members read"
on public.events for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert"
on public.events for insert to authenticated
with check (
  (select private.can_edit_workspace(workspace_id))
  and created_by = (select auth.uid())
);
create policy "workspace editors update"
on public.events for update to authenticated
using ((select private.can_edit_workspace(workspace_id)))
with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace admins delete"
on public.events for delete to authenticated
using ((select private.can_admin_workspace(workspace_id)));

comment on schema public is 'The Grid tenant-aware application schema.';
comment on function public.create_workspace(text, text) is
  'Atomically creates a workspace and assigns the authenticated caller as its owner.';
