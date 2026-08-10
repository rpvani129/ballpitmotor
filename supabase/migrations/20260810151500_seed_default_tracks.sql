insert into public.tracks (workspace_id, name, short_name, latitude, longitude)
select w.id, seed.name, seed.short_name, seed.latitude, seed.longitude
from public.workspaces w
cross join (values
  ('Eagles Canyon Raceway', 'ECR', 33.371700::numeric, -97.425300::numeric),
  ('Motorsport Ranch', 'MSR Cresson', 32.532600::numeric, -97.617800::numeric),
  ('Circuit of the Americas', 'COTA', 30.132900::numeric, -97.641100::numeric)
) as seed(name, short_name, latitude, longitude)
on conflict (workspace_id, name) do nothing;

insert into public.track_configurations (workspace_id, track_id, name)
select t.workspace_id, t.id, seed.configuration_name
from public.tracks t
join (values
  ('Eagles Canyon Raceway', '2.7 Mile Circuit CCW'),
  ('Eagles Canyon Raceway', '2.7 Mile Circuit CW'),
  ('Eagles Canyon Raceway', '1.65 Mile Circuit CCW'),
  ('Motorsport Ranch', '1.7 Mile Circuit CCW'),
  ('Motorsport Ranch', '1.7 Mile Circuit CW'),
  ('Motorsport Ranch', '1.3 Mile Circuit'),
  ('Motorsport Ranch', '3.1 Mile Circuit CCW'),
  ('Circuit of the Americas', 'Grand Prix Circuit')
) as seed(track_name, configuration_name) on seed.track_name = t.name
on conflict (track_id, name) do nothing;
