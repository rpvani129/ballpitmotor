-- Integration checks run inside a rollback-only transaction; no fixture survives.
begin;
do $$
declare u uuid; w uuid := gen_random_uuid(); other_w uuid := gen_random_uuid(); v uuid := gen_random_uuid(); other_v uuid := gen_random_uuid(); r uuid := gen_random_uuid();
begin
  select user_id into strict u from public.memberships where status='active' and role='owner' limit 1;
  insert into public.workspaces(id,name,slug,created_by) values (w,'Attachment test',w::text,u),(other_w,'Other attachment test',other_w::text,u);
  insert into public.memberships(workspace_id,user_id,role,status) values(w,u,'owner','active');
  insert into public.vehicles(id,workspace_id,business_id,name) values(v,w,'TEST','Attachment test'),(other_v,other_w,'TEST','Other attachment test');
  insert into public.maintenance_records(id,workspace_id,vehicle_id,service_date,title) values(r,w,v,current_date,'Attachment test service');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  perform set_config('test.workspace',w::text,true); perform set_config('test.other_workspace',other_w::text,true);
  perform set_config('test.vehicle',v::text,true); perform set_config('test.other_vehicle',other_v::text,true); perform set_config('test.record',r::text,true);
end $$;
set local role authenticated;
do $$
declare w uuid := current_setting('test.workspace')::uuid; v uuid := current_setting('test.vehicle')::uuid; r uuid := current_setting('test.record')::uuid; a uuid; b uuid;
begin
  insert into public.vehicle_attachments(workspace_id,vehicle_id,storage_path,file_name,mime_type,file_size_bytes,title,uploaded_by)
    values(w,v,w||'/'||v||'/vehicle/test.pdf','test.pdf','application/pdf',1,'Registration test',auth.uid()) returning id into a;
  insert into public.vehicle_attachments(workspace_id,vehicle_id,maintenance_record_id,storage_path,file_name,mime_type,file_size_bytes,title,uploaded_by)
    values(w,v,r,w||'/'||v||'/'||r||'/test.pdf','test.pdf','application/pdf',1,'Service test',auth.uid()) returning id into b;
  if (select count(*) from public.vehicle_attachments where id in(a,b)) <> 2 then raise exception 'Owner read failed'; end if;
  begin
    insert into public.vehicle_attachments(workspace_id,vehicle_id,storage_path,file_name,mime_type,file_size_bytes,title,uploaded_by)
      values(current_setting('test.other_workspace')::uuid,current_setting('test.other_vehicle')::uuid,current_setting('test.other_workspace')||'/'||current_setting('test.other_vehicle')||'/vehicle/test.pdf','test.pdf','application/pdf',1,'Unauthorized',auth.uid());
    raise exception 'Cross-workspace insert was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.vehicle_attachments(workspace_id,vehicle_id,storage_path,file_name,mime_type,file_size_bytes,title,uploaded_by)
      values(w,v,w||'/'||v||'/vehicle/too-large.pdf','test.pdf','application/pdf',26214401,'Too large',auth.uid());
    raise exception 'Oversize metadata accepted';
  exception when check_violation then null; end;
  begin
    delete from public.maintenance_records where id=r;
    raise exception 'Parent deleted with attachments';
  exception when foreign_key_violation then null; end;
  begin
    delete from public.vehicles where id=v;
    raise exception 'Vehicle deleted with attachments';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.vehicle_attachments(workspace_id,vehicle_id,maintenance_record_id,storage_path,file_name,mime_type,file_size_bytes,title,uploaded_by)
      values(w,v,gen_random_uuid(),w||'/'||v||'/vehicle/bad.pdf','test.pdf','application/pdf',1,'Bad parent',auth.uid());
    raise exception 'Invalid parent accepted';
  exception when check_violation or foreign_key_violation then null; end;
end $$;
reset role;
-- Simulate a caller with no membership in either fixture workspace.
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
select set_config('request.jwt.claims', json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.vehicle_attachments where workspace_id=current_setting('test.workspace')::uuid) then raise exception 'Cross-workspace read permitted'; end if;
  delete from public.vehicle_attachments where workspace_id=current_setting('test.workspace')::uuid;
  if found then raise exception 'Cross-workspace delete permitted'; end if;
end $$;
reset role;
rollback;
select 'Attachment owner access, tenant isolation, size validation and parent integrity passed; fixtures rolled back' as result;
