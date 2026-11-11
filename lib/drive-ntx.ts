export type DriveEvent = {
  id: string; title: string; organizer: string | null; venue: string;
  start_at: string; end_at: string | null; track_configuration: string | null;
  registration_url: string | null; source_url: string; course_type: string; access: string;
  announcement_status?: string; reconciliation_status?: string; schedule_note?: string | null;
};
const origin = 'https://drive.ballpitmotor.com';
export function safeDriveLink(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value, origin); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function isEvent(value: unknown): value is DriveEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as DriveEvent;
  return typeof event.id === 'string' && typeof event.title === 'string' && typeof event.venue === 'string' &&
    typeof event.start_at === 'string' && Number.isFinite(Date.parse(event.start_at));
}
async function read(path: string) {
  const response = await fetch(origin + path, { next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Drive NTX unavailable');
  return response.json();
}
export async function getDriveEvents(): Promise<{ events: DriveEvent[]; cached: boolean; unavailable: boolean }> {
  const [live, fallback] = await Promise.allSettled([read('/api/events'), read('/data/events.json')]);
  const liveItems = live.status === 'fulfilled' && Array.isArray(live.value.events) ? live.value.events : null;
  const saved = fallback.status === 'fulfilled' && Array.isArray(fallback.value) ? fallback.value.filter((event: {source_names?: string[]}) => event.source_names?.some(source => ['motorsportreg', 'nasa_texas'].includes(source))) : [];
  // A deployed manual dataset is a fallback if the API is temporarily down.
  let manual: unknown[] = [];
  if (!liveItems) {
    try { const data = await read('/data/manual-events.json'); if (Array.isArray(data)) manual = data; } catch { /* Show known cached listings with an explicit notice. */ }
  }
  const events = new Map<string, DriveEvent>();
  for (const event of [...saved, ...manual, ...(liveItems || [])].filter(isEvent)) {
    const key = `${event.venue.toLowerCase()}|${event.start_at.slice(0,10)}|${event.title.toLowerCase()}`;
    const old = events.get(key);
    events.set(key, { ...old, ...event, registration_url: event.registration_url || old?.registration_url || null });
  }
  return { events: [...events.values()].filter(event => Date.parse(event.end_at || event.start_at) >= Date.now() && event.access !== 'private_closed' && (event as DriveEvent & {status?:string}).status !== 'cancelled').sort((a,b) => a.start_at.localeCompare(b.start_at)), cached: !liveItems, unavailable: !liveItems && !saved.length && !manual.length };
}
