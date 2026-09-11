import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { EventSummary } from '@tabletop/contracts';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config';
import { EventsRepository, NewEvent, RegistrationResult } from '../events/events.repository';
import { INITIAL_SCHEMA } from './schema';

const SELECT_EVENTS = `SELECT e.id, e.name, e.template_id AS templateId, e.game_name AS gameName,
  e.format, e.starts_at AS startsAt, e.ends_at AS endsAt, e.time_zone AS timeZone,
  e.location, e.capacity, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS registrationCount
  FROM events e`;

@Injectable()
export class SqliteEventsRepository extends EventsRepository implements OnModuleDestroy {
  private readonly db: DatabaseSync;
  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    super();
    if (config.databasePath !== ':memory:')
      mkdirSync(dirname(config.databasePath), { recursive: true });
    this.db = new DatabaseSync(config.databasePath);
    this.db.exec(
      'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;',
    );
    const version = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version > 1)
      throw new Error('Database schema is newer than this application.');
    if (version.user_version === 0) {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        this.db.exec(INITIAL_SCHEMA);
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }
  onModuleDestroy() {
    this.db.close();
  }
  list(): EventSummary[] {
    return this.db
      .prepare(`${SELECT_EVENTS} ORDER BY e.starts_at, e.id`)
      .all() as unknown as EventSummary[];
  }
  find(id: string): EventSummary | undefined {
    return this.db.prepare(`${SELECT_EVENTS} WHERE e.id = ?`).get(id) as unknown as
      | EventSummary
      | undefined;
  }
  create(event: NewEvent): EventSummary {
    this.db
      .prepare(
        `INSERT INTO events(id,name,template_id,game_name,format,starts_at,ends_at,time_zone,location,capacity)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        event.id,
        event.name,
        event.templateId,
        event.gameName,
        event.format,
        event.startsAt,
        event.endsAt,
        event.timeZone,
        event.location,
        event.capacity,
      );
    return this.find(event.id)!;
  }
  register(eventId: string, name: string, normalizedName: string): RegistrationResult {
    let inTransaction = false;
    try {
      // Acquire the write lock BEFORE reading availability. Other connections wait here.
      this.db.exec('BEGIN IMMEDIATE');
      inTransaction = true;
      const event = this.find(eventId);
      let result: RegistrationResult;
      if (!event) result = { status: 'missing' };
      else if (
        this.db
          .prepare('SELECT 1 FROM registrations WHERE event_id=? AND normalized_name=?')
          .get(eventId, normalizedName)
      ) {
        result = { status: 'duplicate' };
      } else if (event.registrationCount >= event.capacity) result = { status: 'full' };
      else {
        const receipt = { id: randomUUID(), eventId, name };
        this.db
          .prepare('INSERT INTO registrations(id,event_id,name,normalized_name) VALUES (?,?,?,?)')
          .run(receipt.id, eventId, name, normalizedName);
        result = { status: 'registered', receipt };
      }
      this.db.exec('COMMIT');
      inTransaction = false;
      return result;
    } catch (error) {
      if (inTransaction) this.db.exec('ROLLBACK');
      const message = error instanceof Error ? error.message : '';
      if (message.includes('event_full')) return { status: 'full' };
      if (message.includes('UNIQUE constraint failed: registrations.event_id'))
        return { status: 'duplicate' };
      if (message.includes('database is locked') || message.includes('database is busy'))
        return { status: 'busy' };
      throw error;
    }
  }
}
