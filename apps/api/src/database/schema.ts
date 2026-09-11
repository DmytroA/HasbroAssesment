export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  format TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 30)
) STRICT;
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(event_id, normalized_name)
) STRICT;
CREATE INDEX IF NOT EXISTS events_start_idx ON events(starts_at);
CREATE TRIGGER IF NOT EXISTS enforce_registration_capacity
BEFORE INSERT ON registrations
WHEN (SELECT COUNT(*) FROM registrations WHERE event_id = NEW.event_id)
     >= (SELECT capacity FROM events WHERE id = NEW.event_id)
BEGIN
  SELECT RAISE(ABORT, 'event_full');
END;
PRAGMA user_version = 1;
`;
