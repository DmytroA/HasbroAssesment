import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { BackLink, ErrorNotice, EventFacts, Loading, Seats } from '../components';

export function RegisterPage() {
  const { id = '' } = useParams();
  const [name, setName] = useState('');
  const client = useQueryClient();
  const event = useQuery({ queryKey: ['event', id], queryFn: () => api.event(id), refetchInterval: 10000 });
  const registration = useMutation({ mutationFn: () => api.register(id, name), onSettled: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ['event', id] }), client.invalidateQueries({ queryKey: ['events'] })]);
  } });
  if (event.isPending) return <Loading/>;
  if (!event.data) return <><BackLink/><ErrorNotice error={event.error}/></>;
  const data = event.data;
  const full = data.registrationCount >= data.capacity;
  return <div className="registration-shell"><BackLink to={`/events/${id}`}>Event details</BackLink><section className="panel registration-panel">
    {registration.isSuccess ? <><div className="success-mark" aria-hidden="true">✓</div><p className="eyebrow">SEAT CONFIRMED</p><h1>You're on the list.</h1><p role="status">{registration.data.name}, you're registered for <strong>{data.name}</strong>.</p><EventFacts event={data}/><a className="button primary" href={`/api/events/${id}/calendar.ics`}>Add to calendar</a></> : <>
      <p className="eyebrow">{data.gameName} · {data.format}</p><h1>Save your seat</h1><h2>{data.name}</h2><Seats event={data}/><EventFacts event={data}/><ErrorNotice error={event.error}/><ErrorNotice error={registration.error}/>
      {full ? <div className="notice" role="status">This event is full. No seats remain.</div> : <form onSubmit={e => { e.preventDefault(); registration.mutate(); }}><fieldset disabled={registration.isPending}><label>Your name<input autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Name for the player list"/></label><p className="field-help">Already registered? You only need to sign up once.</p><button className="button primary wide" type="submit">{registration.isPending ? 'Reserving your seat…' : 'Confirm registration'}</button></fieldset></form>}
    </>}
  </section></div>;
}
