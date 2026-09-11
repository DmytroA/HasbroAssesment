import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import ICAL from 'ical.js';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { createApp } from '../app';
import { RuntimeConfig } from '../config';
import { SqliteEventsRepository } from '../database/sqlite-events.repository';
import { TemplatesService } from '../templates/templates.module';
import { GAME_TEMPLATES } from '../templates/templates';
import { EventsService } from '../events/events.service';

const directory = mkdtempSync(join(tmpdir(), 'tabletop-test-'));
const config: RuntimeConfig = {
  databasePath: join(directory, 'events.sqlite'),
  publicUrl: 'https://tabletop.example',
  port: 3000,
  store: {
    name: 'Test Store',
    location: '42 Game St, Seattle; Upstairs',
    timeZone: 'America/Los_Angeles',
  },
};
let app: Awaited<ReturnType<typeof createApp>>;
const validEvent = {
  name: 'Friday, Magic; special \\ edition',
  templateId: 'magic',
  format: 'Commander',
  startsAtLocal: '2099-06-12T18:00',
  capacity: 2,
};
before(async () => {
  app = await createApp(config, false);
  await app.init();
});
after(async () => {
  await app?.close();
  rmSync(directory, { recursive: true, force: true });
});
const http = () => request(app.getHttpServer());
async function create(capacity = 2) {
  return (
    await http()
      .post('/api/events')
      .send({ ...validEvent, capacity })
      .expect(201)
  ).body;
}

test('end-to-end create → agenda → detail → registration → full; duplicate normalization', async () => {
  const settings = (await http().get('/api/config').expect(200)).body;
  assert.equal(settings.templates.length, 3);
  assert.ok(
    settings.templates.some((item: { name: string }) => item.name === 'Magic: The Gathering'),
  );
  const event = await create();
  assert.equal(event.capacity, 2);
  assert.equal(event.startsAt, '2099-06-13T01:00:00.000Z');
  assert.equal(event.endsAt, '2099-06-13T04:00:00.000Z');
  assert.equal(event.registrationUrl, `https://tabletop.example/events/${event.id}/register`);
  assert.equal(event.location, config.store.location);
  const list = (await http().get('/api/events').expect(200)).body;
  assert.ok(list.some((item: { id: string }) => item.id === event.id));
  await http()
    .post(`/api/events/${event.id}/registrations`)
    .send({ name: '  Alex   Smith  ' })
    .expect(201);
  const duplicate = await http()
    .post(`/api/events/${event.id}/registrations`)
    .send({ name: 'ＡＬＥＸ smith' })
    .expect(409);
  assert.match(duplicate.body.message, /already registered/);
  await http().post(`/api/events/${event.id}/registrations`).send({ name: 'Taylor' }).expect(201);
  const full = await http()
    .post(`/api/events/${event.id}/registrations`)
    .send({ name: 'Jordan' })
    .expect(409);
  assert.match(full.body.message, /full/);
  assert.equal((await http().get(`/api/events/${event.id}`).expect(200)).body.registrationCount, 2);
});

test('HTTP requests competing for the last seat produce exactly one success', async () => {
  const event = await create(1);
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      http()
        .post(`/api/events/${event.id}/registrations`)
        .send({ name: `Player ${i}` }),
    ),
  );
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 9);
});

