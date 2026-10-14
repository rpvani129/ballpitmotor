-- Evaluate the actual installed storage policies, not a copy of their logic.
-- No storage objects are inserted or deleted; JWT settings are transaction-local.
begin;
do $$
declare v record; p record; allowed boolean; path text; bad_path text; r uuid;
begin
  select vehicles.id, vehicles.workspace_id, memberships.user_id into strict v from public.vehicles join public.memberships using(workspace_id) where vehicles.name='Cheese Ball' and memberships.status='active' and memberships.role='owner' limit 1;
  perform set_config('request.jwt.claim.sub',v.user_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',v.user_id,'role','authenticated')::text,true);
  path := v.workspace_id||'/'||v.id||'/vehicle/test.jpeg';
  bad_path := gen_random_uuid()||'/'||v.id||'/vehicle/test.jpeg';
  for p in select policyname, coalesce(with_check,qual) as expression from pg_policies where schemaname='storage' and policyname like 'vehicle document%' loop
    execute format('select %s from (select $1::text as name, $2::text as bucket_id) objects',p.expression) into allowed using path,'vehicle-attachments';
    if allowed is distinct from true then raise exception 'Valid vehicle path denied: %',p.policyname; end if;
    execute format('select %s from (select $1::text as name, $2::text as bucket_id) objects',p.expression) into allowed using bad_path,'vehicle-attachments';
    if allowed is distinct from false then raise exception 'Wrong workspace allowed: %',p.policyname; end if;
  end loop;
  select id into r from public.maintenance_records where vehicle_id=v.id limit 1;
  if r is not null then
    select with_check into p from pg_policies where schemaname='storage' and policyname='vehicle document editors insert';
    execute format('select %s from (select $1::text as name, $2::text as bucket_id) objects',p.with_check) into allowed using v.workspace_id||'/'||v.id||'/'||r||'/test.jpeg','vehicle-attachments';
    if allowed is distinct from true then raise exception 'Valid service path denied'; end if;
  end if;
  select with_check into p from pg_policies where schemaname='storage' and policyname='vehicle document editors insert';
  execute format('select %s from (select $1::text as name, $2::text as bucket_id) objects',p.with_check) into allowed using v.workspace_id||'/'||v.id||'/'||gen_random_uuid()||'/test.jpeg','vehicle-attachments';
  if allowed is distinct from false then raise exception 'Invalid service allowed'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
  for p in select policyname, coalesce(with_check,qual) as expression from pg_policies where schemaname='storage' and policyname like 'vehicle document%' loop
    execute format('select %s from (select $1::text as name, $2::text as bucket_id) objects',p.expression) into allowed using path,'vehicle-attachments';
    if allowed is distinct from false then raise exception 'Nonmember allowed: %',p.policyname; end if;
  end loop;
end $$;
rollback;
select 'Installed storage policies allow Cheese Ball owner read/upload/delete and valid service uploads, reject wrong workspace, invalid service, and nonmembers' as result;
