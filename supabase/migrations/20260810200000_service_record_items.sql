create table public.maintenance_record_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  maintenance_record_id uuid not null,
  source_id text,
  position integer not null default 0 check (position >= 0),
  category text not null default 'Maintenance',
  title text not null,
  details text,
  quantity text,
  line_amount numeric(12,2) check (line_amount is null or line_amount >= 0),
  source_item_number text,
  status text not null default 'Complete',
  created_at timestamptz not null default now(),
  foreign key (workspace_id, maintenance_record_id)
    references public.maintenance_records(workspace_id, id) on delete cascade,
  unique (workspace_id, source_id),
  unique (workspace_id, id)
);

create index maintenance_record_items_record_idx
  on public.maintenance_record_items(workspace_id, maintenance_record_id, position);

alter table public.maintenance_record_items enable row level security;
revoke all on public.maintenance_record_items from anon;
grant select, insert, update, delete on public.maintenance_record_items to authenticated;

create policy "workspace members read" on public.maintenance_record_items
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.maintenance_record_items
  for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors update" on public.maintenance_record_items
  for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace admins delete" on public.maintenance_record_items
  for delete to authenticated
  using ((select private.can_admin_workspace(workspace_id)));

create trigger maintenance_record_items_workspace_id_immutable
  before update on public.maintenance_record_items
  for each row execute function private.prevent_workspace_id_change();

