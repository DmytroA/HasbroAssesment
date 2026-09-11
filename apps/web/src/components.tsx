import { Link } from 'react-router-dom';
import type { EventSummary } from '@tabletop/contracts';
import { eventTime, formatDate } from './date';

export function ErrorNotice({ error }: { error: Error | null }) {
  return error ? <div className="notice error" role="alert">{error.message}</div> : null;
}
export function Loading() { return <p className="loading" role="status">Loading events…</p>; }
export function Seats({ event }: { event: EventSummary }) {
  const left = event.capacity - event.registrationCount;
  return <span className={`seats ${left === 0 ? 'full' : ''}`}>{left === 0 ? 'Full' : `${left} ${left === 1 ? 'seat' : 'seats'} left`}</span>;
}
export function EventFacts({ event }: { event: EventSummary }) {
  return <dl className="event-facts">
    <div><dt>Date & time</dt><dd>{formatDate(event.startsAt, event.timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}<br/>{eventTime(event)}</dd></div>
    <div><dt>Location</dt><dd>{event.location}</dd></div>
    <div><dt>Players</dt><dd>{event.registrationCount} / {event.capacity} registered</dd></div>
  </dl>;
}
export function BackLink({ to = '/', children = 'All events' }: { to?: string; children?: React.ReactNode }) {
  return <Link className="back-link" to={to}>← {children}</Link>;
}
