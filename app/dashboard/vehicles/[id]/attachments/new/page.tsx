import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VehicleAttachments from '../../VehicleAttachments';

export default async function UploadVehicleAttachment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const { record } = await searchParams;
  const supabase = await createClient();
  const { data: vehicle } = await supabase.from('vehicles').select('id,name,workspace_id').eq('id', id).single();
  if (!vehicle) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from('memberships').select('role').eq('workspace_id', vehicle.workspace_id).eq('user_id', user?.id ?? '').eq('status', 'active').maybeSingle();
  if (!member || !['owner','admin','editor'].includes(member.role)) notFound();
  let recordTitle = '';
  if (record) { const { data } = await supabase.from('maintenance_records').select('title').eq('id', record).eq('vehicle_id', id).single(); if (!data) notFound(); recordTitle = data.title; }
  const back = record ? `/dashboard/vehicles/${id}/service/${record}/attachments` : `/dashboard/vehicles/${id}?tab=attachments`;
  return <main className="dashboard-main"><Link className="back-link" href={back}>← Back to attachments</Link><section className="page-title compact-title"><h1>Upload attachment</h1><p>{vehicle.name}{recordTitle ? ` · ${recordTitle}` : ''}</p></section><VehicleAttachments workspaceId={vehicle.workspace_id} vehicleId={id} recordId={record} uploadOnly canEdit /></main>;
}
