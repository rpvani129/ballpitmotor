export type EventSetup = {
  vehicle_id?: string | null; event_date?: string; event_name?: string;
  organization_name?: string | null; event_type_id?: string | null; team_id?: string | null;
  driver_name?: string | null; track_id?: string | null; configuration_id?: string | null;
  tire_set_id?: string | null; front_pad_set_id?: string | null; rear_pad_set_id?: string | null;
  notes?: string | null;
};

export function validEventDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function nextEventDate(value: string) {
  if (!validEventDate(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// Only setup fields cross to a new day. Results, odometer, weather, checklist
// completion, sharing state, IDs and attachments never enter the create form.
export function cloneEventSetup(event: EventSetup): EventSetup {
  return {
    vehicle_id: event.vehicle_id, event_date: nextEventDate(event.event_date || ""),
    event_name: event.event_name, organization_name: event.organization_name,
    event_type_id: event.event_type_id, team_id: event.team_id, driver_name: event.driver_name,
    track_id: event.track_id, configuration_id: event.configuration_id,
    tire_set_id: event.tire_set_id, front_pad_set_id: event.front_pad_set_id,
    rear_pad_set_id: event.rear_pad_set_id, notes: event.notes,
  };
}

export function driveSourceUrl(id: string) {
  return `https://drive.ballpitmotor.com/calendar?event=${encodeURIComponent(id)}`;
}

export function driveSourceId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://drive.ballpitmotor.com" || parsed.pathname !== "/calendar") return null;
    return parsed.searchParams.get("event") || null;
  } catch { return null; }
}

export function trackKey(value: string) {
  const text = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/eagles canyon|^ecr$/.test(text)) return "ecr";
  if (/cresson|^motorsport ranch$|^motor sport ranch$/.test(text)) return "cresson";
  if (/harris hill|^h2r$/.test(text)) return "harris hill";
  if (/circuit of the americas|^cota$/.test(text)) return "cota";
  if (/hallett/.test(text)) return "hallett";
  return text;
}

export function matchingTrack<T extends { name: string }>(venue: string, tracks: T[]) {
  const matches = tracks.filter(track => trackKey(track.name) === trackKey(venue));
  return matches.length === 1 ? matches[0] : undefined;
}

export function matchingConfiguration<T extends { name: string; is_active: boolean }>(value: string | null, configs: T[]) {
  if (!value) return undefined;
  const norm = (text: string) => text.toLowerCase().replace(/\bcircuit\b|\bmiles?\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  // Length alone must never choose CW/CCW without an announced direction.
  const matches = configs.filter(config => config.is_active && norm(config.name) === norm(value));
  return matches.length === 1 ? matches[0] : undefined;
}