test('independent SQLite connections competing in worker threads cannot oversell', async () => {
  const event = await create(1);
  const workers: Worker[] = [];
  try {
    const ready: Promise<void>[] = [];
    const results: Promise<{ status: string }>[] = [];
    for (let i = 0; i < 6; i++) {
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('node:worker_threads');
        require('reflect-metadata');
        const { SqliteEventsRepository } = require(workerData.repository);
        const repository = new SqliteEventsRepository(workerData.config);
        parentPort.once('message', () => {
          try { parentPort.postMessage(repository.register(workerData.id, workerData.name, workerData.name)); }
          finally { repository.onModuleDestroy(); parentPort.close(); }
        });
        parentPort.postMessage('ready');
      `,
        {
          eval: true,
          workerData: {
            repository: require.resolve('../database/sqlite-events.repository'),
            config,
            id: event.id,
            name: `Worker ${i}`,
          },
        },
      );
      workers.push(worker);
      ready.push(
        new Promise((resolve, reject) => {
          worker.once('message', () => resolve());
          worker.once('error', reject);
        }),
      );
      results.push(
        new Promise((resolve, reject) => {
          worker.on('message', (message) => {
            if (message !== 'ready') resolve(message);
          });
          worker.once('error', reject);
        }),
      );
    }
    await Promise.all(ready);
    workers.forEach((worker) => worker.postMessage('go'));
    const outcomes = await Promise.all(results);
    assert.equal(outcomes.filter((result) => result.status === 'registered').length, 1);
    assert.equal(outcomes.filter((result) => result.status === 'full').length, 5);
    assert.equal((await http().get(`/api/events/${event.id}`)).body.registrationCount, 1);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
});

test('validation rejects invalid capacities, names, templates, formats and unexpected fields', async () => {
  for (const capacity of [0, -1, 31, 1.5, '2', null])
    await http()
      .post('/api/events')
      .send({ ...validEvent, capacity })
      .expect(400);
  await create(30);
  for (const change of [
    { name: '   ' },
    { templateId: 'unknown' },
    { format: 'Expanded' },
    { extra: true },
    { startsAtLocal: '2099-02-30T12:00' },
    { startsAtLocal: '2000-01-01T12:00' },
  ]) {
    await http()
      .post('/api/events')
      .send({ ...validEvent, ...change })
      .expect(400);
  }
  const event = await create();
  for (const name of ['', '  ', 'x'.repeat(81), null, 123])
    await http().post(`/api/events/${event.id}/registrations`).send({ name }).expect(400);
  await http().get('/api/events/not-a-uuid').expect(400);
  await http().get(`/api/events/${randomUUID()}`).expect(404);
  await http().post(`/api/events/${randomUUID()}/registrations`).send({ name: 'Alex' }).expect(404);
});

test('daylight-saving gaps and repeated local times are rejected explicitly', async () => {
  // US daylight-saving transitions in 2099: March 8 and November 1.
  const gap = await http()
    .post('/api/events')
    .send({ ...validEvent, startsAtLocal: '2099-03-08T02:30' })
    .expect(400);
  assert.match(gap.body.message, /does not exist/);
  const repeated = await http()
    .post('/api/events')
    .send({ ...validEvent, startsAtLocal: '2099-11-01T01:30' })
    .expect(400);
  assert.match(repeated.body.message, /occurs twice/);
});

test('calendar invite parses with an independent library and preserves title, UTC times, location and UID', async () => {
  const event = await create();
  const invite = await http()
    .get(`/api/events/${event.id}/calendar.ics`)
    .expect(200)
    .expect('Content-Type', /text\/calendar/);
  assert.match(invite.headers['content-disposition'], /attachment; filename=/);
  const parsed = new ICAL.Event(
    new ICAL.Component(ICAL.parse(invite.text)).getFirstSubcomponent('vevent')!,
  );
  assert.equal(parsed.summary, event.name);
  assert.equal(parsed.location, event.location);
  assert.equal(parsed.startDate.toJSDate().toISOString(), event.startsAt);
  assert.equal(parsed.endDate.toJSDate().toISOString(), event.endsAt);
  assert.equal(parsed.uid, `${event.id}@tabletop.local`);
  const qr = await http()
    .get(`/api/events/${event.id}/qr.png`)
    .expect(200)
    .expect('Content-Type', /image\/png/);
  assert.equal(qr.body.subarray(1, 4).toString(), 'PNG');
  const png = PNG.sync.read(qr.body);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, event.registrationUrl);
});

test('a fourth non-card template works without changing core logic; events survive reopening', () => {
  const repository = new SqliteEventsRepository(config);
  let id: string;
  try {
    const templates = new TemplatesService([
      ...GAME_TEMPLATES,
      {
        id: 'chess',
        name: 'Chess',
        formats: ['Rapid'],
        defaultDurationMinutes: 45,
        defaultCapacity: 8,
      },
    ]);
    const service = new EventsService(repository, templates, config);
    const event = service.create({
      ...validEvent,
      templateId: 'chess',
      format: 'Rapid',
      capacity: 8,
    });
    id = event.id;
    assert.equal(event.gameName, 'Chess');
    assert.equal(Date.parse(event.endsAt) - Date.parse(event.startsAt), 45 * 60000);
  } finally {
    repository.onModuleDestroy();
  }
  const reopened = new SqliteEventsRepository(config);
  try {
    assert.equal(reopened.find(id!)?.gameName, 'Chess');
  } finally {
    reopened.onModuleDestroy();
  }
});

test('database constraints reject direct overbooking and invalid event capacity', async () => {
  const event = await create(1);
  const db = new DatabaseSync(config.databasePath);
  try {
    const insert = db.prepare(
      'INSERT INTO registrations(id,event_id,name,normalized_name) VALUES (?,?,?,?)',
    );
    insert.run(randomUUID(), event.id, 'First', 'first');
    assert.throws(() => insert.run(randomUUID(), event.id, 'Second', 'second'), /event_full/);
    assert.throws(
      () => db.prepare('UPDATE events SET capacity = 31 WHERE id = ?').run(event.id),
      /CHECK constraint/,
    );
  } finally {
    db.close();
  }
});
