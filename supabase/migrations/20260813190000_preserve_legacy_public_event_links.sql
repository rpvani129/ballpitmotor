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
