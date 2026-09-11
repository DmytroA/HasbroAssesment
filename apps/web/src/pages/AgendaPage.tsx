import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorNotice, Loading, Seats } from '../components';
import { api } from '../helpers/api';
import { eventTime, groupByDay } from '../helpers/date';

export function AgendaPage() {
  const events = useQuery({ queryKey: ['events'], queryFn: api.events, refetchInterval: 15000 });
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
      <ErrorNotice error={events.error} />
      {events.isPending && <Loading />}
      {events.data?.length === 0 && (
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
          {groupByDay(events.data).map(([day, items]) => (
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
