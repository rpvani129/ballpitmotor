create table public.data_management_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_name text not null,
  file_sha256 text not null,
  status text not null default 'review' check (status in ('review','failed','committed')),
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  summary jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (workspace_id, file_sha256, created_at)
);

create index data_management_imports_workspace_idx
  on public.data_management_imports(workspace_id, created_at desc);
create index data_management_imports_creator_idx
  on public.data_management_imports(created_by);

alter table public.data_management_imports enable row level security;
revoke all on public.data_management_imports from anon;
grant select, insert, update, delete on public.data_management_imports to authenticated;
create policy "workspace members read" on public.data_management_imports for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.data_management_imports for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and created_by = (select auth.uid()));
create policy "workspace editors update" on public.data_management_imports for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.data_management_imports for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));
create trigger data_management_imports_workspace_id_immutable before update on public.data_management_imports
  for each row execute function private.prevent_workspace_id_change();

create or replace function public.commit_data_management_import(p_import_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_import public.data_management_imports%rowtype;
  v_change jsonb;
  v_payload jsonb;
  v_count integer := 0;
begin
  select * into v_import from public.data_management_imports
  where id = p_import_id and status = 'review' for update;
  if not found then raise exception 'Import is not available for review'; end if;
  if not (select private.can_edit_workspace(v_import.workspace_id)) then raise exception 'Not authorized'; end if;
  if jsonb_array_length(v_import.errors) > 0 then raise exception 'Import contains unresolved errors'; end if;

  for v_change in select value from jsonb_array_elements(v_import.changes)
  loop
    v_payload := v_change->'payload';
    case v_change->>'entity'
      when 'vehicles' then
        insert into public.vehicles(id,workspace_id,business_id,name,status,year,make,model,trim,race_number,competition_class,description,wiki_url,image_url,current_odometer_miles,acquired_on)
        values ((v_change->>'id')::uuid,v_import.workspace_id,v_payload->>'business_id',v_payload->>'name',coalesce(nullif(v_payload->>'status',''),'active'),nullif(v_payload->>'year','')::integer,nullif(v_payload->>'make',''),nullif(v_payload->>'model',''),nullif(v_payload->>'trim',''),nullif(v_payload->>'race_number',''),nullif(v_payload->>'competition_class',''),nullif(v_payload->>'description',''),nullif(v_payload->>'wiki_url',''),nullif(v_payload->>'image_url',''),nullif(v_payload->>'current_odometer_miles','')::integer,nullif(v_payload->>'acquired_on','')::date)
        on conflict (id) do update set business_id=excluded.business_id,name=excluded.name,status=excluded.status,year=excluded.year,make=excluded.make,model=excluded.model,trim=excluded.trim,race_number=excluded.race_number,competition_class=excluded.competition_class,description=excluded.description,wiki_url=excluded.wiki_url,image_url=excluded.image_url,current_odometer_miles=excluded.current_odometer_miles,acquired_on=excluded.acquired_on;
      when 'tracks' then
        insert into public.tracks(id,workspace_id,name,short_name,address,city,region,postal_code,country,latitude,longitude,timezone,website_url,notes,is_active)
        values ((v_change->>'id')::uuid,v_import.workspace_id,v_payload->>'name',nullif(v_payload->>'short_name',''),nullif(v_payload->>'address',''),nullif(v_payload->>'city',''),nullif(v_payload->>'region',''),nullif(v_payload->>'postal_code',''),coalesce(nullif(v_payload->>'country',''),'USA'),nullif(v_payload->>'latitude','')::numeric,nullif(v_payload->>'longitude','')::numeric,coalesce(nullif(v_payload->>'timezone',''),'America/Chicago'),nullif(v_payload->>'website_url',''),nullif(v_payload->>'notes',''),coalesce((v_payload->>'is_active')::boolean,true))
        on conflict (id) do update set name=excluded.name,short_name=excluded.short_name,address=excluded.address,city=excluded.city,region=excluded.region,postal_code=excluded.postal_code,country=excluded.country,latitude=excluded.latitude,longitude=excluded.longitude,timezone=excluded.timezone,website_url=excluded.website_url,notes=excluded.notes,is_active=excluded.is_active;
      when 'track_configurations' then
        insert into public.track_configurations(id,workspace_id,track_id,name,direction,distance_miles,is_active)
        values ((v_change->>'id')::uuid,v_import.workspace_id,(v_payload->>'track_id')::uuid,v_payload->>'name',nullif(v_payload->>'direction',''),nullif(v_payload->>'distance_miles','')::numeric,coalesce((v_payload->>'is_active')::boolean,true))
        on conflict (id) do update set track_id=excluded.track_id,name=excluded.name,direction=excluded.direction,distance_miles=excluded.distance_miles,is_active=excluded.is_active;
      when 'tire_sets' then
        insert into public.tire_sets(id,workspace_id,vehicle_id,business_id,manufacturer,model,size,compound,purchased_on,first_used_on,starting_sessions,status,notes,is_current)
        values ((v_change->>'id')::uuid,v_import.workspace_id,(v_payload->>'vehicle_id')::uuid,v_payload->>'business_id',v_payload->>'manufacturer',v_payload->>'model',nullif(v_payload->>'size',''),nullif(v_payload->>'compound',''),nullif(v_payload->>'purchased_on','')::date,nullif(v_payload->>'first_used_on','')::date,nullif(v_payload->>'starting_sessions','')::integer,coalesce(nullif(v_payload->>'status',''),'active'),nullif(v_payload->>'notes',''),coalesce((v_payload->>'is_current')::boolean,false))
        on conflict (id) do update set vehicle_id=excluded.vehicle_id,business_id=excluded.business_id,manufacturer=excluded.manufacturer,model=excluded.model,size=excluded.size,compound=excluded.compound,purchased_on=excluded.purchased_on,first_used_on=excluded.first_used_on,starting_sessions=excluded.starting_sessions,status=excluded.status,notes=excluded.notes,is_current=excluded.is_current;
      when 'pad_sets' then
        insert into public.pad_sets(id,workspace_id,vehicle_id,business_id,axle,manufacturer,model,compound,purchased_on,first_used_on,starting_sessions,status,notes,is_current)
        values ((v_change->>'id')::uuid,v_import.workspace_id,(v_payload->>'vehicle_id')::uuid,v_payload->>'business_id',v_payload->>'axle',v_payload->>'manufacturer',v_payload->>'model',nullif(v_payload->>'compound',''),nullif(v_payload->>'purchased_on','')::date,nullif(v_payload->>'first_used_on','')::date,nullif(v_payload->>'starting_sessions','')::integer,coalesce(nullif(v_payload->>'status',''),'active'),nullif(v_payload->>'notes',''),coalesce((v_payload->>'is_current')::boolean,false))
        on conflict (id) do update set vehicle_id=excluded.vehicle_id,business_id=excluded.business_id,axle=excluded.axle,manufacturer=excluded.manufacturer,model=excluded.model,compound=excluded.compound,purchased_on=excluded.purchased_on,first_used_on=excluded.first_used_on,starting_sessions=excluded.starting_sessions,status=excluded.status,notes=excluded.notes,is_current=excluded.is_current;
      when 'teams' then
        insert into public.teams(id,workspace_id,name) values ((v_change->>'id')::uuid,v_import.workspace_id,v_payload->>'name')
        on conflict (id) do update set name=excluded.name;
      when 'event_types' then
        insert into public.event_types(id,workspace_id,name) values ((v_change->>'id')::uuid,v_import.workspace_id,v_payload->>'name')
        on conflict (id) do update set name=excluded.name;
      else raise exception 'Unsupported import entity: %', v_change->>'entity';
    end case;
    v_count := v_count + 1;
  end loop;

  update public.data_management_imports set status='committed', committed_at=now() where id=v_import.id;
  return v_count;
end;
$$;
revoke all on function public.commit_data_management_import(uuid) from public, anon;
grant execute on function public.commit_data_management_import(uuid) to authenticated;
