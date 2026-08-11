update public.sessions s
set started_at = source.started_at
from public.events e,
  (values
    ('EVT-GB-20260611-01'::text, 1::integer, '14:05'::time),
    ('EVT-GB-20260611-01'::text, 2::integer, '15:15'::time)
  ) as source(event_business_id, session_number, started_at)
where s.event_id = e.id
  and s.workspace_id = e.workspace_id
  and e.business_id = source.event_business_id
  and s.session_number = source.session_number;
