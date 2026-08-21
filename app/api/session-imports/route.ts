import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractGarminSessions } from "@/lib/garmin-session-extraction";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
type UploadFile = { storagePath: string; fileName: string; mimeType: string; fileSize: number };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { eventId?: string; files?: UploadFile[] } | null;
  const files = Array.isArray(body?.files) ? body.files.slice(0, 10) : [];
  if (!body?.eventId || !files.length || files.some((file) => !file.storagePath || !file.fileName || !allowed.has(file.mimeType) || file.fileSize < 1 || file.fileSize > 20 * 1024 * 1024)) return NextResponse.json({ error: "Choose 1–10 JPG, PNG, or WebP screenshots up to 20 MB each." }, { status: 400 });
  const { data: membership } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner","admin","editor","contributor"].includes(membership.role)) return NextResponse.json({ error: "You do not have permission to import sessions." }, { status: 403 });
  if (files.some((file) => !file.storagePath.startsWith(`${membership.workspace_id}/${body.eventId}/`))) return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
  const { data: event } = await supabase.from("events").select("id,business_id,event_date,event_name,track_name,configuration_name").eq("workspace_id", membership.workspace_id).eq("id", body.eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const downloaded: { bytes: ArrayBuffer; mimeType: string; fileName: string }[] = [];
  const fileHashes: string[] = [];
  for (const file of files) {
    const { data: blob, error } = await supabase.storage.from("garmin-session-imports").download(file.storagePath);
    if (error || !blob) return NextResponse.json({ error: `The uploaded file ${file.fileName} could not be opened.` }, { status: 400 });
    const bytes = await blob.arrayBuffer();
    downloaded.push({ bytes, mimeType: file.mimeType, fileName: file.fileName });
    fileHashes.push(createHash("sha256").update(Buffer.from(bytes)).digest("hex"));
  }
  const fileSetSha256 = createHash("sha256").update([...fileHashes].sort().join(":"), "utf8").digest("hex");
  const { data: duplicate } = await supabase.from("session_imports").select("id,status").eq("workspace_id", membership.workspace_id).eq("event_id", body.eventId).eq("file_set_sha256", fileSetSha256).in("status", ["processing", "review", "committed"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (duplicate) return NextResponse.json({ error: "This exact screenshot set has already been uploaded to this event.", duplicateId: duplicate.id }, { status: 409 });
  const { data: imported, error: insertError } = await supabase.from("session_imports").insert({ workspace_id: membership.workspace_id, event_id: body.eventId, files, file_set_sha256: fileSetSha256, status: "processing", created_by: user.id }).select("id").single();
  if (insertError || !imported) return NextResponse.json({ error: insertError?.message || "Import could not be created." }, { status: 400 });
  try {
    const eventLabel = `${event.business_id} — ${event.event_name}, ${event.event_date}, ${event.track_name} ${event.configuration_name}`;
    const extracted = await extractGarminSessions(downloaded, eventLabel);
    const { error } = await supabase.from("session_imports").update({ status: "review", extracted_data: extracted, extraction_error: null, updated_at: new Date().toISOString() }).eq("id", imported.id);
    if (error) throw error;
    return NextResponse.json({ id: imported.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    await supabase.from("session_imports").update({ status: "failed", extraction_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", imported.id);
    return NextResponse.json({ id: imported.id, error: message }, { status: 422 });
  }
}
