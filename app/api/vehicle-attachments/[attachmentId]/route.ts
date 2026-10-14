import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to view this attachment.' }, { status: 401 });
  const { attachmentId } = await params;
  const { data: attachment, error } = await supabase.from('vehicle_attachments').select('storage_path,file_name').eq('id', attachmentId).maybeSingle();
  if (error || !attachment) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  const { data, error: storageError } = await supabase.storage.from('vehicle-attachments').createSignedUrl(attachment.storage_path, 60, request.nextUrl.searchParams.get('download') === 'true' ? { download: attachment.file_name } : undefined);
  if (storageError || !data) return NextResponse.json({ error: 'Attachment unavailable.' }, { status: 404 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
