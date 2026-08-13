create table public.event_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  show_public_events boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.event_note_categories (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (workspace_id, name)
);

insert into public.event_settings (workspace_id)
select id from public.workspaces on conflict do nothing;

insert into public.event_note_categories (workspace_id, name)
select w.id, category.name
from public.workspaces w
cross join (values ('General'), ('Plan'), ('Setup'), ('Driver Feedback'), ('Incident'), ('Follow-up')) category(name)
on conflict do nothing;

alter table public.event_notes drop constraint if exists event_notes_category_check;
alter table public.event_notes
  add constraint event_notes_workspace_category_fkey
  foreign key (workspace_id, category)
  references public.event_note_categories(workspace_id, name)
  on update cascade on delete restrict;

create index event_notes_workspace_category_idx on public.event_notes(workspace_id, category);

alter table public.event_settings enable row level security;
alter table public.event_note_categories enable row level security;
revoke all on public.event_settings, public.event_note_categories from anon;
grant select, insert, update on public.event_settings to authenticated;
grant select, insert, delete on public.event_note_categories to authenticated;

create policy "workspace members read" on public.event_settings for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace admins insert" on public.event_settings for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace admins update" on public.event_settings for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));

create policy "workspace members read" on public.event_note_categories for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.event_note_categories for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.event_note_categories for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create or replace function public.get_public_events(requested_workspace_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when coalesce(es.show_public_events, false) then jsonb_build_object(
    'workspace', jsonb_build_object('name', w.name, 'slug', w.slug),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'business_id', e.business_id, 'event_date', e.event_date, 'event_name', e.event_name,
        'track_name', e.track_name, 'configuration_name', e.configuration_name,
        'organization_name', e.organization_name, 'vehicle_name', v.name,
        'session_count', (select count(*) from public.sessions s where s.event_id = e.id),
        'fastest_lap_ms', (select min(s.best_lap_ms) from public.sessions s where s.event_id = e.id and s.best_lap_ms is not null)
      ) order by e.event_date desc, e.business_id desc)
      from public.events e left join public.vehicles v on v.id = e.vehicle_id
      where e.workspace_id = w.id and e.status <> 'cancelled'
    ), '[]'::jsonb)
  ) else null end
  from public.workspaces w
  left join public.event_settings es on es.workspace_id = w.id
  where w.slug = requested_workspace_slug;
$$;

create or replace function public.get_public_event(requested_workspace_slug text, requested_event_id text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when coalesce(es.show_public_events, false) then (
    select jsonb_build_object(
      'workspace', jsonb_build_object('name', w.name, 'slug', w.slug),
      'event', jsonb_build_object(
        'business_id', e.business_id, 'event_date', e.event_date, 'event_name', e.event_name,
        'track_name', e.track_name, 'configuration_name', e.configuration_name,
        'organization_name', e.organization_name, 'vehicle_name', v.name,
        'temperature_f', e.temperature_f, 'conditions', e.conditions,
        'wind_speed_mph', e.wind_speed_mph, 'humidity_pct', e.humidity_pct,
        'precipitation_in', e.precipitation_in, 'track_condition', e.track_condition,
        'tire', case when t.id is null then null else jsonb_build_object('description', concat_ws(' · ', t.manufacturer, t.model, t.size, t.compound), 'code', t.business_id) end,
        'front_pad', case when fp.id is null then null else jsonb_build_object('description', concat_ws(' · ', fp.manufacturer, fp.model, fp.compound), 'code', fp.business_id) end,
        'rear_pad', case when rp.id is null then null else jsonb_build_object('description', concat_ws(' · ', rp.manufacturer, rp.model, rp.compound), 'code', rp.business_id) end
      ),
      'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'session_number', s.session_number, 'started_at', s.started_at,
        'best_lap_ms', s.best_lap_ms, 'is_fastest', s.is_fastest
      ) order by s.session_number) from public.sessions s where s.event_id = e.id), '[]'::jsonb)
    )
    from public.events e
    left join public.vehicles v on v.id = e.vehicle_id
    left join public.tire_sets t on t.id = e.tire_set_id
    left join public.pad_sets fp on fp.id = e.front_pad_set_id
    left join public.pad_sets rp on rp.id = e.rear_pad_set_id
    where e.workspace_id = w.id and e.business_id = requested_event_id and e.status <> 'cancelled'
  ) else null end
  from public.workspaces w
  left join public.event_settings es on es.workspace_id = w.id
  where w.slug = requested_workspace_slug;
$$;

revoke all on function public.get_public_events(text) from public;
revoke all on function public.get_public_event(text, text) from public;
grant execute on function public.get_public_events(text) to anon, authenticated;
grant execute on function public.get_public_event(text, text) to anon, authenticated;
