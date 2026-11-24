'use client';

import { useState, type ReactNode } from 'react';
import { calendarDate, monthDays, moveMonth, occursOn } from '@/lib/event-calendar';

export type CalendarItem = {
  id: string; title: string; subtitle: string; startDate: string; endDate?: string | null;
  status?: 'interested' | 'going';
};

const label = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

export default function EventCalendar({ items, renderEvent }: {
  items: CalendarItem[]; renderEvent: (id: string) => ReactNode;
}) {
  const today = calendarDate(new Date().toISOString());
  const [month, setMonth] = useState(() => {
    const upcoming = items.filter(item => (item.endDate || item.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
    return (upcoming.length ? (upcoming[0].startDate < today ? today : upcoming[0].startDate) : today).slice(0, 7);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const monthEvents = items.filter(item => item.startDate.slice(0, 7) <= month && (item.endDate || item.startDate).slice(0, 7) >= month);
  const detailEvents = selectedDay ? items.filter(item => occursOn(item, selectedDay)) : monthEvents;
  const changeMonth = (value: string) => { setMonth(value); setSelectedDay(null); };

  return <section className="event-calendar" aria-label="Event calendar">
    <div className="calendar-toolbar">
      <h2 aria-live="polite">{label(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
      <div className="calendar-controls">
        <button className="button ghost" type="button" aria-label="Previous month" onClick={() => changeMonth(moveMonth(month, -1))}>Previous</button>
        <button className="button ghost" type="button" onClick={() => changeMonth(today.slice(0, 7))}>Today</button>
        <button className="button ghost" type="button" aria-label="Next month" onClick={() => changeMonth(moveMonth(month, 1))}>Next</button>
        <label>Jump to month<input type="month" aria-label="Jump to month" value={month} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) changeMonth(event.target.value); }} /></label>
      </div>
    </div>
    <p className="form-note">Select a date to see event details. Multi-day events appear on every day. Dates use Central time.</p>
    <div className="calendar-scroll" role="region" aria-label="Monthly calendar; scroll horizontally on small screens" tabIndex={0}>
      <div className="calendar-month">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
        {monthDays(month).map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="calendar-day calendar-blank" aria-hidden="true" />;
          const events = monthEvents.filter(item => occursOn(item, day));
          return <button key={day} type="button" className={`calendar-day ${day === today ? 'calendar-today' : ''} ${day === selectedDay ? 'calendar-selected' : ''}`}
            aria-pressed={day === selectedDay} aria-current={day === today ? 'date' : undefined}
            aria-label={`${label(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${events.length} event${events.length === 1 ? '' : 's'}`}
            onClick={() => setSelectedDay(day)}>
            <span className="calendar-day-number">{Number(day.slice(-2))}</span>
            {events.map(event => <span className={`calendar-event calendar-event-${event.status || 'all'}`} key={event.id}>
              <strong>{event.title}</strong><span>{event.subtitle}</span>
              {event.status && <span className="calendar-attendance">{event.status === 'going' ? '✓ Going' : '★ Interested'}</span>}
            </span>)}
          </button>;
        })}
      </div>
    </div>
    <div className="calendar-details" aria-live="polite">
      <div className="calendar-detail-heading"><h3>{selectedDay ? label(selectedDay, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Events this month'}</h3>
        {selectedDay && <button className="text-button" type="button" onClick={() => setSelectedDay(null)}>Show whole month</button>}
      </div>
      {detailEvents.length ? <div className="discover-list">{[...detailEvents].sort((a, b) => a.startDate.localeCompare(b.startDate)).map(event => renderEvent(event.id))}</div> : <p className="empty-state compact">No events match your filters {selectedDay ? 'on this day' : 'this month'}. Try another month or adjust your filters.</p>}
    </div>
  </section>;
}
