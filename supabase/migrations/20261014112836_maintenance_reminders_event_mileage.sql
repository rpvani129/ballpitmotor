alter table public.events add column starting_odometer_miles integer check(starting_odometer_miles >= 0), add column ending_odometer_miles integer check(ending_odometer_miles >= 0), add constraint event_odometer_order check(ending_odometer_miles is null or starting_odometer_miles is null or ending_odometer_miles >= starting_odometer_miles);
alter table public.vehicles add column odometer_recorded_on date;
create table public.maintenance_rules (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, vehicle_id uuid not null,
 name text not null check(char_length(btrim(name)) between 1 and 160), notes text check(char_length(notes)<=2000),
 interval_months integer check(interval_months between 1 and 1200), interval_miles integer check(interval_miles>0), interval_sessions integer check(interval_sessions>0),
 warning_days integer not null default 30 check(warning_days>=0), warning_miles integer not null default 500 check(warning_miles>=0), warning_sessions integer not null default 2 check(warning_sessions>=0),
 baseline_date date, baseline_miles integer check(baseline_miles>=0), baseline_sessions integer check(baseline_sessions>=0),
 state text not null default 'active' check(state in ('active','paused','archived')), version integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(interval_months is not null or interval_miles is not null or interval_sessions is not null),
 foreign key(workspace_id,vehicle_id) references public.vehicles(workspace_id,id) on delete cascade,
 unique(workspace_id,vehicle_id,id)
);
create index maintenance_rules_vehicle_idx on public.maintenance_rules(workspace_id,vehicle_id,state);
create table public.maintenance_completions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, vehicle_id uuid not null, rule_id uuid not null,
 completed_on date not null, odometer_miles integer check(odometer_miles>=0), session_count integer not null check(session_count>=0),
 notes text check(char_length(notes)<=2000), service_record_id uuid, completed_by uuid not null references auth.users(id) on delete restrict,
 cycle_version integer not null, rule_name text not null, interval_months integer, interval_miles integer, interval_sessions integer,
 created_at timestamptz not null default now(),
 foreign key(workspace_id,vehicle_id,rule_id) references public.maintenance_rules(workspace_id,vehicle_id,id) on delete cascade,
 foreign key(workspace_id,vehicle_id,service_record_id) references public.maintenance_records(workspace_id,vehicle_id,id) on delete set null(service_record_id),
 unique(rule_id,cycle_version)
);
create index maintenance_completions_rule_idx on public.maintenance_completions(workspace_id,rule_id,completed_on desc);
create index maintenance_completions_service_idx on public.maintenance_completions(workspace_id,vehicle_id,service_record_id);
create index maintenance_completions_user_idx on public.maintenance_completions(completed_by);
alter table public.maintenance_rules enable row level security;
alter table public.maintenance_completions enable row level security;
revoke all on public.maintenance_rules,public.maintenance_completions from anon,authenticated;
grant select,insert,update on public.maintenance_rules to authenticated;
grant select,insert on public.maintenance_completions to authenticated;
create policy "members read rules" on public.maintenance_rules for select to authenticated using((select private.is_workspace_member(workspace_id)));
create policy "editors create rules" on public.maintenance_rules for insert to authenticated with check((select private.can_edit_workspace(workspace_id)));
create policy "editors update rules" on public.maintenance_rules for update to authenticated using((select private.can_edit_workspace(workspace_id))) with check((select private.can_edit_workspace(workspace_id)));
create policy "members read completions" on public.maintenance_completions for select to authenticated using((select private.is_workspace_member(workspace_id)));
create policy "editors record completions" on public.maintenance_completions for insert to authenticated with check((select private.can_edit_workspace(workspace_id)) and completed_by=(select auth.uid()));
create trigger maintenance_rules_workspace_immutable before update on public.maintenance_rules for each row execute function private.prevent_workspace_id_change();
create function private.advance_maintenance_rule_version() returns trigger language plpgsql set search_path='' as $$ begin new.version:=old.version+1; new.updated_at:=now(); return new; end $$;
create trigger maintenance_rule_version before update on public.maintenance_rules for each row execute function private.advance_maintenance_rule_version();
create function public.complete_maintenance_rule(p_rule_id uuid,p_expected_version integer,p_completed_on date,p_odometer_miles integer,p_notes text,p_service_mode text,p_service_record_id uuid default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rule public.maintenance_rules; sessions_completed integer; service_id uuid; completion_id uuid;
begin
 select * into rule from public.maintenance_rules where id=p_rule_id for update;
 if rule.id is null or not private.can_edit_workspace(rule.workspace_id) then raise exception 'Reminder not found or access denied'; end if;
 if p_expected_version is null or rule.version<>p_expected_version then raise exception 'This reminder changed. Reload before completing it.'; end if;
 if rule.state<>'active' then raise exception 'Resume this reminder before completing it'; end if;
 if p_completed_on is null or p_completed_on>(now() at time zone 'America/Chicago')::date or (rule.baseline_date is not null and p_completed_on<rule.baseline_date) then raise exception 'Invalid completion date'; end if;
 if p_odometer_miles<0 or (rule.interval_miles is not null and p_odometer_miles is null) or (rule.baseline_miles is not null and p_odometer_miles<rule.baseline_miles) then raise exception 'Enter a valid completion mileage'; end if;
 if p_service_mode is null or p_service_mode not in ('none','create','link') or char_length(p_notes)>2000 then raise exception 'Invalid completion input'; end if;
 select count(*)::integer into sessions_completed from public.sessions s join public.events e on e.id=s.event_id and e.workspace_id=s.workspace_id where e.workspace_id=rule.workspace_id and e.vehicle_id=rule.vehicle_id and e.status in ('active','complete','needs_review') and e.event_date<=p_completed_on;
 if p_service_mode='create' then
  insert into public.maintenance_records(workspace_id,vehicle_id,service_date,category,title,description,odometer_miles) values(rule.workspace_id,rule.vehicle_id,p_completed_on,'Maintenance',rule.name,p_notes,p_odometer_miles) returning id into service_id;
 elsif p_service_mode='link' then
  select id into service_id from public.maintenance_records where id=p_service_record_id and workspace_id=rule.workspace_id and vehicle_id=rule.vehicle_id;
  if service_id is null then raise exception 'Choose a service record belonging to this vehicle'; end if;
 end if;
 insert into public.maintenance_completions(workspace_id,vehicle_id,rule_id,completed_on,odometer_miles,session_count,notes,service_record_id,completed_by,cycle_version,rule_name,interval_months,interval_miles,interval_sessions)
 values(rule.workspace_id,rule.vehicle_id,rule.id,p_completed_on,p_odometer_miles,sessions_completed,p_notes,service_id,auth.uid(),rule.version,rule.name,rule.interval_months,rule.interval_miles,rule.interval_sessions) returning id into completion_id;
 update public.maintenance_rules set baseline_date=p_completed_on,baseline_miles=p_odometer_miles,baseline_sessions=sessions_completed where id=rule.id;
 return completion_id;
end $$;
revoke all on function public.complete_maintenance_rule(uuid,integer,date,integer,text,text,uuid) from public,anon;
grant execute on function public.complete_maintenance_rule(uuid,integer,date,integer,text,text,uuid) to authenticated;
