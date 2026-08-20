import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractServiceRecord } from "@/lib/service-record-extraction";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { vehicleId?: string; storagePath?: string; fileName?: string; mimeType?: string; fileSize?: number } | null;
  if (!body?.vehicleId || !body.storagePath || !body.fileName || !body.mimeType || !body.fileSize || !allowed.has(body.mimeType) || body.fileSize > 20 * 1024 * 1024) return NextResponse.json({ error: "Choose a PDF, JPG, PNG, or WebP file up to 20 MB." }, { status: 400 });
  const { data: membership } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner","admin","editor","contributor"].includes(membership.role)) return NextResponse.json({ error: "You do not have permission to import records." }, { status: 403 });
  const expectedPrefix = `${membership.workspace_id}/${body.vehicleId}/`;
  if (!body.storagePath.startsWith(expectedPrefix)) return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
  const { data: vehicle } = await supabase.from("vehicles").select("id,name,business_id,year,make,model").eq("workspace_id", membership.workspace_id).eq("id", body.vehicleId).single();
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  const { data: blob, error: downloadError } = await supabase.storage.from("service-record-imports").download(body.storagePath);
  if (downloadError || !blob) return NextResponse.json({ error: "The uploaded file could not be opened." }, { status: 400 });
  const bytes = await blob.arrayBuffer();
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const { data: duplicate } = await supabase.from("service_record_imports").select("id,status,committed_record_id").eq("workspace_id", membership.workspace_id).eq("vehicle_id", body.vehicleId).eq("file_sha256", sha256).in("status", ["processing", "review", "committed"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (duplicate) return NextResponse.json({ error: "This exact document has already been uploaded for this vehicle.", duplicateId: duplicate.id, duplicateStatus: duplicate.status }, { status: 409 });
  const { data: imported, error: insertError } = await supabase.from("service_record_imports").insert({ workspace_id: membership.workspace_id, vehicle_id: body.vehicleId, storage_path: body.storagePath, file_name: body.fileName.slice(0, 255), mime_type: body.mimeType, file_size_bytes: body.fileSize, file_sha256: sha256, status: "processing", created_by: user.id }).select("id").single();
  if (insertError || !imported) return NextResponse.json({ error: insertError?.message || "Import could not be created." }, { status: 400 });
  try {
    const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, `(${vehicle.business_id} — ${vehicle.name})`].filter(Boolean).join(" ");
    const extracted = await extractServiceRecord(bytes, body.mimeType, body.fileName, vehicleLabel);
    const { error } = await supabase.from("service_record_imports").update({ status: "review", extracted_data: extracted, extraction_error: null, updated_at: new Date().toISOString() }).eq("id", imported.id);
    if (error) throw error;
    return NextResponse.json({ id: imported.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    await supabase.from("service_record_imports").update({ status: "failed", extraction_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", imported.id);
    return NextResponse.json({ id: imported.id, error: message }, { status: 422 });
  }
}