with target as (
  select id from public.workspaces
  where name = 'Ball Pit Motorsports'
  order by created_at
  limit 1
),
src as (
  select *
  from jsonb_to_recordset('[{"source_id":"MIT-0001","maintenance_event_id":"MNT-0001","category":"Repair","title":"Replace exhaust manifolds","details":"Remove and replace left and right exhaust manifolds","quantity":"Both sides","line_amount":0,"source_item_number":"1","status":"Complete","position":0},{"source_id":"MIT-0002","maintenance_event_id":"MNT-0001","category":"Safety / Interior","title":"Replace driver''s seat","details":"Driver-side seat replacement","quantity":"1","line_amount":0,"source_item_number":"2","status":"Complete","position":1},{"source_id":"MIT-0003","maintenance_event_id":"MNT-0002","category":"Tires","title":"Mount and balance four tires","details":"Bridgestone RE-71RS: 265/35R18 x2; 295/30R18 x2","quantity":"4 tires","line_amount":1786.26,"source_item_number":"1","status":"Complete","position":2},{"source_id":"MIT-0004","maintenance_event_id":"MNT-0002","category":"Electronics","title":"Hardwire Garmin Catalyst","details":"Garmin Catalyst power wiring","quantity":"1","line_amount":0,"source_item_number":"2","status":"Complete","position":3},{"source_id":"MIT-0005","maintenance_event_id":"MNT-0002","category":"Graphics","title":"Order and install custom decals","details":"Side decals and number decals","quantity":"1 set","line_amount":105,"source_item_number":"3","status":"Complete","position":4},{"source_id":"MIT-0006","maintenance_event_id":"MNT-0003","category":"Trailer Maintenance","title":"Axle service","details":"Axle service per hub","quantity":"4 hubs","line_amount":260,"source_item_number":"1","status":"Complete","position":5},{"source_id":"MIT-0007","maintenance_event_id":"MNT-0003","category":"Trailer Modification","title":"Modify fender and backer","details":"Cut and remove fender; drop-down fender/backer modification","quantity":"1","line_amount":500,"source_item_number":"2","status":"Complete","position":6},{"source_id":"MIT-0008","maintenance_event_id":"MNT-0003","category":"Trailer Repair","title":"Repair ramp holder","details":"Ramp holder repair","quantity":"1","line_amount":125,"source_item_number":"3","status":"Complete","position":7},{"source_id":"MIT-0009","maintenance_event_id":"MNT-0003","category":"Shop Supplies","title":"Shop supplies","details":"Consumables used during service","quantity":"1","line_amount":45,"source_item_number":"4","status":"Complete","position":8},{"source_id":"MIT-0010","maintenance_event_id":"MNT-0003","category":"Trailer Parts","title":"Replace grease seals","details":"3.5K double-lip grease seal GS-1718DL","quantity":"4","line_amount":60,"source_item_number":"5","status":"Complete","position":9},{"source_id":"MIT-0011","maintenance_event_id":"MNT-0003","category":"Trailer Parts","title":"Replace hub/dust covers","details":"3.5K hub/dust cover","quantity":"4","line_amount":20,"source_item_number":"6","status":"Complete","position":10},{"source_id":"MIT-0012","maintenance_event_id":"MNT-0003","category":"Trailer Parts","title":"Replace rubber grease caps","details":"Dust-cover rubber grease cap","quantity":"4","line_amount":14,"source_item_number":"7","status":"Complete","position":11},{"source_id":"MIT-0013","maintenance_event_id":"MNT-0003","category":"Trailer Parts","title":"Replace inner bearings","details":"3.5K inner bearing","quantity":"4","line_amount":52,"source_item_number":"8","status":"Complete","position":12},{"source_id":"MIT-0014","maintenance_event_id":"MNT-0003","category":"Trailer Parts","title":"Replace outer bearings","details":"3.5K outer bearing; 1.0625 / 1.98 / 0.56 in","quantity":"4","line_amount":44,"source_item_number":"9","status":"Complete","position":13},{"source_id":"MIT-0015","maintenance_event_id":"MNT-0004","category":"Driver Cooling","title":"Install Coolshirt system","details":"Cool Shirt box, controller and wiring; Paragon 12-ft hose","quantity":"1 system","line_amount":1063.41,"source_item_number":"1","status":"Complete","position":14},{"source_id":"MIT-0016","maintenance_event_id":"MNT-0004","category":"Brakes","title":"Racing brake-fluid flush","details":"Castrol SRF","quantity":"1","line_amount":299.99,"source_item_number":"2","status":"Complete","position":15},{"source_id":"MIT-0017","maintenance_event_id":"MNT-0004","category":"Engine Maintenance","title":"Oil and filter service","details":"Motul 8100 X-CESS GEN2 5W-40; Mahle oil-filter kit","quantity":"8 L + 1 filter","line_amount":280,"source_item_number":"3","status":"Complete","position":16},{"source_id":"MIT-0018","maintenance_event_id":"MNT-0004","category":"Diagnostics","title":"Diagnose Garmin power issue","details":"Garmin not receiving power","quantity":"1","line_amount":0,"source_item_number":"4","status":"Complete","position":17},{"source_id":"MIT-0019","maintenance_event_id":"MNT-0004","category":"Interior / Electronics","title":"Install radio-delete panel and controls","details":"Coolshirt switch; intercom mounts; traction-control switch relocated","quantity":"1","line_amount":877.5,"source_item_number":"5","status":"Complete","position":18},{"source_id":"MIT-0020","maintenance_event_id":"MNT-0004","category":"Suspension Inspection","title":"Check shock condition","details":"Two seasons on shocks; rebuild recommended after 2026 season; right-rear adjuster knob reinstalled","quantity":"1 inspection","line_amount":0,"source_item_number":"6","status":"Complete","position":19},{"source_id":"MIT-0021","maintenance_event_id":"MNT-0004","category":"Alignment","title":"Four-wheel street alignment","details":"Street alignment","quantity":"1","line_amount":363,"source_item_number":"7","status":"Complete","position":20},{"source_id":"MIT-0022","maintenance_event_id":"MNT-0005","category":"Electronics","title":"Relocate Garmin mount and wiring","details":"Moved to radio-delete panel","quantity":"1","line_amount":292.5,"source_item_number":"1","status":"Complete","position":21},{"source_id":"MIT-0023","maintenance_event_id":"MNT-0005","category":"Suspension","title":"Remove and reinstall shocks for rebuild","details":"Front and rear shock/strut assemblies, both sides","quantity":"4 corners","line_amount":1755,"source_item_number":"2","status":"Complete","position":22},{"source_id":"MIT-0024","maintenance_event_id":"MNT-0005","category":"Setup","title":"Alignment, corner balance and setup","details":"Performance alignment and corner balance","quantity":"1","line_amount":647.5,"source_item_number":"3","status":"Complete","position":23},{"source_id":"MIT-0025","maintenance_event_id":"MNT-0005","category":"Inspection","title":"Nut-and-bolt inspection","details":"Track-car fastener inspection","quantity":"1","line_amount":292.5,"source_item_number":"4","status":"Complete","position":24},{"source_id":"MIT-0026","maintenance_event_id":"MNT-0005","category":"Brakes","title":"Racing brake-fluid flush","details":"Castrol SRF","quantity":"1","line_amount":287.5,"source_item_number":"5","status":"Complete","position":25},{"source_id":"MIT-0027","maintenance_event_id":"MNT-0005","category":"Driveline Repair","title":"Repack and reboot axles","details":"CV boot clamps; CV boots; axle boot with flange; used driver axle; CV joint","quantity":"2 axles","line_amount":1663.49,"source_item_number":"6","status":"Complete","position":26},{"source_id":"MIT-0028","maintenance_event_id":"MNT-0005","category":"Cooling","title":"Clean radiators","details":"Remove bumper and clean radiators","quantity":"1","line_amount":390,"source_item_number":"7","status":"Complete","position":27},{"source_id":"MIT-0029","maintenance_event_id":"MNT-0005","category":"Engine Maintenance","title":"Oil and filter service","details":"Motul 8100 X-CESS GEN2 5W-40; Mahle filter kit; Motul 8100 Power 5W-40","quantity":"8 L + parts","line_amount":280,"source_item_number":"8","status":"Complete","position":28},{"source_id":"MIT-0030","maintenance_event_id":"MNT-0005","category":"Suspension","title":"Damper rebuild and cleaning","details":"Sublet damper rebuild","quantity":"4 dampers","line_amount":1475,"source_item_number":"9","status":"Complete","position":29},{"source_id":"MIT-0031","maintenance_event_id":"MNT-0006","category":"Safety / Interior","title":"Install seat, back brace and harness","details":"Kirkey Road Race Halo Seat 64; IO Port back brace; Schroth Flexi 2x2 harness","quantity":"1 set","line_amount":1223.4,"source_item_number":"1","status":"Complete","position":30},{"source_id":"MIT-0032","maintenance_event_id":"MNT-0006","category":"Setup","title":"Alignment and corner balance","details":"Record weight and fuel level; install undertray","quantity":"1","line_amount":462.5,"source_item_number":"2","status":"Complete","position":31},{"source_id":"MIT-0033","maintenance_event_id":"MNT-0006","category":"Wheel Hubs","title":"Replace front wheel hubs/bearings","details":"Mazda Motorsports tapered-roller front hubs x4; front hub seal kits x2","quantity":"Both sides","line_amount":633.06,"source_item_number":"3","status":"Complete","position":32},{"source_id":"MIT-0034","maintenance_event_id":"MNT-0006","category":"Inspection","title":"Nut-and-bolt inspection","details":"Race-car fastener inspection","quantity":"1","line_amount":195,"source_item_number":"4","status":"Complete","position":33},{"source_id":"MIT-0035","maintenance_event_id":"MNT-0006","category":"Electrical","title":"Battery and alternator test; repair cable","details":"Loose master-switch connection; failing solder/crimp on alternator power cable repaired","quantity":"1","line_amount":195,"source_item_number":"5","status":"Complete","position":34},{"source_id":"MIT-0036","maintenance_event_id":"MNT-0006","category":"Safety","title":"Install window net","details":"RaceQuip mesh window net","quantity":"1","line_amount":294.22,"source_item_number":"6","status":"Complete","position":35},{"source_id":"MIT-0037","maintenance_event_id":"MNT-0006","category":"Brakes","title":"Racing brake-fluid flush","details":"Castrol SRF","quantity":"1","line_amount":287.5,"source_item_number":"7","status":"Complete","position":36},{"source_id":"MIT-0038","maintenance_event_id":"MNT-0006","category":"Cooling","title":"Replace radiator and flush cooling system","details":"Mazda under cover; Red Line Water Wetter","quantity":"1","line_amount":556.47,"source_item_number":"8","status":"Complete","position":37},{"source_id":"MIT-0039","maintenance_event_id":"MNT-0008","category":"Inspection","title":"Vehicle inspection","details":"General inspection","quantity":"1","line_amount":195,"source_item_number":"1","status":"Complete","position":38},{"source_id":"MIT-0040","maintenance_event_id":"MNT-0008","category":"Suspension","title":"Replace rear trailing-arm bushings","details":"2 MOG rear suspension trailing-arm bushings; labor and tax included","quantity":"1","line_amount":747.19,"source_item_number":"2","status":"Complete","position":39},{"source_id":"MIT-0041","maintenance_event_id":"MNT-0008","category":"Suspension / Steering","title":"Replace front lower ball joints","details":"2 SNK front lower ball joints; labor and tax included","quantity":"1","line_amount":534.52,"source_item_number":"3","status":"Complete","position":40},{"source_id":"MIT-0042","maintenance_event_id":"MNT-0008","category":"Drivetrain","title":"Replace half-shaft seal","details":"NOK CV joint half-shaft seal and NTN axle-shaft bearing; labor and tax included","quantity":"1","line_amount":510.35,"source_item_number":"4","status":"Complete","position":41},{"source_id":"MIT-0043","maintenance_event_id":"MNT-0008","category":"Fluids / Steering","title":"Power-steering fluid flush","details":"IDE power-steering fluid, 12 oz; labor and tax included","quantity":"1","line_amount":111.43,"source_item_number":"5","status":"Complete","position":42},{"source_id":"MIT-0044","maintenance_event_id":"MNT-0008","category":"Brakes / Clutch","title":"Brake and clutch fluid flush","details":"ATE Type 200 DOT 4 brake fluid; labor and tax included","quantity":"1","line_amount":226.49,"source_item_number":"6","status":"Complete","position":43},{"source_id":"MIT-0045","maintenance_event_id":"MNT-0008","category":"Engine Accessories","title":"Replace A/C, power-steering and alternator belts","details":"Bando and Mitsuboshi drive belts; labor and tax included","quantity":"1","line_amount":517.06,"source_item_number":"7","status":"Complete","position":44},{"source_id":"MIT-0046","maintenance_event_id":"MNT-0008","category":"Alignment","title":"Four-wheel street alignment","details":"Street alignment","quantity":"1","line_amount":347.1,"source_item_number":"8","status":"Complete","position":45},{"source_id":"MIT-0047","maintenance_event_id":"MNT-0008","category":"Detailing","title":"Interior and exterior detailing","details":"Sublet detailing service","quantity":"1","line_amount":525,"source_item_number":"9","status":"Complete","position":46},{"source_id":"MIT-0048","maintenance_event_id":"MNT-0007","category":"Electronics / Configuration","title":"Disable enhanced engine audio / active noise control","details":"Customer-requested in-cabin engine-audio configuration","quantity":"1","line_amount":219,"source_item_number":"A","status":"Complete","position":47},{"source_id":"MIT-0049","maintenance_event_id":"MNT-0007","category":"Safety / Configuration","title":"Seat-belt reminder chime request","details":"Information-only line for front driver and passenger; no charge","quantity":"1","line_amount":0,"source_item_number":"B","status":"Complete","position":48},{"source_id":"MIT-0050","maintenance_event_id":"MNT-0007","category":"Recall / Electronics","title":"Complete safety recall 26TA02","details":"Reprogram parking-assist ECU and calibrate camera; warranty/no charge","quantity":"1","line_amount":0,"source_item_number":"C","status":"Complete","position":49},{"source_id":"MIT-0051","maintenance_event_id":"MNT-0007","category":"Engine / Routine Maintenance","title":"Oil and filter change with tire rotation","details":"Toyota oil filter; 8 units GTMO 0W-20; multipoint inspection included","quantity":"1","line_amount":90,"source_item_number":"D","status":"Complete","position":50},{"source_id":"MIT-0052","maintenance_event_id":"MNT-0007","category":"Inspection","title":"Multipoint inspection, battery test and tire inspection","details":"Tires inflated to factory-recommended PSI; no charge","quantity":"1","line_amount":0,"source_item_number":"E/L","status":"Complete","position":51},{"source_id":"MIT-0053","maintenance_event_id":"MNT-0007","category":"Engine / Ignition","title":"Replace six turbo-engine spark plugs","details":"6 Toyota spark plugs, part 90919-01295","quantity":"1","line_amount":587.93,"source_item_number":"G","status":"Complete","position":52},{"source_id":"MIT-0054","maintenance_event_id":"MNT-0007","category":"Drivetrain / Fluids","title":"Full 4x4 fluid service","details":"Front differential, rear differential and transfer case; 8090 gear oil and differential supplement","quantity":"1","line_amount":403.01,"source_item_number":"H","status":"Complete","position":53},{"source_id":"MIT-0055","maintenance_event_id":"MNT-0007","category":"Brakes / Fluids","title":"Brake-system fluid exchange","details":"DOT 4 brake fluid and non-chlorinated brake cleaner","quantity":"1","line_amount":159.95,"source_item_number":"I","status":"Complete","position":54},{"source_id":"MIT-0056","maintenance_event_id":"MNT-0007","category":"Engine / Intake","title":"Replace both engine air filters","details":"2 Toyota air-filter elements, part 17801-YZZ17","quantity":"1","line_amount":79.98,"source_item_number":"J","status":"Complete","position":55},{"source_id":"MIT-0057","maintenance_event_id":"MNT-0007","category":"Cabin / HVAC","title":"Replace cabin air filter","details":"Toyota air-refiner element, part 87139-YZZA8","quantity":"1","line_amount":49.99,"source_item_number":"K","status":"Complete","position":56},{"source_id":"MIT-0058","maintenance_event_id":"MNT-0007","category":"Alignment","title":"Four-wheel alignment","details":"Dealer four-wheel alignment service","quantity":"1","line_amount":159.95,"source_item_number":"N","status":"Complete","position":57}]'::jsonb) as x(
    source_id text,
    maintenance_event_id text,
    category text,
    title text,
    details text,
    quantity text,
    line_amount numeric,
    source_item_number text,
    status text,
    position integer
  )
)
insert into public.maintenance_record_items (
  workspace_id,
  maintenance_record_id,
  source_id,
  position,
  category,
  title,
  details,
  quantity,
  line_amount,
  source_item_number,
  status
)
select
  w.id,
  mr.id,
  s.source_id,
  s.position,
  s.category,
  s.title,
  nullif(s.details, ''),
  nullif(s.quantity, ''),
  s.line_amount,
  nullif(s.source_item_number, ''),
  coalesce(nullif(s.status, ''), 'Complete')
from src s
cross join target w
join public.maintenance_records mr
  on mr.workspace_id = w.id
 and mr.source_url = 'grid-import:' || s.maintenance_event_id
on conflict (workspace_id, source_id) do update set
  maintenance_record_id = excluded.maintenance_record_id,
  position = excluded.position,
  category = excluded.category,
  title = excluded.title,
  details = excluded.details,
  quantity = excluded.quantity,
  line_amount = excluded.line_amount,
  source_item_number = excluded.source_item_number,
  status = excluded.status;
