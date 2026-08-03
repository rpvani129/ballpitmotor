create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner', 'admin', 'editor', 'contributor', 'viewer');
create type public.membership_status as enum ('invited', 'active', 'deactivated');
create type public.event_status as enum ('planned', 'active', 'complete', 'cancelled', 'needs_review');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, linked_user_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, business_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id text not null,
  event_date date not null,
  event_name text not null,
  track_name text not null,
  configuration_name text not null,
  organization_name text,
  status public.event_status not null default 'planned',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, business_id)
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, name, version)
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  position integer not null,
  label text not null,
  response_type text not null default 'boolean',
  is_required boolean not null default true,
  unique (template_id, position)
);

create table public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  template_id uuid not null references public.checklist_templates(id),
  template_version integer not null,
  template_snapshot jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.checklist_item_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  checklist_run_id uuid not null references public.checklist_runs(id) on delete cascade,
  template_item_id uuid references public.checklist_template_items(id) on delete set null,
  response jsonb,
  note text,
  completed_by uuid references auth.users(id),
  completed_at timestamptz
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.people enable row level security;
alter table public.vehicles enable row level security;
alter table public.events enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.checklist_item_results enable row level security;

create policy "members read workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "members read memberships" on public.memberships for select using (public.is_workspace_member(workspace_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['people','vehicles','events','checklist_templates','checklist_template_items','checklist_runs','checklist_item_results']
  loop
    execute format('create policy "workspace members read" on public.%I for select using (public.is_workspace_member(workspace_id))', table_name);
  end loop;
end $$;

comment on schema public is 'The Grid tenant-aware application schema. Write policies are added with service workflows before production use.';
