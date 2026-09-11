import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorNotice, Loading, Seats } from '../components';
import { api } from '../helpers/api';
import { dateKey, eventTime, formatDate, groupByDay } from '../helpers/date';

export function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const events = useQuery({ queryKey: ['events'], queryFn: api.events, refetchInterval: 15000 });
  const visibleEvents = events.data?.filter(
    (event) => !selectedDate || dateKey(event.startsAt, event.timeZone) === selectedDate,
  );
  const selectedDateLabel = selectedDate
    ? formatDate(`${selectedDate}T12:00:00Z`, 'UTC', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">IN-STORE PLAY</p>
          <h1>Event calendar</h1>
          <p className="muted">Find your next game. Save your seat.</p>
        </div>
        <Link className="button primary" to="/events/new">
          + Create event
        </Link>
      </div>
      <section className="agenda-controls panel" aria-label="Filter events by date">
        <label htmlFor="agenda-date">
          Event date
          <input
            id="agenda-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        <div className="agenda-date-actions">
          <button
            type="button"
            className="button secondary"
            disabled={!config.data}
            onClick={() =>
              setSelectedDate(
                dateKey(new Date(Date.now()).toISOString(), config.data!.store.timeZone),
              )
            }
          >
            Today
          </button>
          <button
            type="button"
            className="button secondary"
            aria-pressed={!selectedDate}
            onClick={() => setSelectedDate('')}
          >
            All dates
          </button>
        </div>
        {config.data && <p className="field-help">Store timezone: {config.data.store.timeZone}</p>}
      </section>
      <ErrorNotice error={config.error} />
      <ErrorNotice error={events.error} />
      {visibleEvents && (
        <p className="agenda-result-count muted" role="status">
          {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'}
          {selectedDate ? ` on ${selectedDateLabel}` : ' across all dates'}
        </p>
      )}
      {selectedDate && visibleEvents?.length === 0 && (
        <section className="empty panel">
          <h2>No events scheduled</h2>
          <p className="muted">
            There are no events on {selectedDateLabel}. Choose another date or view all dates.
          </p>
          <button type="button" className="button secondary" onClick={() => setSelectedDate('')}>
            View all dates
          </button>
        </section>
      )}
      {events.isPending && <Loading />}
      {!selectedDate && events.data?.length === 0 && (
        <section className="empty panel">
          <span className="empty-mark" aria-hidden="true">
            ◇
          </span>
          <h2>The table is open</h2>
          <p className="muted">Schedule the first event to bring players together.</p>
          <Link className="button primary" to="/events/new">
            Create an event
          </Link>
        </section>
      )}
      {events.data && (
        <div className="agenda">
          {groupByDay(visibleEvents ?? []).map(([day, items]) => (
            <section className="day-group" key={day}>
              <h2 className="day-heading">{day}</h2>
              <div className="event-list">
                {items.map((event) => (
                  <Link className="event-card" key={event.id} to={`/events/${event.id}`}>
                    <div className="event-time">{eventTime(event)}</div>
                    <div className="event-title">
                      <p className="game-label">
                        {event.gameName} <span>· {event.format}</span>
                      </p>
                      <h3>{event.name}</h3>
                      <p className="muted location">{event.location}</p>
                    </div>
                    <div className="event-availability">
                      <Seats event={event} />
                      <span className="muted">
                        {event.registrationCount} / {event.capacity} players
                      </span>
                    </div>
                    <span className="card-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
