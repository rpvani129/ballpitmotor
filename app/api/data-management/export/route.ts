import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportOnlySheets, headerFor, managedSheets, rowSnapshot, type ManagedEntity } from "@/lib/data-management";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: membership } = await supabase.from("memberships").select("workspace_id,workspaces(name)").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "No active workspace." }, { status: 403 });
  const workspaceId = membership.workspace_id;
  const managedEntries = Object.entries(managedSheets) as [ManagedEntity, (typeof managedSheets)[ManagedEntity]][];
  const results = await Promise.all([...managedEntries.map(([table]) => supabase.from(table).select("*").eq("workspace_id", workspaceId)), ...exportOnlySheets.map(({ table }) => supabase.from(table).select("*").eq("workspace_id", workspaceId))]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Grid"; workbook.created = new Date();
  const instructions = workbook.addWorksheet("Instructions", { views: [{ state: "frozen", ySplit: 5 }] });
  instructions.columns = [{ width: 24 }, { width: 100 }];
  instructions.addRows([
    ["THE GRID", "DATA MANAGEMENT EXPORT"],
    ["Purpose", "Edit setup records in Excel and re-upload the same workbook. Existing Grid IDs update records; blank Grid IDs create records."],
    ["Safety", "Do not edit Grid Snapshot. Removing a row never deletes data. Conflicts and invalid rows are stopped before saving."],
    ["Editable tabs", managedEntries.map(([, item]) => item.sheet).join(", ")],
    ["Reference tabs", exportOnlySheets.map((item) => item.sheet).join(", ") + " (included for backup and future history imports; currently read-only on re-upload)"],
  ]);
  instructions.getRow(1).font = { bold: true, size: 18, color: { argb: "FFD42027" } }; instructions.getRow(1).height = 30;

  managedEntries.forEach(([, config], index) => {
    const rows = (results[index].data ?? []) as Record<string, unknown>[];
    const sheet = workbook.addWorksheet(config.sheet, { views: [{ state: "frozen", ySplit: 1 }] });
    const headers = ["Grid ID", "Grid Snapshot", ...config.fields.map(headerFor)];
    sheet.addRow(headers); sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    rows.forEach((row) => sheet.addRow([row.id, rowSnapshot(row, config.fields), ...config.fields.map((field) => row[field] ?? "")]));
    sheet.columns.forEach((column, columnIndex) => { column.width = columnIndex < 2 ? 38 : 20; });
    sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(headers.length).letter}1` };
    sheet.getColumn(1).font = { color: { argb: "FF777777" } }; sheet.getColumn(2).font = { color: { argb: "FFAAAAAA" } };
  });

  exportOnlySheets.forEach((definition, offset) => {
    const rows = (results[managedEntries.length + offset].data ?? []) as Record<string, unknown>[];
    const sheet = workbook.addWorksheet(definition.sheet, { views: [{ state: "frozen", ySplit: 1 }] });
    const fields = rows.length ? Object.keys(rows[0]).filter((field) => field !== "workspace_id") : ["id"];
    sheet.addRow(fields.map(headerFor));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF777777" } };
    rows.forEach((row) => sheet.addRow(fields.map((field) => row[field] ?? "")));
    sheet.columns.forEach((column) => { column.width = 22; });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="the-grid-data-${stamp}.xlsx"`, "Cache-Control": "no-store" } });
}
