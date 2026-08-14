import Link from "next/link";
import { createTrack, updateTrack } from "@/app/actions";

type Track = { id: string; name: string; short_name: string | null; address: string | null; city: string | null; region: string | null; postal_code: string | null; country: string; latitude: number | null; longitude: number | null; timezone: string; website_url: string | null; notes: string | null; is_active: boolean };

export default function TrackForm({ track }: { track?: Track }) {
  return <form className="event-form record-form" action={track ? updateTrack : createTrack}>
    {track && <input type="hidden" name="track_id" value={track.id} />}
    <section className="form-section"><div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">VENUE</p><h2>Identity</h2></div><div className="form-grid three">
      <label className="span-2">Track name<input name="name" defaultValue={track?.name ?? ""} required /></label><label>Short name<input name="short_name" defaultValue={track?.short_name ?? ""} /></label>
      {track ? <label>Status<select name="is_active" defaultValue={track.is_active ? "true" : "false"}><option value="true">Active</option><option value="false">Inactive</option></select></label> : <label>First configuration<input name="configuration_name" placeholder="Optional" /></label>}
    </div></section>
    <section className="form-section"><div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">LOCATION</p><h2>Address + weather</h2></div><div className="form-grid three">
      <label className="span-2">Street address<input name="address" defaultValue={track?.address ?? ""} /></label><label>City<input name="city" defaultValue={track?.city ?? ""} /></label><label>State / region<input name="region" defaultValue={track?.region ?? ""} /></label><label>Postal code<input name="postal_code" defaultValue={track?.postal_code ?? ""} /></label><label>Country<input name="country" defaultValue={track?.country ?? "USA"} /></label>
      <label>Latitude<input name="latitude" type="number" step="0.000001" defaultValue={track?.latitude ?? ""} /></label><label>Longitude<input name="longitude" type="number" step="0.000001" defaultValue={track?.longitude ?? ""} /></label><label>Timezone<input name="timezone" defaultValue={track?.timezone ?? "America/Chicago"} /></label>
      <label className="span-2">Website<input name="website_url" type="url" defaultValue={track?.website_url ?? ""} /></label><label className="span-3">Notes<textarea name="notes" rows={4} defaultValue={track?.notes ?? ""} /></label>
    </div></section>
    <div className="form-submit"><Link className="button ghost light" href="/dashboard/tracks">Cancel</Link><button className="button primary large">{track ? "Save track" : "Add track"}</button></div>
  </form>;
}
