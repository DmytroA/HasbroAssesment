# Tabletop event calendar

A small organized-play app built with **React, TypeScript, NestJS, and SQLite**. Organizers create events from game templates; players follow a link or scan a QR code to reserve a seat.

## Run locally

Requires **Node.js 24+** and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. The React development server proxies `/api` to NestJS on port 3000. SQLite initializes automatically in `data/tabletop.sqlite`; no database installation or account is needed. The app starts empty. Optionally run `npm run seed` to add three sample events (it skips a nonempty database).

With Docker installed and running, an alternative is:

```sh
docker compose up --build
```

Open **http://localhost:3000**. A named volume persists events across container restarts. The Docker configuration is supplied, but was not executed in the development environment because its Docker daemon was unavailable.

### Configuration

Defaults work without an environment file. Copy `.env.example` to `.env` to change the store name, address, IANA timezone, database path, port, or public origin. The sample address is a placeholder; set your real store address before sharing invites.

For a production-style local run:

```sh
npm run build
# Set PUBLIC_URL=http://localhost:3000 in .env first.
npm start
```

NestJS serves the compiled React app and API from port 3000, including direct links to event and registration pages.

### Test registration from a phone

Events are stored in SQLite on the computer running the server, not in browser local storage. A phone can use the same events when it can reach that computer. **A QR link containing `localhost` will not work on a phone:** it points to the phone itself.

1. **Connect the computer and phone to the same Wi-Fi network.** Keep the computer awake and the app running throughout the test.
2. **Find the computer's LAN address.** Run `npm run dev` and look for Vite's `Network:` URL, such as `http://192.168.1.50:5173/`. Use the address for your active Wi-Fi/Ethernet connection, not a VPN or virtual adapter. On Windows, `ipconfig` also shows the active adapter's IPv4 address. On macOS/Linux, you can find it in the active connection's network settings.
3. **Set the public origin in the repository root's `.env` file.** Copy `.env.example` to `.env` if it does not exist, then update `PUBLIC_URL`. Replace the example address below with **your own computer's address**:

   ```dotenv
   PUBLIC_URL=http://192.168.1.50:5173
   ```

   This setting controls the QR code and registration link; it does not configure the computer's network. Keep `.env` local—it is excluded from Git. If you have multiple checkouts, edit the one you actually run.

4. **Restart the app.** Stop `npm run dev` with Ctrl+C and run it again so the API reads the new setting. Refresh any event page already open to get the updated link and QR image. Existing events do not need to be recreated.
5. **Check connectivity before scanning.** On the phone, open the same address directly, for example `http://192.168.1.50:5173`. The event calendar should load. Development mode already listens on the network and proxies API requests, so the phone only needs access to port **5173**.
6. **Test the full flow.** On the computer, create a future event with capacity **1** and open its event page. Scan the displayed QR code with the phone's camera, follow the link, and register a name. Confirm the success message and that the computer's event page updates to `1 / 1 registered`. Open the registration link again: it should report that the event is full. You can also download the calendar invite from the phone.

**Docker or production-style local run:** use `PUBLIC_URL=http://YOUR_COMPUTER_LAN_IP:3000` and open port **3000** instead. For Docker, rerun `docker compose up --build` after changing `.env` so Compose applies the new environment setting; `docker compose restart` alone does not update it. For `npm start`, stop and start the process again.

If the phone cannot connect:

| Symptom                                | What to check                                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QR opens `localhost` or an old address | Check `PUBLIC_URL` in the running checkout, restart the server, and refresh the event page before scanning again. An already-exported `PUBLIC_URL` environment variable takes precedence over `.env`.       |
| The LAN address does not load          | Confirm both devices are on the same network and the server is running. Allow inbound access to the app's port through the computer's firewall on the trusted/private network; do not disable the firewall. |
| Same Wi-Fi, but still unreachable      | Guest/corporate Wi-Fi may isolate devices, and VPN routing may interfere. Try a network that permits communication between devices.                                                                         |
| It worked before switching networks    | The computer's IP address may have changed. Update `PUBLIC_URL`, restart, and refresh the QR code.                                                                                                          |

