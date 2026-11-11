-- Run as the database owner; all validation records roll back.
begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.memberships where status='active' and role='owner' order by created_at limit 1), true);
set local role authenticated;
do $$
declare ws uuid;
begin
  select workspace_id into strict ws from public.memberships where user_id=auth.uid() and status='active' order by created_at limit 1;
  insert into public.event_interests(workspace_id,user_id,drive_ntx_event_id) values(ws,auth.uid(),'validation-shortlist-20261111') on conflict do nothing;
  insert into public.event_interests(workspace_id,user_id,drive_ntx_event_id) values(ws,auth.uid(),'validation-shortlist-20261111') on conflict do nothing;
  if (select count(*) from public.event_interests where drive_ntx_event_id='validation-shortlist-20261111') <> 1 then raise exception 'Own bookmark or duplicate protection failed'; end if;
  begin
    insert into public.event_interests(workspace_id,user_id,drive_ntx_event_id) values(ws,'00000000-0000-0000-0000-000000000001','validation-shortlist-20261111');
    raise exception 'Cross-user insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.event_interests(workspace_id,user_id,drive_ntx_event_id) values('00000000-0000-0000-0000-000000000001',auth.uid(),'validation-shortlist-20261111');
    raise exception 'Cross-workspace insert was allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if exists(select 1 from public.event_interests where drive_ntx_event_id='validation-shortlist-20261111') then raise exception 'Cross-user read was allowed'; end if;
  delete from public.event_interests where drive_ntx_event_id='validation-shortlist-20261111';
  if found then raise exception 'Cross-user delete was allowed'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.event_interests;
    raise exception 'Anonymous read was allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
