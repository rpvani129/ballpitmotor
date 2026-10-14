import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VehicleAttachments from '../../../VehicleAttachments';

export default async function ServiceAttachments({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const supabase = await createClient();
  const { data: record } = await supabase.from('maintenance_records').select('id,title,workspace_id,vehicles(name)').eq('id', recordId).eq('vehicle_id', id).single();
  if (!record) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: member }, { data: attachments, error }] = await Promise.all([
    supabase.from('memberships').select('role').eq('workspace_id', record.workspace_id).eq('user_id', user?.id ?? '').eq('status', 'active').maybeSingle(),
    supabase.from('vehicle_attachments').select('*').eq('vehicle_id', id).eq('maintenance_record_id', recordId).order('created_at', { ascending: false }),
  ]);
  if (error) throw new Error('Attachments could not be loaded.');
  const canEdit = Boolean(member && ['owner','admin','editor'].includes(member.role));
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="section-block"><div className="section-heading"><div><p className="eyebrow">SERVICE RECORD</p><h1>{record.title}</h1><h2>Attachments</h2></div>{canEdit && <Link className="button primary" href={`/dashboard/vehicles/${id}/attachments/new?record=${recordId}`}>+ Upload attachment</Link>}</div><VehicleAttachments workspaceId={record.workspace_id} vehicleId={id} recordId={recordId} initialAttachments={attachments ?? []} canEdit={canEdit} /></section></main>;
}
