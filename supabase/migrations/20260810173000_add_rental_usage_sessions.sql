create or replace function private.sync_event_fastest_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.sessions
  set is_fastest = coalesce(id = (
    select s.id from public.sessions s
    where s.event_id = coalesce(new.event_id, old.event_id)
      and s.best_lap_ms is not null
    order by s.best_lap_ms asc, s.session_number asc limit 1
  ), false)
  where event_id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end;
$$;

insert into public.sessions (workspace_id, event_id, session_number, best_lap_ms, notes, created_by)
select e.workspace_id, e.id, n.session_number, null, 'Rental usage session — no lap time collected', e.created_by
from public.events e
cross join generate_series(1, 5) as n(session_number)
where e.business_id in ('EVT-CB-20260724-01', 'EVT-CB-20260728-01', 'EVT-CB-20260729-01')
on conflict (event_id, session_number) do nothing;
