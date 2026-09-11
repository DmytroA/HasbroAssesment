import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { BackLink, ErrorNotice, EventFacts, Loading, Seats } from '../components';

export function EventPage() {
  const { id = '' } = useParams();
  const event = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.event(id),
    refetchInterval: 10000,
  });
  const [copyMessage, setCopyMessage] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  if (event.isPending) return <Loading />;
  if (!event.data)
    return (
      <>
        <BackLink />
        <ErrorNotice error={event.error} />
      </>
    );
  const data = event.data;
  const full = data.registrationCount >= data.capacity;
  return (
    <>
      <BackLink />
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {data.gameName} · {data.format}
          </p>
          <h1>{data.name}</h1>
        </div>
        <Seats event={data} />
      </div>
      <ErrorNotice error={event.error} />
      <div className="detail-layout">
        <section className="panel details-panel">
          <h2>Event details</h2>
          <EventFacts event={data} />
          <div
            className="capacity-track"
            role="img"
            aria-label={`${data.registrationCount} of ${data.capacity} seats taken`}
          >
            <span style={{ width: `${(data.registrationCount / data.capacity) * 100}%` }} />
          </div>
          <div className="detail-actions">
            <Link
              className={`button ${full ? 'secondary' : 'primary'}`}
              to={`/events/${id}/register`}
            >
              {full ? 'View registration' : 'Register to play'}
            </Link>
            <a className="button secondary" href={`/api/events/${id}/calendar.ics`}>
              ↓ Calendar invite
            </a>
          </div>
        </section>
        <aside className="panel qr-panel">
          <p className="eyebrow">INVITE YOUR PLAYERS</p>
          <h2>Scan. Sign up. Play.</h2>
          {qrFailed ? (
            <p role="status">QR code unavailable. Use the registration link below.</p>
          ) : (
            <img
              className="qr-image"
              width="224"
              height="224"
              src={`/api/events/${id}/qr.png`}
              alt={`QR code for ${data.name} registration`}
              onError={() => setQrFailed(true)}
            />
          )}
          <p className="muted">Scan to open the registration form.</p>
          <label className="link-label">
            Registration link
            <input readOnly value={data.registrationUrl} onFocus={(e) => e.target.select()} />
          </label>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.registrationUrl);
                setCopyMessage('Link copied.');
              } catch {
                setCopyMessage('Select and copy the registration link above.');
              }
            }}
          >
            Copy link
          </button>
          <p className="copy-status" role="status">
            {copyMessage}
          </p>
        </aside>
      </div>
    </>
  );
}
