create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  driver_name text not null check (char_length(trim(driver_name)) between 1 and 120),
  driver_number text check (driver_number is null or char_length(trim(driver_number)) <= 20),
  team_name text check (team_name is null or char_length(trim(team_name)) <= 120),
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.slugify_profile_name(value text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(value, 'driver')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));
$$;

create or replace function private.set_profile_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
declare base_slug text;
begin
  base_slug := private.slugify_profile_name(coalesce(nullif(trim(new.driver_name), ''), concat_ws('-', new.first_name, new.last_name)));
  if base_slug = '' then base_slug := 'driver'; end if;
  if tg_op = 'INSERT' or new.public_slug is null or new.public_slug = '' or new.driver_name is distinct from old.driver_name then
    new.public_slug := base_slug;
    if exists (select 1 from public.user_profiles p where p.public_slug = new.public_slug and p.user_id <> new.user_id) then
      new.public_slug := base_slug || '-' || left(replace(new.user_id::text, '-', ''), 6);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_profiles_set_slug before insert or update of driver_name on public.user_profiles
for each row execute function private.set_profile_slug();

insert into public.user_profiles (user_id, first_name, last_name, driver_name, driver_number, team_name, public_slug, onboarding_complete)
select u.id,
  coalesce(nullif(split_part(coalesce(p.display_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), ' ', 1), ''), 'Driver'),
  coalesce(nullif(trim(substr(coalesce(p.display_name, u.raw_user_meta_data->>'full_name', ''), length(split_part(coalesce(p.display_name, u.raw_user_meta_data->>'full_name', ''), ' ', 1)) + 1)), ''), 'Profile'),
  coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  null, null, 'pending-' || left(replace(u.id::text, '-', ''), 12), true
from auth.users u
left join lateral (select pe.display_name from public.people pe where pe.linked_user_id = u.id limit 1) p on true
on conflict (user_id) do nothing;

update public.user_profiles up
set first_name = 'Roshan', last_name = 'Vani', driver_name = 'Roshan-Vani', onboarding_complete = true
from auth.users u
where u.id = up.user_id and lower(u.email) = lower('roshan.p.vani@gmail.com');

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare supplied_first text; supplied_last text; supplied_driver text;
begin
  supplied_first := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  supplied_last := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  supplied_driver := nullif(trim(new.raw_user_meta_data->>'driver_name'), '');
  insert into public.user_profiles (user_id, first_name, last_name, driver_name, driver_number, team_name, public_slug, onboarding_complete)
  values (
    new.id,
    coalesce(supplied_first, nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), ' ', 1), ''), 'Driver'),
    coalesce(supplied_last, nullif(trim(substr(coalesce(new.raw_user_meta_data->>'full_name', ''), length(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1)) + 1)), ''), 'Profile'),
    coalesce(supplied_driver, concat_ws('-', supplied_first, supplied_last), nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'driver_number'), ''),
    nullif(trim(new.raw_user_meta_data->>'team_name'), ''),
    'pending-' || left(replace(new.id::text, '-', ''), 12),
    supplied_first is not null and supplied_last is not null
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger auth_user_create_profile after insert on auth.users
for each row execute function private.create_profile_for_new_user();

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon;
grant select, insert, update on public.user_profiles to authenticated;
create policy "users read own profile" on public.user_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "users insert own profile" on public.user_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own profile" on public.user_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.get_public_events(requested_workspace_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when coalesce(es.show_public_events, false) then jsonb_build_object(
    'workspace', jsonb_build_object('name', w.name),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'business_id', e.business_id, 'event_date', e.event_date, 'event_name', e.event_name,
      'track_name', e.track_name, 'configuration_name', e.configuration_name,
      'organization_name', e.organization_name, 'vehicle_name', v.name,
      'session_count', (select count(*) from public.sessions s where s.event_id=e.id),
      'fastest_lap_ms', (select min(s.best_lap_ms) from public.sessions s where s.event_id=e.id and s.best_lap_ms is not null)
    ) order by e.event_date desc,e.business_id desc) from public.events e left join public.vehicles v on v.id=e.vehicle_id where e.workspace_id=w.id and e.status<>'cancelled'), '[]'::jsonb)
  ) else null end
  from public.user_profiles up
  join lateral (select m.workspace_id from public.memberships m where m.user_id=up.user_id and m.status='active' order by m.created_at limit 1) membership on true
  join public.workspaces w on w.id=membership.workspace_id
  left join public.event_settings es on es.workspace_id=w.id
  where (up.public_slug=requested_workspace_slug or w.slug=requested_workspace_slug) and up.onboarding_complete=true;
$$;

create or replace function public.get_public_event(requested_workspace_slug text, requested_event_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when coalesce(es.show_public_events,false) then (select jsonb_build_object(
    'workspace', jsonb_build_object('name',w.name),
    'event', jsonb_build_object(
      'business_id',e.business_id,'event_date',e.event_date,'event_name',e.event_name,'track_name',e.track_name,'configuration_name',e.configuration_name,
      'organization_name',e.organization_name,'vehicle_name',v.name,'temperature_f',e.temperature_f,'conditions',e.conditions,'wind_speed_mph',e.wind_speed_mph,
      'humidity_pct',e.humidity_pct,'precipitation_in',e.precipitation_in,'track_condition',e.track_condition,
      'tire',case when t.id is null then null else jsonb_build_object('description',concat_ws(' · ',t.manufacturer,t.model,t.size,t.compound),'code',t.business_id) end,
      'front_pad',case when fp.id is null then null else jsonb_build_object('description',concat_ws(' · ',fp.manufacturer,fp.model,fp.compound),'code',fp.business_id) end,
      'rear_pad',case when rp.id is null then null else jsonb_build_object('description',concat_ws(' · ',rp.manufacturer,rp.model,rp.compound),'code',rp.business_id) end),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('session_number',s.session_number,'started_at',s.started_at,'best_lap_ms',s.best_lap_ms,'is_fastest',s.is_fastest) order by s.session_number) from public.sessions s where s.event_id=e.id),'[]'::jsonb)
  ) from public.events e left join public.vehicles v on v.id=e.vehicle_id left join public.tire_sets t on t.id=e.tire_set_id left join public.pad_sets fp on fp.id=e.front_pad_set_id left join public.pad_sets rp on rp.id=e.rear_pad_set_id where e.workspace_id=w.id and e.business_id=requested_event_id and e.status<>'cancelled') else null end
  from public.user_profiles up
  join lateral (select m.workspace_id from public.memberships m where m.user_id=up.user_id and m.status='active' order by m.created_at limit 1) membership on true
  join public.workspaces w on w.id=membership.workspace_id left join public.event_settings es on es.workspace_id=w.id
  where (up.public_slug=requested_workspace_slug or w.slug=requested_workspace_slug) and up.onboarding_complete=true;
$$;

revoke all on function public.get_public_events(text) from public;
revoke all on function public.get_public_event(text,text) from public;
grant execute on function public.get_public_events(text) to anon,authenticated;
grant execute on function public.get_public_event(text,text) to anon,authenticated;
