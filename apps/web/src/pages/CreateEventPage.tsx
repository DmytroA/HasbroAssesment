import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AppConfig, CreateEventInput } from '@tabletop/contracts';
import { BackLink, ErrorNotice, Loading } from '../components';
import { api } from '../helpers/api';

function EventForm({ config }: { config: AppConfig }) {
  const first = config.templates[0];
  const [form, setForm] = useState<CreateEventInput>({
    name: '',
    templateId: first.id,
    format: first.formats[0],
    startsAtLocal: '',
    capacity: first.defaultCapacity,
  });
  const template = config.templates.find((item) => item.id === form.templateId)!;
  const navigate = useNavigate();
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: api.create,
    onSuccess: async (event) => {
      client.setQueryData(['event', event.id], event);
      await client.invalidateQueries({ queryKey: ['events'] });
      navigate(`/events/${event.id}`);
    },
  });
  const changeGame = (id: string) => {
    const next = config.templates.find((item) => item.id === id)!;
    setForm({ ...form, templateId: id, format: next.formats[0], capacity: next.defaultCapacity });
  };
  return (
    <div className="form-layout">
      <form
        className="panel form-panel"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form);
        }}
      >
        <ErrorNotice error={create.error} />
        <fieldset disabled={create.isPending}>
          <label>
            Event name
            <input
              autoFocus
              required
              maxLength={120}
              placeholder="e.g. Friday Night Magic"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              Game
              <select value={form.templateId} onChange={(e) => changeGame(e.target.value)}>
                {config.templates.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Play format
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              >
                {template.formats.map((format) => (
                  <option key={format}>{format}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Date & start time
            <input
              type="datetime-local"
              required
              value={form.startsAtLocal}
              onChange={(e) => setForm({ ...form, startsAtLocal: e.target.value })}
              aria-describedby="time-zone"
            />
            <span className="field-help" id="time-zone">
              Store time: {config.store.timeZone}. Duration: {template.defaultDurationMinutes}{' '}
              minutes.
            </span>
          </label>
          <label>
            Player capacity
            <input
              type="number"
              required
              min={1}
              max={30}
              step={1}
              value={Number.isNaN(form.capacity) ? '' : form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.valueAsNumber })}
            />
            <span className="field-help">Between 1 and 30 players.</span>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {create.isPending ? 'Creating…' : 'Create event'}
            </button>
          </div>
        </fieldset>
      </form>
      <aside className="panel summary-panel">
        <p className="eyebrow">AT THE TABLE</p>
        <h2>{template.name}</h2>
        <dl>
          <div>
            <dt>Format</dt>
            <dd>{form.format}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{template.defaultDurationMinutes} minutes</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>
              {config.store.name}
              <br />
              <span className="muted">{config.store.location}</span>
            </dd>
          </div>
        </dl>
        <p className="field-help">
          Your event gets a registration link, a QR code, and a calendar invite.
        </p>
      </aside>
    </div>
  );
}
export function CreateEventPage() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  return (
    <>
      <BackLink />
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZE A GAME</p>
          <h1>Create an event</h1>
        </div>
      </div>
      <ErrorNotice error={config.error} />
      {config.isPending && <Loading />}
      {config.data && <EventForm config={config.data} />}
    </>
  );
}
