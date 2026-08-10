alter table public.vehicles
  add column year integer check (year is null or year between 1900 and 2200),
  add column make text,
  add column model text,
  add column trim text,
  add column race_number text,
  add column competition_class text,
  add column description text,
  add column wiki_url text,
  add column image_url text,
  add column current_odometer_miles integer check (current_odometer_miles is null or current_odometer_miles >= 0),
  add column acquired_on date;

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  short_name text,
  address text,
  city text,
  region text,
  country text not null default 'USA',
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text not null default 'America/Chicago',
  website_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

create table public.track_configurations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid not null,
  name text not null,
  direction text,
  distance_miles numeric(5,2) check (distance_miles is null or distance_miles > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, track_id) references public.tracks(workspace_id, id) on delete cascade,
  unique (track_id, name),
  unique (workspace_id, track_id, id),
  unique (workspace_id, id)
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id uuid not null,
  event_id uuid,
  service_date date not null,
  category text not null default 'Maintenance',
  title text not null,
  description text,
  odometer_miles integer check (odometer_miles is null or odometer_miles >= 0),
  vendor text,
  cost numeric(12,2) check (cost is null or cost >= 0),
  next_due_date date,
  next_due_miles integer check (next_due_miles is null or next_due_miles >= 0),
  source_url text,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, vehicle_id) references public.vehicles(workspace_id, id) on delete cascade,
  foreign key (workspace_id, event_id) references public.events(workspace_id, id) on delete set null (event_id),
  unique (workspace_id, id)
);

create table public.tire_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id uuid not null,
  business_id text not null,
  manufacturer text not null,
  model text not null,
  size text,
  compound text,
  purchased_on date,
  first_used_on date,
  starting_sessions integer check (starting_sessions is null or starting_sessions >= 0),
  status text not null default 'active' check (status in ('active','retired','sold')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, vehicle_id) references public.vehicles(workspace_id, id) on delete cascade,
  unique (workspace_id, business_id),
  unique (workspace_id, id)
);

create table public.pad_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id uuid not null,
  business_id text not null,
  axle text not null check (axle in ('front','rear')),
  manufacturer text not null,
  model text not null,
  compound text,
  purchased_on date,
  first_used_on date,
  starting_sessions integer check (starting_sessions is null or starting_sessions >= 0),
  status text not null default 'active' check (status in ('active','retired','sold')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, vehicle_id) references public.vehicles(workspace_id, id) on delete cascade,
  unique (workspace_id, business_id),
  unique (workspace_id, id)
);

alter table public.events
  add column track_id uuid,
  add column configuration_id uuid,
  add column tire_set_id uuid,
  add column front_pad_set_id uuid,
  add column rear_pad_set_id uuid,
  add constraint events_track_fkey foreign key (workspace_id, track_id) references public.tracks(workspace_id, id),
  add constraint events_configuration_fkey foreign key (workspace_id, track_id, configuration_id) references public.track_configurations(workspace_id, track_id, id),
  add constraint events_tire_set_fkey foreign key (workspace_id, tire_set_id) references public.tire_sets(workspace_id, id),
  add constraint events_front_pad_set_fkey foreign key (workspace_id, front_pad_set_id) references public.pad_sets(workspace_id, id),
  add constraint events_rear_pad_set_fkey foreign key (workspace_id, rear_pad_set_id) references public.pad_sets(workspace_id, id);

create index tracks_workspace_active_idx on public.tracks(workspace_id, is_active, name);
create index track_configurations_track_idx on public.track_configurations(workspace_id, track_id, is_active);
create index maintenance_records_vehicle_date_idx on public.maintenance_records(workspace_id, vehicle_id, service_date desc);
create index maintenance_records_event_idx on public.maintenance_records(workspace_id, event_id) where event_id is not null;
create index tire_sets_vehicle_status_idx on public.tire_sets(workspace_id, vehicle_id, status);
create index pad_sets_vehicle_status_idx on public.pad_sets(workspace_id, vehicle_id, status);
create index events_track_idx on public.events(workspace_id, track_id);
create index events_configuration_idx on public.events(workspace_id, configuration_id);
create index events_tire_set_idx on public.events(workspace_id, tire_set_id);
create index events_front_pad_set_idx on public.events(workspace_id, front_pad_set_id);
create index events_rear_pad_set_idx on public.events(workspace_id, rear_pad_set_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['tracks','track_configurations','maintenance_records','tire_sets','pad_sets']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy "workspace members read" on public.%I for select to authenticated using ((select private.is_workspace_member(workspace_id)))', table_name);
    execute format('create policy "workspace editors insert" on public.%I for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)))', table_name);
    execute format('create policy "workspace editors update" on public.%I for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)))', table_name);
    execute format('create policy "workspace admins delete" on public.%I for delete to authenticated using ((select private.can_admin_workspace(workspace_id)))', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function private.prevent_workspace_id_change()', table_name || '_workspace_id_immutable', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.vehicles, public.events to authenticated;
