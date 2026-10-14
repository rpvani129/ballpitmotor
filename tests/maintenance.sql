-- Rollback-only integration test; existing records remain untouched.
begin;
do $$ declare u uuid;w uuid:=gen_random_uuid();v uuid:=gen_random_uuid();e uuid:=gen_random_uuid();p uuid:=gen_random_uuid();f uuid:=gen_random_uuid();r uuid:=gen_random_uuid();d date:=(now() at time zone 'America/Chicago')::date;
begin
 select user_id into strict u from public.memberships where status='active' and role='owner' limit 1;
 insert into public.workspaces(id,name,slug,created_by) values(w,'Maintenance test',w::text,u);
 insert into public.memberships(workspace_id,user_id,role) values(w,u,'owner');
 insert into public.vehicles(id,workspace_id,business_id,name) values(v,w,'TEST','Maintenance test vehicle');
 insert into public.events(id,workspace_id,business_id,event_date,event_name,track_name,configuration_name,status,vehicle_id,created_by) values(e,w,'TEST1',d,'Logged','Test','Test','complete',v,u),(p,w,'TEST2',d,'Planned','Test','Test','planned',v,u),(f,w,'TEST3',d+1,'Future','Test','Test','active',v,u);
 insert into public.sessions(workspace_id,event_id,session_number,created_by) values(w,e,1,u),(w,e,2,u),(w,p,1,u),(w,f,1,u);
 insert into public.maintenance_rules(id,workspace_id,vehicle_id,name,interval_months,interval_miles,interval_sessions,baseline_date,baseline_miles,baseline_sessions) values(r,w,v,'Oil service',6,1000,10,d-10,1000,0);
 perform set_config('test.workspace',w::text,true);perform set_config('test.vehicle',v::text,true);perform set_config('test.event',e::text,true);perform set_config('test.rule',r::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare r uuid:=current_setting('test.rule')::uuid;w uuid:=current_setting('test.workspace')::uuid;v uuid:=current_setting('test.vehicle')::uuid;d date:=(now() at time zone 'America/Chicago')::date;c uuid;linked uuid;current_rule public.maintenance_rules;n integer;
begin
 update public.events set starting_odometer_miles=1200,ending_odometer_miles=1250 where id=current_setting('test.event')::uuid;
 begin
  update public.events set ending_odometer_miles=1199 where id=current_setting('test.event')::uuid;
  raise exception 'Backward event mileage accepted';
 exception when check_violation then null;end;
 c:=public.complete_maintenance_rule(r,0,d,1250,'Test completion','none',null);
 select * into current_rule from public.maintenance_rules where id=r;
 if current_rule.version<>1 or current_rule.baseline_miles<>1250 or current_rule.baseline_sessions<>2 then raise exception 'Baseline/session snapshot wrong';end if;
 if (select count(*) from public.maintenance_completions where rule_id=r)<>1 then raise exception 'Completion missing';end if;
 if exists(select 1 from public.maintenance_records where workspace_id=w) then raise exception 'Completion-only created service';end if;
 begin
  perform public.complete_maintenance_rule(r,0,d,1300,null,'create',null);
  raise exception using errcode='23514',message='Duplicate completion allowed';
 exception when raise_exception then null;end;
 if (select count(*) from public.maintenance_completions where rule_id=r)<>1 then raise exception 'Duplicate history created';end if;
 c:=public.complete_maintenance_rule(r,1,d,1300,'Created service','create',null);
 select service_record_id into linked from public.maintenance_completions where id=c;
 if linked is null or not exists(select 1 from public.maintenance_records where id=linked and odometer_miles=1300) then raise exception 'Service creation failed';end if;
 c:=public.complete_maintenance_rule(r,2,d,1350,'Link service','link',linked);
 if (select service_record_id from public.maintenance_completions where id=c)<>linked then raise exception 'Service link failed';end if;
 if (select count(*) from public.maintenance_records where workspace_id=w)<>1 then raise exception 'Linked completion created extra service';end if;
 begin
  perform public.complete_maintenance_rule(r,3,d,1400,null,'link',gen_random_uuid());
  raise exception using errcode='23514',message='Invalid link allowed';
 exception when raise_exception then null;end;
 begin
  perform public.complete_maintenance_rule(r,3,d+1,1400,null,'none',null);
  raise exception using errcode='23514',message='Future completion allowed';
 exception when raise_exception then null;end;
 begin
  perform public.complete_maintenance_rule(r,3,d,1000,null,'none',null);
  raise exception using errcode='23514',message='Backward completion mileage allowed';
 exception when raise_exception then null;end;
 if (select count(*) from public.maintenance_completions where rule_id=r)<>3 then raise exception 'Failed completion changed history';end if;
 update public.maintenance_rules set state='paused' where id=r;
 begin
  perform public.complete_maintenance_rule(r,4,d,1400,null,'none',null);
  raise exception using errcode='23514',message='Paused completion allowed';
 exception when raise_exception then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.maintenance_rules where id=current_setting('test.rule')::uuid) then raise exception 'Nonmember read allowed';end if;
 if exists(select 1 from public.maintenance_completions where rule_id=current_setting('test.rule')::uuid) then raise exception 'Nonmember history allowed';end if;
 update public.maintenance_rules set name='Unauthorized' where id=current_setting('test.rule')::uuid;
 if found then raise exception 'Nonmember update allowed';end if;
 begin
  perform public.complete_maintenance_rule(current_setting('test.rule')::uuid,4,(now() at time zone 'America/Chicago')::date,1500,null,'none',null);
  raise exception using errcode='23514',message='Nonmember completion allowed';
 exception when raise_exception then null;end;
end $$;
reset role;
rollback;
select 'Mileage constraints, session exclusion, atomic completions, service create/link/none, duplicate/date/mileage/paused rejection and tenant isolation passed; fixtures rolled back' as result;
