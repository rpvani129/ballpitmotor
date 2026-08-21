-- Replace the single active checklist with a workspace-owned template library.
drop index if exists public.checklist_templates_one_active_per_workspace_idx;

create index if not exists checklist_templates_workspace_active_name_idx
  on public.checklist_templates(workspace_id, is_active, name);

-- Preserve the current safety checklist and give it the shared library name.
update public.checklist_templates existing
set name = 'Safety Checklist'
where existing.is_active
  and existing.name <> 'Safety Checklist'
  and not exists (
    select 1 from public.checklist_templates safety
    where safety.workspace_id = existing.workspace_id
      and safety.name = 'Safety Checklist'
      and safety.version = existing.version
  );

insert into public.checklist_templates (workspace_id, name, version, is_active)
select workspace.id, preset.name, 1, true
from public.workspaces workspace
cross join (values
  ('Safety Checklist'),
  ('Event Packing List'),
  ('Session Prep Checklist'),
  ('Post Event Checklist')
) as preset(name)
where not exists (
  select 1 from public.checklist_templates existing
  where existing.workspace_id = workspace.id and existing.name = preset.name
)
on conflict (workspace_id, name, version) do nothing;

with preset_items(name, position, label) as (values
  ('Safety Checklist', 0, 'Wheel torque and tire pressures checked'),
  ('Safety Checklist', 1, 'Brake pads, rotors and fluid checked'),
  ('Safety Checklist', 2, 'Fluids topped off and no leaks found'),
  ('Safety Checklist', 3, 'Battery, cameras and data system secured'),
  ('Safety Checklist', 4, 'Helmet, HANS, belts and safety gear packed'),
  ('Safety Checklist', 5, 'Tech sheet completed'),
  ('Event Packing List', 0, 'Helmet, HANS, gloves, shoes and driver gear packed'),
  ('Event Packing List', 1, 'Jack, stands, torque wrench and basic hand tools packed'),
  ('Event Packing List', 2, 'Tire gauge, inflator and air equipment packed'),
  ('Event Packing List', 3, 'Spare parts, fluids and maintenance supplies packed'),
  ('Event Packing List', 4, 'Cameras, data system, chargers and batteries packed'),
  ('Event Packing List', 5, 'Registration, tech sheet and required documents packed'),
  ('Event Packing List', 6, 'Food, water, cooler and personal supplies packed'),
  ('Event Packing List', 7, 'Trailer, tie-downs and recovery equipment checked'),
  ('Session Prep Checklist', 0, 'Cold tire pressures set for the session'),
  ('Session Prep Checklist', 1, 'Wheel torque checked'),
  ('Session Prep Checklist', 2, 'Fuel level confirmed'),
  ('Session Prep Checklist', 3, 'Brake pads, fluid and visible leaks checked'),
  ('Session Prep Checklist', 4, 'Camera and data system recording'),
  ('Session Prep Checklist', 5, 'Helmet, HANS, belts and safety gear secured'),
  ('Session Prep Checklist', 6, 'Seat, mirrors and controls set'),
  ('Session Prep Checklist', 7, 'Track conditions and session plan reviewed'),
  ('Post Event Checklist', 0, 'Vehicle cooled down and final pressures recorded'),
  ('Post Event Checklist', 1, 'Vehicle inspected for leaks, damage or loose hardware'),
  ('Post Event Checklist', 2, 'Tire and pad condition recorded'),
  ('Post Event Checklist', 3, 'Garmin data, photos and video saved'),
  ('Post Event Checklist', 4, 'Event and driver notes captured'),
  ('Post Event Checklist', 5, 'Maintenance or repair follow-ups created'),
  ('Post Event Checklist', 6, 'Tools, equipment and personal gear packed'),
  ('Post Event Checklist', 7, 'Trailer, tie-downs and vehicle transport checked')
)
insert into public.checklist_template_items (
  workspace_id, template_id, position, label, response_type, is_required
)
select template.workspace_id, template.id, preset.position, preset.label, 'boolean', true
from public.checklist_templates template
join preset_items preset on preset.name = template.name
where template.is_active
on conflict (template_id, position) do nothing;

create or replace function public.save_checklist_template(
  p_workspace_id uuid,
  p_template_id uuid,
  p_name text,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_template_id uuid;
begin
  if not (select private.can_edit_workspace(p_workspace_id)) then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120 then
    raise exception 'Checklist name is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 75 then
    raise exception 'A checklist requires between 1 and 75 items';
  end if;

  if p_template_id is null then
    insert into public.checklist_templates (workspace_id, name, version, is_active)
    values (p_workspace_id, trim(p_name), 1, true)
    returning id into v_template_id;
  else
    select id into v_template_id
    from public.checklist_templates
    where id = p_template_id and workspace_id = p_workspace_id
    for update;
    if not found then raise exception 'Checklist template not found'; end if;
    update public.checklist_templates set name = trim(p_name), is_active = true where id = v_template_id;
    delete from public.checklist_template_items where template_id = v_template_id;
  end if;

  insert into public.checklist_template_items (
    workspace_id, template_id, position, label, response_type, is_required
  )
  select p_workspace_id, v_template_id, (item.ordinality - 1)::integer,
    trim(item.value->>'label'), 'boolean', true
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
  where nullif(trim(item.value->>'label'), '') is not null;

  if not exists (select 1 from public.checklist_template_items where template_id = v_template_id) then
    raise exception 'A checklist requires at least one named item';
  end if;
  return v_template_id;
end;
$$;

revoke all on function public.save_checklist_template(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.save_checklist_template(uuid, uuid, text, jsonb) to authenticated;
