'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DriveEvent } from '@/lib/drive-ntx';
import { safeDriveLink } from '@/lib/drive-ntx';

type Selection = {sourceId:string; id:string; date:string};
export default function DiscoverEvents({events,selected,canPlan}:{events:DriveEvent[]; selected:Selection[]; canPlan:boolean}) {
  const [venue,setVenue]=useState(''); const [organizer,setOrganizer]=useState(''); const [search,setSearch]=useState('');
  const visible=useMemo(()=>events.filter(event=>(!venue || event.venue===venue) && (!organizer || event.organizer===organizer) && `${event.title} ${event.venue} ${event.organizer || ''}`.toLowerCase().includes(search.toLowerCase())),[events,venue,organizer,search]);
  const date=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}).format(new Date(value));
  return <section className="section-block">
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
        <div className="record-actions">{planned.length ? <>{planned.map((item,index)=><Link className={index === 0 ? "button primary" : "button ghost"} key={item.id} href={`/dashboard/events/${item.id}`}>{planned.length === 1 ? "View my event" : `View ${date(item.date + "T12:00:00Z")}`}</Link>)}</> : canPlan ? <Link className="button primary" href={`/dashboard/events/new?discover=${encodeURIComponent(event.id)}`}>Plan to attend</Link> : <span>Editor access required to plan</span>}
          {registration && <a href={registration} target="_blank" rel="noreferrer">Registration details ↗</a>}
          {source && <a href={source} target="_blank" rel="noreferrer">View source ↗</a>}
        </div>
      </article>;
    })}</div>
    {!visible.length && <div className="empty-state"><strong>No matching events.</strong><p>Try another organization or track.</p></div>}
  </section>;
}