If phone access is unavailable, click **Register to play** on the computer to test the same registration flow. Physical scanning requires network connectivity; a local LAN address is not accessible over mobile data or from outside that network. The QR code and copyable link use the configured public origin, never an untrusted request Host header.

### Find events on a particular day

The calendar opens as a grouped-by-day agenda showing **All dates**. Use **Event date** to see only events starting on that date, **Today** to select today's date in the configured store timezone, or **All dates** to clear the filter. Empty dates show **No events scheduled**. Filtering uses each event's saved timezone, consistent with the agenda headings, rather than the viewer's device timezone.

## Verify

```sh
npm run check
```

This checks formatting, type-checks/builds both apps, and runs API integration and React interaction tests. API tests use a temporary database, not your local events. GitHub Actions runs the same command on Node 24. Use `npm run format` to apply the shared formatting rules.

Coverage focuses on:

- Complete creation, listing, registration, duplicate, and full-event flows.
- Concurrent last-seat HTTP requests and synchronized worker threads using independent database connections.
- Database capacity constraints, persistence after reopening, input validation, and missing events.
- Adding a fourth, non-card game through template configuration alone.
- Store-local day grouping and daylight-saving gaps/ambiguities.
- ICS parsing with `ical.js`, including escaped text, location, UTC start/end and stable UID; QR decoding with `jsqr`.
- React creation defaults, registration confirmation, full state, and server rejection after stale availability.

Manual acceptance walkthrough: create a capacity-1 event → find it in the agenda → open its event page → follow/scan the registration link → register → attempt a different name → observe the full message. Download the `.ics` file and open it in your calendar. Actual Google Calendar/Outlook import and physical-phone scanning still need a manual check.

### Wizards of the Coast game lineup

| Game                       | Available formats / session types         | Default duration | Default capacity |
| -------------------------- | ----------------------------------------- | ---------------- | ---------------- |
| Magic: The Gathering       | Commander, Standard, Booster Draft        | 180 minutes      | 24 players       |
| Magic: The Gathering Arena | Standard, Historic, Brawl                 | 120 minutes      | 16 players       |
| Dungeons & Dragons         | One-shot, Campaign session, Learn to Play | 240 minutes      | 6 players        |

Durations and capacities are configurable store presets, not official Wizards tournament rules. D&D's options describe session types using the same template field as card-game formats. Arena events represent in-store gatherings where attendees use the digital game; this app does not integrate with Arena matchmaking. Existing events retain their original game details and registrations; changing the lineup only affects new events. The seed script uses the current templates when the database is empty and does not overwrite existing events.

**Assessment scope:** this requested Wizards lineup is not three distinct trading card games. Arena is digital Magic, and D&D is a tabletop roleplaying game. To meet the original three-TCG requirement strictly, use three distinct TCG templates and optionally include D&D as an additional demonstration of extensibility.

