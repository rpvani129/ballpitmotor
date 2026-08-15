alter table public.tire_sets
  add column is_current boolean not null default false;

alter table public.pad_sets
  add column is_current boolean not null default false;

with latest_event_tires as (
  select distinct on (e.workspace_id, e.vehicle_id)
    e.workspace_id, e.vehicle_id, e.tire_set_id
  from public.events e
  join public.tire_sets t on t.workspace_id = e.workspace_id and t.id = e.tire_set_id
  where e.vehicle_id is not null and e.tire_set_id is not null and t.status = 'active'
  order by e.workspace_id, e.vehicle_id, e.event_date desc, e.created_at desc
), fallback_tires as (
  select distinct on (t.workspace_id, t.vehicle_id)
    t.workspace_id, t.vehicle_id, t.id as tire_set_id
  from public.tire_sets t
  where t.status = 'active'
    and not exists (
      select 1 from latest_event_tires l
      where l.workspace_id = t.workspace_id and l.vehicle_id = t.vehicle_id
    )
  order by t.workspace_id, t.vehicle_id, t.first_used_on desc nulls last, t.created_at desc
), current_tires as (
  select * from latest_event_tires
  union all
  select * from fallback_tires
)
update public.tire_sets t
set is_current = true
from current_tires c
where t.workspace_id = c.workspace_id and t.id = c.tire_set_id;

with event_pad_assignments as (
  select e.workspace_id, e.vehicle_id, e.front_pad_set_id as pad_set_id, 'front'::text as axle, e.event_date, e.created_at
  from public.events e where e.vehicle_id is not null and e.front_pad_set_id is not null
  union all
  select e.workspace_id, e.vehicle_id, e.rear_pad_set_id, 'rear'::text, e.event_date, e.created_at
  from public.events e where e.vehicle_id is not null and e.rear_pad_set_id is not null
), latest_event_pads as (
  select distinct on (a.workspace_id, a.vehicle_id, a.axle)
    a.workspace_id, a.vehicle_id, a.axle, a.pad_set_id
  from event_pad_assignments a
  join public.pad_sets p on p.workspace_id = a.workspace_id and p.id = a.pad_set_id and p.axle = a.axle
  where p.status = 'active'
  order by a.workspace_id, a.vehicle_id, a.axle, a.event_date desc, a.created_at desc
), fallback_pads as (
  select distinct on (p.workspace_id, p.vehicle_id, p.axle)
    p.workspace_id, p.vehicle_id, p.axle, p.id as pad_set_id
  from public.pad_sets p
  where p.status = 'active'
    and not exists (
      select 1 from latest_event_pads l
      where l.workspace_id = p.workspace_id and l.vehicle_id = p.vehicle_id and l.axle = p.axle
    )
  order by p.workspace_id, p.vehicle_id, p.axle, p.first_used_on desc nulls last, p.created_at desc
), current_pads as (
  select * from latest_event_pads
  union all
  select * from fallback_pads
)
update public.pad_sets p
set is_current = true
from current_pads c
where p.workspace_id = c.workspace_id and p.id = c.pad_set_id;

create unique index tire_sets_one_current_per_vehicle_idx
  on public.tire_sets(workspace_id, vehicle_id)
  where is_current;

create unique index pad_sets_one_current_per_vehicle_axle_idx
  on public.pad_sets(workspace_id, vehicle_id, axle)
  where is_current;

create or replace function private.keep_one_current_tire_set()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_current then
    update public.tire_sets
    set is_current = false
    where workspace_id = new.workspace_id
      and vehicle_id = new.vehicle_id
      and id <> new.id
      and is_current;
  end if;
  return new;
end;
$$;

create or replace function private.keep_one_current_pad_set()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_current then
    update public.pad_sets
    set is_current = false
    where workspace_id = new.workspace_id
      and vehicle_id = new.vehicle_id
      and axle = new.axle
      and id <> new.id
      and is_current;
  end if;
  return new;
end;
$$;

revoke all on function private.keep_one_current_tire_set() from public;
revoke all on function private.keep_one_current_pad_set() from public;

create trigger tire_sets_keep_one_current
before insert or update of is_current, vehicle_id on public.tire_sets
for each row execute function private.keep_one_current_tire_set();

create trigger pad_sets_keep_one_current
before insert or update of is_current, vehicle_id, axle on public.pad_sets
for each row execute function private.keep_one_current_pad_set();
