-- Qualify the storage object path; unqualified name binds to vehicles.name inside EXISTS.
alter policy "vehicle document members read" on storage.objects using (
  bucket_id = 'vehicle-attachments' and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(storage.objects.name))[1] and v.id::text = (storage.foldername(storage.objects.name))[2] and private.is_workspace_member(v.workspace_id))
);
alter policy "vehicle document editors insert" on storage.objects with check (
  bucket_id = 'vehicle-attachments' and array_length(string_to_array(storage.objects.name,'/'),1) = 4 and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(storage.objects.name))[1] and v.id::text = (storage.foldername(storage.objects.name))[2] and private.can_edit_workspace(v.workspace_id) and ((storage.foldername(storage.objects.name))[3] = 'vehicle' or exists (select 1 from public.maintenance_records r where r.workspace_id = v.workspace_id and r.vehicle_id = v.id and r.id::text = (storage.foldername(storage.objects.name))[3])))
);
alter policy "vehicle document editors delete" on storage.objects using (
  bucket_id = 'vehicle-attachments' and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(storage.objects.name))[1] and v.id::text = (storage.foldername(storage.objects.name))[2] and private.can_edit_workspace(v.workspace_id))
);
