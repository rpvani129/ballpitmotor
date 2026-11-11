'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DriveEvent } from '@/lib/drive-ntx';
import { safeDriveLink } from '@/lib/drive-ntx';
import { setEventInterest } from './actions';

type Selection = {sourceId:string; id:string; date:string};
export default function DiscoverEvents({events,selected,canPlan,initialInterested,interestsAvailable}:{events:DriveEvent[]; selected:Selection[]; canPlan:boolean; initialInterested:string[]; interestsAvailable:boolean}) {
  const [interested,setInterested] = useState(()=>new Set(initialInterested));
  const [shortlistOnly,setShortlistOnly] = useState(false);
  const [saving,setSaving] = useState<string | null>(null);
  const [saveError,setSaveError] = useState('');
  const interestedCount = events.filter(event=>interested.has(event.id)).length;
  async function toggleInterest(eventId:string) {
    const next = !interested.has(eventId);
    setSaving(eventId);
    setSaveError('');
    try {
      const result = await setEventInterest(eventId,next);
      if (result.error) { setSaveError(result.error); return; }
      setInterested(current=>{const updated=new Set(current);if(next) updated.add(eventId);else updated.delete(eventId);return updated;});
    } catch { setSaveError('Your shortlist could not be saved. Please try again.'); }
    finally { setSaving(null); }
  }
  const [venue,setVenue]=useState(''); const [organizer,setOrganizer]=useState(''); const [search,setSearch]=useState('');
  const visible=useMemo(()=>events.filter(event=>(!shortlistOnly || interested.has(event.id)) && (!venue || event.venue===venue) && (!organizer || event.organizer===organizer) && `${event.title} ${event.venue} ${event.organizer || ''}`.toLowerCase().includes(search.toLowerCase())),[events,venue,organizer,search,shortlistOnly,interested]);
  const date=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}).format(new Date(value));
  return <section className="section-block">
    <div className="discover-shortlist-tabs" role="group" aria-label="Discover event list">
      <button className={`button ${shortlistOnly ? 'ghost' : 'primary'}`} type="button" aria-pressed={!shortlistOnly} onClick={()=>setShortlistOnly(false)}>All events</button>
      <button className={`button ${shortlistOnly ? 'primary' : 'ghost'}`} type="button" aria-pressed={shortlistOnly} onClick={()=>setShortlistOnly(true)}>Interested ({interestedCount})</button>
    </div>
    <p className="form-note">Interested saves an event here. Plan to attend creates a tracker event after you register.</p>
    {saveError && <p className="alert" role="alert">{saveError}</p>}
    <div className="event-filter-bar">
      <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Event, track or organizer" /></label>
      <label>Organization<select value={organizer} onChange={e=>setOrganizer(e.target.value)}><option value="">All organizations</option>{[...new Set(events.map(e=>e.organizer).filter((v):v is string=>Boolean(v)))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Track<select value={venue} onChange={e=>setVenue(e.target.value)}><option value="">All tracks</option>{[...new Set(events.map(e=>e.venue))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    <p>{visible.length} upcoming event{visible.length===1?'':'s'}</p>
    <div className="discover-list">{visible.map(event=>{
      const planned=selected.filter(item=>item.sourceId===event.id);
      const registration=safeDriveLink(event.registration_url); const source=safeDriveLink(event.source_url);
      return <article className="discover-card" key={event.id}>
        <div><p className="eyebrow">{date(event.start_at)}{event.end_at && event.end_at.slice(0,10)!==event.start_at.slice(0,10)?` – ${date(event.end_at)}`:''}</p><h2>{event.title}</h2><p>{event.organizer || 'Organizer unconfirmed'} · {event.venue}{event.track_configuration?` · ${event.track_configuration}`:''}</p>
          {event.announcement_status && <p className="planning-badge">{event.reconciliation_status==='review_required'?'Schedule update needs review':registration?'Registration link available':'Schedule announced · Registration link pending'}</p>}
          {event.schedule_note && <p>{event.schedule_note}</p>}
        </div>
        <div className="record-actions">
          <button className={`button ${interested.has(event.id) ? 'interested-selected' : 'ghost'}`} type="button" aria-pressed={interested.has(event.id)} aria-label={`${interested.has(event.id) ? 'Remove interest in' : 'Mark interested in'} ${event.title}`} disabled={saving !== null || !interestsAvailable} onClick={()=>toggleInterest(event.id)}>{saving === event.id ? 'Saving…' : interested.has(event.id) ? '★ Interested' : '☆ Interested'}</button>
          {planned.length ? <>{planned.map((item,index)=><Link className={index === 0 ? "button primary" : "button ghost"} key={item.id} href={`/dashboard/events/${item.id}`}>{planned.length === 1 ? "View my event" : `View ${date(item.date + "T12:00:00Z")}`}</Link>)}</> : canPlan ? <Link className="button primary" href={`/dashboard/events/new?discover=${encodeURIComponent(event.id)}`}>Plan to attend</Link> : <span>Editor access required to plan</span>}
          {registration && <a href={registration} target="_blank" rel="noreferrer">Registration details ↗</a>}
          {source && <a href={source} target="_blank" rel="noreferrer">View source ↗</a>}
        </div>
      </article>;
    })}</div>
    {!visible.length && <div className="empty-state"><strong>{shortlistOnly ? "No interested events match." : "No matching events."}</strong><p>{shortlistOnly ? "Mark an event Interested in All events, or adjust your filters." : "Try another organization or track."}</p></div>}
  </section>;
}
