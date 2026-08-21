import { createHash } from "node:crypto";

export type ManagedEntity = "vehicles" | "tracks" | "track_configurations" | "tire_sets" | "pad_sets" | "teams" | "event_types";
export type DataChange = { entity: ManagedEntity; id: string; operation: "create" | "update"; label: string; payload: Record<string, unknown>; snapshot: string | null };

export const managedSheets: Record<ManagedEntity, { sheet: string; label: string; fields: string[]; required: string[] }> = {
  vehicles: { sheet: "Vehicles", label: "Vehicle", fields: ["business_id","name","status","year","make","model","trim","race_number","competition_class","description","wiki_url","image_url","current_odometer_miles","acquired_on"], required: ["business_id","name"] },
  tracks: { sheet: "Tracks", label: "Track", fields: ["name","short_name","address","city","region","postal_code","country","latitude","longitude","timezone","website_url","notes","is_active"], required: ["name"] },
  track_configurations: { sheet: "Configurations", label: "Configuration", fields: ["track_id","name","direction","distance_miles","is_active"], required: ["track_id","name"] },
  tire_sets: { sheet: "Tires", label: "Tire set", fields: ["vehicle_id","business_id","manufacturer","model","size","compound","purchased_on","first_used_on","starting_sessions","status","notes","is_current"], required: ["vehicle_id","business_id","manufacturer","model"] },
  pad_sets: { sheet: "Pads", label: "Pad set", fields: ["vehicle_id","business_id","axle","manufacturer","model","compound","purchased_on","first_used_on","starting_sessions","status","notes","is_current"], required: ["vehicle_id","business_id","axle","manufacturer","model"] },
  teams: { sheet: "Teams", label: "Team", fields: ["name"], required: ["name"] },
  event_types: { sheet: "Event Types", label: "Event type", fields: ["name"], required: ["name"] },
};

export const exportOnlySheets = [
  { table: "events", sheet: "Events" }, { table: "sessions", sheet: "Sessions" },
  { table: "maintenance_records", sheet: "Service Records" }, { table: "maintenance_record_items", sheet: "Service Items" },
  { table: "checklist_template_items", sheet: "Checklist" }, { table: "event_notes", sheet: "Notes" },
] as const;

export function cleanValue(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result?: unknown }).result ?? "");
  return typeof value === "string" ? value.trim() : value;
}

export function rowSnapshot(row: Record<string, unknown>, fields: string[]) {
  const normalized = Object.fromEntries(fields.map((field) => [field, cleanValue(row[field])]));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export const headerFor = (field: string) => field.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
export const fieldFor = (header: string) => header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
