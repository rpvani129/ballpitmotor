"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VEHICLE_ATTACHMENT_ACCEPT, VEHICLE_ATTACHMENT_CATEGORIES, vehicleAttachmentFileDetails } from '@/lib/vehicle-attachment-files';

export type VehicleAttachment = { id: string; storage_path: string; file_name: string; title: string; category: string; notes: string | null; file_size_bytes: number; created_at: string };
export default function VehicleAttachments({ workspaceId, vehicleId, recordId, initialAttachments = [], uploadOnly = false, canEdit }: { workspaceId: string; vehicleId: string; recordId?: string; initialAttachments?: VehicleAttachment[]; uploadOnly?: boolean; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const back = recordId ? `/dashboard/vehicles/${vehicleId}/service/${recordId}/attachments` : `/dashboard/vehicles/${vehicleId}?tab=attachments`;
  async function upload(formData: FormData) {
    const file = formData.get('file') as File | null;
    const details = file && vehicleAttachmentFileDetails(file);
    const title = String(formData.get('title') ?? '').trim();
    if (!file || !details || !title) { setMessage('Choose a supported file up to 25 MB and enter a title.'); return; }
    setBusy(true); setMessage('');
    let path: string | null = null;
    let saved = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      path = `${workspaceId}/${vehicleId}/${recordId ?? 'vehicle'}/${crypto.randomUUID()}${details.extension}`;
      const { error: uploadError } = await supabase.storage.from('vehicle-attachments').upload(path, file, { contentType: details.mimeType, upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('vehicle_attachments').insert({ workspace_id: workspaceId, vehicle_id: vehicleId, maintenance_record_id: recordId ?? null, storage_path: path, file_name: file.name, mime_type: details.mimeType, file_size_bytes: file.size, title, category: String(formData.get('category') ?? 'Other'), notes: String(formData.get('notes') ?? '').trim() || null, uploaded_by: user.id });
      if (error) throw error;
      saved = true; router.push(back); router.refresh(); setMessage('Attachment uploaded.');
    } catch (error) {
      if (path && !saved) await supabase.storage.from('vehicle-attachments').remove([path]);
      setMessage(error instanceof Error ? error.message : 'Upload could not be saved. Please try again.');
    } finally { setBusy(false); }
  }
  async function remove(item: VehicleAttachment) {
    if (!window.confirm(`Delete ${item.title}? This removes the uploaded file.`)) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.storage.from('vehicle-attachments').remove([item.storage_path]);
      if (error) throw error;
      const { data, error: deleteError } = await supabase.from('vehicle_attachments').delete().eq('id', item.id).eq('vehicle_id', vehicleId).select('id');
      if (deleteError || !data?.length) throw deleteError ?? new Error('Attachment record could not be deleted.');
      router.refresh(); setMessage('Attachment deleted.');
    } catch { setMessage('Deletion could not be completed. Please retry.'); } finally { setBusy(false); }
  }
  return <div className="attachment-manager vehicle-attachments">
    {uploadOnly && canEdit && <form className="stack-form" action={upload}>
      <label>File *<input type="file" name="file" accept={VEHICLE_ATTACHMENT_ACCEPT} required disabled={busy} /></label>
      <p className="fine-print">PDF, JPG, PNG, WebP, HEIC, CSV, TXT, Word (.docx), or Excel (.xlsx). Maximum 25 MB.</p>
      <label>Title *<input name="title" maxLength={160} required /></label>
      <label>Category<select name="category" defaultValue="Other">{VEHICLE_ATTACHMENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Notes<textarea name="notes" maxLength={2000} rows={3} /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload attachment'}</button>
    </form>}
    {message && <p className="attachment-message" role="status">{message}</p>}
    {!uploadOnly && (initialAttachments.length ? <div className="attachment-grid">{initialAttachments.map(item => <article className="attachment-card" key={item.id}><div className="attachment-file-icon">{item.file_name.split('.').pop()?.toUpperCase()}</div><div><span>{item.category}</span><strong>{item.title}</strong><p>{item.notes}</p><small>{item.file_name} · {(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB · {new Date(item.created_at).toLocaleDateString()}</small><div className="attachment-actions"><a className="button outline compact-button" href={`/api/vehicle-attachments/${item.id}`} target="_blank" rel="noopener noreferrer">View</a><a className="button outline compact-button" href={`/api/vehicle-attachments/${item.id}?download=true`} target="_blank" rel="noopener noreferrer">Download</a>{canEdit && <button className="button danger compact-button" disabled={busy} onClick={() => remove(item)}>Delete</button>}</div></div></article>)}</div> : <div className="empty-state"><strong>No attachments yet.</strong><p>{recordId ? 'Add receipts, photos, or supporting documents for this service.' : 'Keep registration, insurance, setup guides, and other vehicle documents here.'}</p></div>)}
  </div>;
}
