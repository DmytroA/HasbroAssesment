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
import { GAME_TEMPLATES } from '../helpers/templates';
import { EventsService } from '../providers/events.service';
import { TemplatesService } from '../providers/templates.service';
import { SqliteEventsRepository } from '../repositories/sqlite-events.repository';

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
            repository: require.resolve('../repositories/sqlite-events.repository'),
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

test('concurrent duplicate requests reserve only one seat and duplicates are scoped to the event', async () => {
  const first = await create(30);
  const responses = await Promise.all(
    ['Alex Smith', ' alex smith ', 'ALEX  SMITH', 'Ａｌｅｘ Smith'].map((name) =>
      http().post(`/api/events/${first.id}/registrations`).send({ name }),
    ),
  );
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 409).length, 3);
  const second = await create(1);
  await http()
    .post(`/api/events/${second.id}/registrations`)
    .send({ name: 'Alex Smith' })
    .expect(201);
  assert.equal((await http().get(`/api/events/${first.id}`)).body.registrationCount, 1);
  assert.equal((await http().get(`/api/events/${second.id}`)).body.registrationCount, 1);
});

test('a duplicate on a full event reports the duplicate and does not affect another event', async () => {
  const first = await create(1);
  await http().post(`/api/events/${first.id}/registrations`).send({ name: 'Alex' }).expect(201);
  const duplicate = await http()
    .post(`/api/events/${first.id}/registrations`)
    .send({ name: 'alex' })
    .expect(409);
  assert.match(duplicate.body.message, /already registered/);
  const second = await create(1);
  await http().post(`/api/events/${second.id}/registrations`).send({ name: 'Taylor' }).expect(201);
  assert.equal((await http().get(`/api/events/${first.id}`)).body.registrationCount, 1);
});

test('registration rejects client-controlled fields without creating a seat', async () => {
  const event = await create(1);
  await http()
    .post(`/api/events/${event.id}/registrations`)
    .send({ name: 'Alex', capacity: 30, eventId: randomUUID() })
    .expect(400);
  await http().post(`/api/events/${event.id}/registrations`).send({}).expect(400);
  assert.equal((await http().get(`/api/events/${event.id}`)).body.registrationCount, 0);
  await http().post(`/api/events/${event.id}/registrations`).send({ name: 'Alex' }).expect(201);
});

test(
  'database lock exhaustion returns 503; releasing the lock allows a clean retry',
  { timeout: 20000 },
  async () => {
    const event = await create(1);
    const competingConnection = new DatabaseSync(config.databasePath);
    try {
      competingConnection.exec('BEGIN IMMEDIATE');
      try {
        const response = await http()
          .post(`/api/events/${event.id}/registrations`)
          .send({ name: 'Alex' })
          .expect(503);
        assert.match(response.body.message, /try again/);
      } finally {
        competingConnection.exec('ROLLBACK');
      }
      assert.equal((await http().get(`/api/events/${event.id}`)).body.registrationCount, 0);
      await http().post(`/api/events/${event.id}/registrations`).send({ name: 'Alex' }).expect(201);
      assert.equal((await http().get(`/api/events/${event.id}`)).body.registrationCount, 1);
    } finally {
      competingConnection.close();
    }
  },
);

test('template and store changes affect new events but preserve previously scheduled details', () => {
  const repository = new SqliteEventsRepository({ ...config, databasePath: ':memory:' });
  try {
    const originalService = new EventsService(
      repository,
      new TemplatesService(GAME_TEMPLATES),
      config,
    );
    const original = originalService.create({ ...validEvent, capacity: 12 });
    const changedTemplates = GAME_TEMPLATES.map((template) =>
      template.id === 'magic'
        ? {
            ...template,
            name: 'Updated Magic preset',
            formats: ['Standard'],
            defaultDurationMinutes: 60,
            defaultCapacity: 8,
          }
        : template,
    );
    const changedConfig = {
      ...config,
      store: { ...config.store, location: 'New store address', timeZone: 'America/New_York' },
    };
    const changedService = new EventsService(
      repository,
      new TemplatesService(changedTemplates),
      changedConfig,
    );
    const next = changedService.create({ ...validEvent, format: 'Standard', capacity: 8 });
    assert.deepEqual(changedService.get(original.id), original);
    assert.equal(next.gameName, 'Updated Magic preset');
    assert.equal(next.location, 'New store address');
    assert.equal(next.timeZone, 'America/New_York');
    assert.equal(Date.parse(next.endsAt) - Date.parse(next.startsAt), 60 * 60000);
    assert.equal(next.capacity, 8);
  } finally {
    repository.onModuleDestroy();
  }
});

test('calendar download preserves Unicode and escaped multiline text across a daylight-saving transition', async () => {
  const name = 'Commander café, finals; round 1\nBring a deck — 日本語';
  const event = (
    await http()
      .post('/api/events')
      .send({ ...validEvent, name, startsAtLocal: '2099-03-08T01:30' })
      .expect(201)
  ).body;
  const response = await http().get(`/api/events/${event.id}/calendar.ics`).expect(200);
  const component = new ICAL.Component(ICAL.parse(response.text));
  assert.equal(component.getAllSubcomponents('vevent').length, 1);
  const parsed = new ICAL.Event(component.getFirstSubcomponent('vevent')!);
  assert.equal(parsed.summary, name);
  assert.equal(parsed.startDate.toJSDate().toISOString(), '2099-03-08T09:30:00.000Z');
  assert.equal(parsed.endDate.toJSDate().toISOString(), '2099-03-08T12:30:00.000Z');
  const again = await http().get(`/api/events/${event.id}/calendar.ics`).expect(200);
  const repeated = new ICAL.Event(
    new ICAL.Component(ICAL.parse(again.text)).getFirstSubcomponent('vevent')!,
  );
  assert.equal(repeated.uid, parsed.uid);
});

test('missing event assets return 404 and registration links ignore an untrusted Host header', async () => {
  const missingId = randomUUID();
  await http().get(`/api/events/${missingId}/calendar.ics`).expect(404);
  await http().get(`/api/events/${missingId}/qr.png`).expect(404);
  const event = await create();
  const detail = (
    await http()
      .get(`/api/events/${event.id}`)
      .set('Host', 'attacker.example')
      .set('X-Forwarded-Host', 'attacker.example')
      .expect(200)
  ).body;
  assert.equal(detail.registrationUrl, `${config.publicUrl}/events/${event.id}/register`);
});

test('registrations and duplicate protection survive reopening the database', async () => {
  const event = await create(2);
  await http().post(`/api/events/${event.id}/registrations`).send({ name: 'Alex' }).expect(201);
  const reopened = new SqliteEventsRepository(config);
  try {
    assert.equal(reopened.find(event.id)?.registrationCount, 1);
    assert.equal(reopened.register(event.id, 'Alex', 'alex').status, 'duplicate');
    assert.equal(reopened.register(event.id, 'Taylor', 'taylor').status, 'registered');
  } finally {
    reopened.onModuleDestroy();
  }
  assert.equal((await http().get(`/api/events/${event.id}`)).body.registrationCount, 2);
});
