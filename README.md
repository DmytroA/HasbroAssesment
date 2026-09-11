# Game Event Calendar

A small organized-play app built with **React, TypeScript, NestJS, and SQLite**. Organizers create events from game templates; players follow a link or scan a QR code to reserve a seat.

[Run locally](#run-locally) · [Design write-up](#design-write-up) · [AI usage](#ai-usage-note) · [Verification](#verify) · [Phone testing](#test-registration-from-a-phone)

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
- Concurrent last-seat requests, normalized duplicate races, and synchronized worker threads using independent database connections.
- Database capacity constraints, registration persistence after reopening, lock-timeout recovery, input validation, and missing event assets.
- Existing event snapshots after template/store changes, event isolation, and registration URLs unaffected by untrusted Host headers.
- Adding a fourth, non-card game through template configuration alone.
- Store-local day grouping and daylight-saving gaps/ambiguities.
- ICS parsing with `ical.js`, including escaped text, location, UTC start/end and stable UID; QR decoding with `jsqr`.
- React creation defaults, date filtering, registration confirmation, full state, and server rejection after stale availability.
- Event-page calendar links, clipboard success/failure, QR image fallback, missing-event feedback, and client handling of validation, proxy, and network errors.

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

I prioritized a complete scheduling-to-registration flow and correctness at the point where two players compete for the last seat. React and NestJS share TypeScript contracts; SQLite provides durable storage and transactions without requiring reviewers to provision a database.

### Capacity: an event invariant, enforced atomically

The organizer chooses a capacity from 1 to 30, starting from the selected template's default. The final value belongs to the **event**, so changing a template cannot change an existing event's limit. The API validates the integer range, and SQLite enforces it with a `CHECK` constraint. Attendance is counted from registration rows rather than maintained as a second, potentially inconsistent counter.

The critical operation is checking availability and inserting a registration **within the same write transaction**. `BEGIN IMMEDIATE` acquires SQLite's write lock before either step. If two players request the last seat, the first transaction inserts and commits; the second then reads the updated count and receives HTTP 409 with a full-event message. A database trigger also prevents inserts beyond capacity. Lock contention waits up to five seconds, then returns HTTP 503 so the client can retry. Tests exercise both simultaneous HTTP requests and independent SQLite connections in worker threads.

Duplicate registration uses a unique `(event_id, normalized_name)` constraint. Names are Unicode-normalized, trimmed, whitespace-collapsed, and compared case-insensitively. This is a deliberate compromise for name-only signup: people sharing a name need an initial. Availability displayed in React is informative; the server makes the final admission decision.

### Templates: configuration with explicit boundaries

Each definition in `apps/api/src/helpers/templates.ts` drives available formats/session types, default duration, and default capacity. The form reads these definitions, and the server validates the selected format against the same template. Adding a fourth game requires one definition; the controller, event service, repository, and form remain unchanged. D&D demonstrates non-card session types, and an automated test adds chess without changing event logic. New mechanics such as table assignment would require an explicit domain extension.

Events snapshot their selected game details, capacity, location, timezone, and resolved start/end instants. Later configuration changes cannot silently rewrite scheduled events. Store-local input is converted to UTC, with ambiguous or nonexistent daylight-saving times rejected. Calendar downloads preserve those instants.

I organized the backend by responsibility: controllers handle HTTP, providers apply business rules, repositories own persistence and transactions, and Nest modules wire dependencies. Shared contracts describe the API without replacing runtime validation. This gives database-specific code a clear boundary while keeping the implementation small.

### Scope choices and next steps

I chose the allowed day-grouped agenda, with a date picker and Today shortcut, to make daily scheduling usable without implementing a month grid. I used `qrcode` and `ics` for standard file/image generation. The store address is a placeholder and game defaults are illustrative presets; persistence and registration are implemented. Authentication, payments, email, recurrence, and event editing/cancellation stay outside scope. The current Wizards lineup's departure from the three-TCG requirement is documented above.

Next I would add idempotency keys for retries after a lost response and complete physical-phone and Google Calendar/Outlook acceptance checks. Organizer authentication and abuse controls would precede public deployment. SQLite's synchronous, single-writer design is a conscious small-app tradeoff: sustained contention can block the Node event loop. Multi-instance growth would justify a shared transactional database behind the repository boundary, retaining the concurrency tests.

## AI usage note

I used OpenAI Codex to scaffold the React/NestJS application, draft implementation and tests, and assist with debugging and documentation. I rejected the initial AI-generated folder layout in favor of my own structure organized by responsibility and refactored the backend into controllers, providers, repositories, modules, and helpers, with a separate React application container. For this application's size, that made the HTTP boundary, business rules, persistence, and dependency wiring easier for me to navigate and review. I used builds, interaction tests, and database concurrency tests to check the resulting implementation.

## Repository map

```text
apps/api/src/
  controllers/   HTTP endpoints
  providers/     Event rules, templates, QR and calendar generation
  repositories/  Persistence interface and SQLite implementation
  modules/       NestJS dependency wiring
  helpers/       DTO validation, schema, and game definitions
  test/          API, concurrency, QR, and ICS tests
apps/web/src/
  containers/    Application shell and route composition
  pages/         Agenda, create, event details, registration
  components/    Shared UI components
  helpers/       Typed HTTP client and date utilities
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