Game references: [Magic formats](https://magic.wizards.com/en/formats), [Arena formats](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-formats), [D&D Basic Rules](https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf).

## Design write-up

### Capacity and concurrent registration

`Event` owns `capacity`, validated as an integer from 1 through 30 at the HTTP boundary and constrained by SQLite. `Registration` references its event. The registered count is derived from registrations, avoiding a separate counter that could drift. A composite unique constraint on `(event_id, normalized_name)` also indexes the per-event count query.

Registration is one short `BEGIN IMMEDIATE` transaction: obtain the SQLite write lock, find the event, check for an existing normalized name, check availability, insert, and commit. Competing connections must acquire the same write lock before reading availability. With one seat left, the winner commits its registration; the next connection reads the updated count and receives HTTP 409. A database trigger rejects inserts at capacity even if a caller bypasses the service. SQLite waits up to five seconds for a lock; exhausted contention maps to a retryable HTTP 503. There are no asynchronous calls inside the transaction.

Names are trimmed, Unicode NFKC-normalized, whitespace-collapsed, and lowercased for duplicate comparison. Repeated names return 409 before the full check, so an existing player receives a useful duplicate message. This is a deliberate name-only identity compromise: two people sharing a name must add an initial. It is not authentication or proof of identity. The UI disables submission while pending and refreshes availability, but the server remains authoritative. Registrant names are not exposed in public event responses.

### Templates and application structure

`apps/api/src/helpers/templates.ts` contains data definitions for Magic: The Gathering, Magic: The Gathering Arena, and Dungeons & Dragons. Each drives **available formats, default duration, and default capacity**. NestJS's template service validates definitions and supplies both form configuration and server-side format validation. Adding a fourth game—or chess with a “Rapid” format—means adding one definition. No controller, repository, form, or event service needs a game-name conditional. The hard limit of 30 is an event policy, independent of template defaults.

An event snapshots its game name, selected format, resolved start/end instants, store timezone, location, and capacity. Changing a template or store setting therefore does not retroactively change an existing event or invite. Input is store-local wall time; Luxon converts it to UTC and rejects invalid/nonexistent or repeated DST times rather than silently choosing an instant. The UI displays and groups events in the event's stored timezone. `ics` generates UTC calendar invites with stable event UIDs; `qrcode` generates registration QR images.

The NestJS dependency flow is **controller → service → repository port → SQLite implementation**. Controllers handle transport, DTOs validate input, services apply event rules, and the repository owns atomic persistence. Template and event functionality live in Nest modules. Shared TypeScript contracts live in `packages/contracts`; React uses TanStack Query for server state and React Router for pages. The API performs runtime validation even though both layers share types. This keeps boundaries explicit without adding CQRS, an event bus, or generic base repositories to a small application.

### Scope cuts and next steps

The calendar is the explicitly allowed day-grouped agenda, not a month grid. There is one configured store, no authentication, and no payments, email, recurrence, editing/cancellation, or admin dashboard. Template defaults are intentionally simple store presets, not a tournament rules engine. The sample store address is fake; registration, storage, QR generation, and ICS generation are real. No elapsed-time claim is made: implementation and validation were AI-assisted, and the final submitted timebox should reflect the candidate's actual working time.

SQLite's synchronous API and single-writer model are appropriate for this small local app; sustained contention would block the Node event loop while waiting. Next priorities would be idempotency tokens for ambiguous network retries, stronger player identity if required, explicit policies for registration closing, and calendar-client/phone acceptance checks. Before a public production deployment, add authentication for organizers and abuse controls. If scaling to multiple machines, move the repository to a transactional shared database and retain the same concurrency tests. Schema version 1 is initialized transactionally; future schema changes need explicit numbered migrations.

## AI usage note

OpenAI Codex was used to read the assessment, propose a scoped architecture, implement the React/NestJS app, write focused tests, and verify builds. Official NestJS and Node.js documentation informed the validation and SQLite choices. The first AI-generated QR test only checked the PNG header, which could pass even if the code pointed to the wrong destination; it was strengthened to decode the image with an independent library and assert the exact registration URL. The concurrency design was also verified with competing database connections rather than trusting generated code alone. Review and adapt this note to match your own work before submission.

## Repository map

```text
apps/api/src/
  events/       HTTP DTOs, controller, services, persistence port
  database/     SQLite schema and repository implementation
  templates/    Extensible game definitions and service
  test/         API, concurrency, QR, and ICS tests
apps/web/src/
  pages/        Agenda, create, event details, registration
  api.ts        Typed HTTP boundary
packages/contracts/  Shared API shapes
```

## API

| Method     | Path                            | Purpose                            |
| ---------- | ------------------------------- | ---------------------------------- |
| GET        | `/api/config`                   | Store settings and game templates  |
| GET / POST | `/api/events`                   | List / create events               |
| GET        | `/api/events/:id`               | Event details and registration URL |
| POST       | `/api/events/:id/registrations` | Register with `{ "name": "Alex" }` |
| GET        | `/api/events/:id/qr.png`        | Registration QR image              |
| GET        | `/api/events/:id/calendar.ics`  | Calendar invite download           |
| GET        | `/api/health`                   | Process health                     |

Reference documentation: [NestJS validation](https://docs.nestjs.com/techniques/validation), [Node.js SQLite](https://nodejs.org/api/sqlite.html).

## Submission

Publish this Git repository to a **public** GitHub, GitLab, or Bitbucket repository and submit its URL. Do not include `.env`, local databases, `node_modules`, or the portable development runtime. The original assessment remains in the workspace; it is excluded from Git by default to avoid redistributing the exercise text.
