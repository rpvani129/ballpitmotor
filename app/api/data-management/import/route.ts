import { createHash, randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { cleanValue, fieldFor, managedSheets, rowSnapshot, type DataChange, type ManagedEntity } from "@/lib/data-management";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: membership } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner","admin","editor","contributor"].includes(membership.role)) return NextResponse.json({ error: "Workspace edit access required." }, { status: 403 });
  const formData = await request.formData(); const file = formData.get("file");
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: "Choose a Grid .xlsx export file." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "The workbook must be 15 MB or smaller." }, { status: 400 });
  const bytes = await file.arrayBuffer(); const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(bytes); } catch { return NextResponse.json({ error: "The workbook could not be read." }, { status: 400 }); }

  const entries = Object.entries(managedSheets) as [ManagedEntity, (typeof managedSheets)[ManagedEntity]][];
  const currentResults = await Promise.all(entries.map(([table]) => supabase.from(table).select("*").eq("workspace_id", membership.workspace_id)));
  const changes: DataChange[] = []; const errors: { sheet: string; row: number; message: string }[] = []; let unchanged = 0;
  entries.forEach(([entity, config], entryIndex) => {
    const sheet = workbook.getWorksheet(config.sheet); if (!sheet) return;
    const headers = new Map<number, string>(); sheet.getRow(1).eachCell((cell, col) => headers.set(col, fieldFor(String(cell.value ?? ""))));
    const currentRows = (currentResults[entryIndex].data ?? []) as Record<string, unknown>[];
    const currentById = new Map(currentRows.map((row) => [String(row.id), row]));
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values: Record<string, unknown> = {}; headers.forEach((field, col) => { values[field] = cleanValue(row.getCell(col).value); });
      const hasData = config.fields.some((field) => values[field] !== "" && values[field] != null); if (!hasData) return;
      const suppliedId = String(values.grid_id ?? "").trim(); const id = suppliedId || randomUUID(); const existing = suppliedId ? currentById.get(suppliedId) : undefined;
      if (suppliedId && !existing) { errors.push({ sheet: config.sheet, row: rowNumber, message: "Grid ID does not belong to this workspace." }); return; }
      const payload = Object.fromEntries(config.fields.map((field) => [field, values[field] ?? ""]));
      const missing = config.required.filter((field) => payload[field] === "" || payload[field] == null);
      if (missing.length) { errors.push({ sheet: config.sheet, row: rowNumber, message: `Required: ${missing.join(", ")}.` }); return; }
      if (existing) {
        const exportedSnapshot = String(values.grid_snapshot ?? ""); const currentSnapshot = rowSnapshot(existing, config.fields);
        if (!exportedSnapshot || exportedSnapshot !== currentSnapshot) { errors.push({ sheet: config.sheet, row: rowNumber, message: "This record changed after the workbook was downloaded. Export a fresh workbook before editing it." }); return; }
        if (rowSnapshot(payload, config.fields) === currentSnapshot) { unchanged += 1; return; }
      }
      changes.push({ entity, id, operation: existing ? "update" : "create", label: String(payload.name || payload.business_id || `${config.label} row ${rowNumber}`), payload, snapshot: existing ? String(values.grid_snapshot) : null });
    });
  });
  const summary = { creates: changes.filter((item) => item.operation === "create").length, updates: changes.filter((item) => item.operation === "update").length, unchanged, errors: errors.length };
  const fileSha = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const { data: imported, error } = await supabase.from("data_management_imports").insert({ workspace_id: membership.workspace_id, file_name: file.name.slice(0,255), file_sha256: fileSha, changes, errors, summary, status: "review", created_by: user.id }).select("id").single();
  if (error || !imported) return NextResponse.json({ error: error?.message || "The import could not be staged." }, { status: 400 });
  return NextResponse.json({ id: imported.id });
}
