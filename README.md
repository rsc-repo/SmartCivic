# SmartCivic

Geo-enabled, full-stack crowdsourced civic issue reporting and resolution
platform. Docker-free: everything runs with native runtimes (Node.js,
Python, PostgreSQL) directly on your machine.

See [`CLAUDE.md`](./CLAUDE.md) for the full project specification and
milestone roadmap. This README covers what's built so far.

## Phase 1: Environment Setup & Database Initialization ✅

- `backend/` — NestJS + TypeORM app skeleton, wired to PostgreSQL/PostGIS
- `frontend/` — Next.js (App Router, TypeScript, Tailwind) app skeleton
- `ai-service/` — FastAPI placeholder for Phase 2's AI features (not required yet)
- Full PostGIS schema (`backend/db/schema.sql`) — matches the spec exactly
- Seed script (`backend/db/seed.ts`) — 4 default departments + 3 test
  users (citizen/officer/admin), idempotent
- `GET /api/health` and `GET /api/departments` verified live

## Phase 2: Auth & Role-Based Access Control ✅

- `POST /api/auth/register` — public self-registration, always creates a
  `CITIZEN` account (elevated roles are never accepted from this endpoint)
- `POST /api/auth/login` — verifies bcrypt password hash, issues a signed
  JWT (`JWT_SECRET` / `JWT_EXPIRES_IN` from `.env`)
- `GET /api/auth/me` — protected route, returns the decoded token payload;
  demonstrates `JwtAuthGuard`
- `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`) — requires a valid
  `Authorization: Bearer <token>` header
- `RolesGuard` (`src/auth/guards/roles.guard.ts`) + `@Roles(...)` decorator
  — restricts a route to specific `UserRole`s; stack both guards together
  (`@UseGuards(JwtAuthGuard, RolesGuard)`) on any route that needs it
- Demonstrated live on `POST /api/departments`, which now requires
  `SYSTEM_ADMIN` or `DEPT_ADMIN` — verified: citizens get `403`, admins
  get `201`

Everything below has been run and confirmed working end-to-end in a clean
environment before being handed to you — including the full
register → login → protected-route → role-guard flow, and issue
creation with a real uploaded photo served back out.

## Phase 3: Issue Creation & Local Media Uploads ✅

- `POST /api/issues` — JWT-protected, `multipart/form-data`. Accepts
  `title`, `description`, `category`, `latitude`, `longitude`,
  `addressText`, optional `departmentId`, plus up to 5 files under the
  `media` field.
  - `latitude`/`longitude` are validated (`@IsLatitude`/`@IsLongitude`)
    and stored as a PostGIS `GEOMETRY(Point, 4326)` — TypeORM handles the
    GeoJSON ↔ PostGIS conversion automatically.
  - Files are validated to be images only (jpeg/png/webp/heic), size-capped
    via `MAX_FILE_SIZE_MB`, saved to `backend/uploads/issues/` with a
    random UUID filename, and recorded in `issue_media`.
  - A `SUBMITTED` row is written to `issue_status_history` automatically.
  - Generates a human-readable ticket id, e.g. `SC-20260928-1A6909`.
- `GET /api/issues`, `GET /api/issues/:id`, `GET /api/issues/:id/media`,
  `GET /api/issues/:id/history` — public reads (no login required to
  browse; matches the public map view coming in Phase 4).
- Uploaded photos are served back out at `/uploads/issues/<filename>` via
  the static file server configured in Phase 1 — verified with a real
  downloaded file matching the original.
- **Security fix included:** `User.passwordHash` is now marked `@Exclude()`
  and a global `ClassSerializerInterceptor` was added in `main.ts`, so it
  never leaks in `reporter`/`changedBy`/`assignedOfficer` relations on any
  response (it briefly did before this was added — caught and fixed
  during testing).

## Phase 4: Geospatial API & Map UI ✅

- `GET /api/issues/nearby?lat=..&lng=..&radius=..` — PostGIS
  `ST_DWithin`/`ST_Distance` query, cast to `::geography` so the radius
  is meters (great-circle distance) at any latitude rather than raw
  degrees. Results are sorted nearest-first and each includes a computed
  `distanceMeters`. `radius` defaults to 2000m, capped at 50km.
  Verified live with issues seeded at known distances — a 1km search
  correctly returned only the closest issue, a 6km search returned the
  next two, and a deliberately-far issue (~50km away) was excluded from
  both.
- `frontend/src/app/map/page.tsx` — Leaflet map (via `react-leaflet`)
  showing either all reported issues or the results of a nearby search:
  - Pins are color-coded by status (amber = awaiting triage, blue =
    queued/assigned, violet = in progress, green = resolved, gray =
    closed/invalid, red = reopened) with a legend below the map
  - Clicking a pin shows title, ticket id, status, category, address,
    and (in nearby mode) distance
  - A search panel lets you enter lat/lng + radius, or use
    `navigator.geolocation` ("Use my location") to search around your
    actual position
  - The map auto-fits its bounds to whatever issue set is showing
  - Leaflet is dynamically imported with SSR disabled (`next/dynamic`,
    `ssr: false`) since it touches `window` at import time — verified
    the page still builds and serves correctly server-side, with the map
    itself rendering client-side

## Phase 5: Officer Workflow & Status Tracking ✅

**Backend**
- `PATCH /api/issues/:id/assign` — `DEPT_ADMIN`/`SYSTEM_ADMIN` only. Assigns
  an officer (validated to actually have the `OFFICER` role) and moves the
  issue to `ASSIGNED`.
- `PATCH /api/issues/:id/status` — the assigned officer (or a dept/system
  admin) advances the workflow: `ASSIGNED → IN_PROGRESS → RESOLVED`.
  Every transition is checked against an explicit allow-list
  (`issue-status.transitions.ts`) — skipping a step (e.g. straight to
  `VERIFICATION_PENDING`) is rejected with `400`. Marking `RESOLVED`
  **automatically cascades to `VERIFICATION_PENDING`** in the same
  request (matches the spec: "When issue status is changed to RESOLVED,
  require citizen verification") and accepts optional repair-evidence
  photos under the `evidence` field, stored separately from citizen
  report photos (`uploads/evidence/` vs `uploads/issues/`).
- Every transition writes a row to `issue_status_history` with who made
  the change and why.
- `GET /api/issues?departmentId=&status=&assignedOfficerId=` — filters
  for the officer dashboard.
- `GET /api/users?role=OFFICER` — admin-only, lists officers for the
  assignment dropdown.
- **RBAC nuance verified live**: an admin can act on any issue; a plain
  `OFFICER` can only advance an issue that's actually assigned to them
  (a citizen — or, by the same code path, any other non-assigned account
  — gets `403` trying to advance someone else's issue).

Verified live end-to-end: admin assigns officer → officer moves
`ASSIGNED → IN_PROGRESS → RESOLVED` with an evidence photo → status
auto-lands on `VERIFICATION_PENDING` → full history trail correct →
evidence photo saved to the right subfolder. Also verified: invalid
transitions rejected (400), wrong-role actions rejected (403), assigning
a non-officer or non-existent user rejected (400), and the officer/user
list endpoints never leak `passwordHash`.

**Frontend**
- `/login` — login + self-registration (registration always creates a
  `CITIZEN`, matching the backend).
- `src/lib/auth-context.tsx` — JWT + user persisted to `localStorage`,
  rehydrated on load, wired into the shared `apiClient`'s `Authorization`
  header automatically.
- `/officer` — real dashboard (not the Phase 1 stub anymore):
  - Department + status filters; officers default to "only my assigned
    issues", admins see everything (including unassigned issues they can
    act on)
  - Admins get an inline "assign officer" dropdown on unassigned issues
  - The assigned officer (or an admin) gets "Start progress" /
    "Mark resolved…" buttons that appear only for the statuses where
    they're valid
  - The resolve form supports attaching repair-evidence photos
  - Each row expands to show the full status-history audit trail
  - Nav bar now shows login state and only shows the "Officer dashboard"
    link to officer/admin accounts

## Quick start: GitHub Codespaces

Recommended if you don't want to install Node/PostgreSQL locally.

This repo includes a `.devcontainer/` config. Push it to a GitHub repo,
then on that repo's page: **Code → Codespaces → Create codespace on
main**.

The first launch takes a couple of minutes while `.devcontainer/setup.sh`
runs automatically: it installs PostgreSQL + PostGIS, creates the
database, loads the schema, installs both `backend/` and `frontend`'s npm
dependencies, and seeds the test accounts — all the manual steps below,
done for you. Every step is idempotent, so "Rebuild Container" is always
safe to re-run.

Once it finishes, open two terminals in the Codespace:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Codespaces auto-detects port 3000 and offers to open it in a preview tab
/ your browser — that's the app. Port 3001 (the API) is also forwarded if
you need to hit it directly with curl.

Everything in the rest of this README (test accounts, curl examples,
project structure) applies the same way inside a Codespace — the only
difference is you skip the manual "install PostgreSQL / npm install"
steps below, since `setup.sh` already did them.

## Prerequisites (install natively — no Docker)

*(Skip this section if you're using Codespaces above.)*

- **Node.js** 20+ and npm
- **PostgreSQL** 16+ with the **PostGIS** extension available
  - Ubuntu/Debian: `sudo apt install postgresql postgresql-contrib postgis`
  - macOS (Homebrew): `brew install postgresql postgis`
- **Python** 3.10+ (only needed later, for Phase 2's `ai-service/`)

## 1. Database setup

Create the database and load the schema:

```bash
# Create the database (adjust user/password to match your local Postgres)
createdb -U postgres smartcivic_db
# or: psql -U postgres -c "CREATE DATABASE smartcivic_db;"

# Load the schema (tables, enums, PostGIS extension, spatial index)
psql -U postgres -d smartcivic_db -f backend/db/schema.sql
```

If your local Postgres uses a different user/password than
`postgres`/`postgres`, update `backend/.env` accordingly (see below).

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then edit DB credentials if needed
npm run seed            # seeds departments + test users
npm run dev              # starts NestJS at http://localhost:3001/api
```

Verify it's working:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/departments
```

**Seeded test accounts** (password for all: `Password123!`):

| Role         | Email                     |
|--------------|---------------------------|
| Citizen      | citizen@smartcivic.test   |
| Officer      | officer@smartcivic.test   |
| System Admin | admin@smartcivic.test     |

### Trying out auth + RBAC

```bash
# Register a new citizen
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Password123!","fullName":"You"}'

# Log in as a seeded user and grab the token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartcivic.test","password":"Password123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# Call a protected route
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"

# Admin-only route (citizens get 403, admins get 201)
curl -X POST http://localhost:3001/api/departments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Parks & Recreation","code":"PARKS","slaHoursDefault":72}'

# Report an issue with a photo (any authenticated role)
curl -X POST http://localhost:3001/api/issues \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Pothole on Main St" \
  -F "description=Deep pothole causing traffic issues" \
  -F "category=ROADS" \
  -F "latitude=26.9124" \
  -F "longitude=75.7873" \
  -F "addressText=Main St near City Hall" \
  -F "media=@/path/to/photo.jpg;type=image/jpeg"

# Find issues within 2km of a point, nearest first
curl "http://localhost:3001/api/issues/nearby?lat=26.9124&lng=75.7873&radius=2000"

# Officer workflow: admin assigns an officer, officer advances the issue
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartcivic.test","password":"Password123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
curl -X PATCH http://localhost:3001/api/issues/1/assign \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"officerId": 2}'

OFFICER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@smartcivic.test","password":"Password123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
curl -X PATCH http://localhost:3001/api/issues/1/status \
  -H "Authorization: Bearer $OFFICER_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# RESOLVED (auto-cascades to VERIFICATION_PENDING) with evidence photo
curl -X PATCH http://localhost:3001/api/issues/1/status \
  -H "Authorization: Bearer $OFFICER_TOKEN" \
  -F "status=RESOLVED" -F "comments=Pipe replaced" \
  -F "evidence=@/path/to/repair-photo.jpg;type=image/jpeg"
```

Or just log in at http://localhost:3000/login as `officer@smartcivic.test`
/ `admin@smartcivic.test` (password `Password123!`) and use the
[officer dashboard](http://localhost:3000/officer) directly.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev   # starts Next.js at http://localhost:3000
```

Open http://localhost:3000 — the homepage checks backend connectivity live
and lists the seeded departments. Visit http://localhost:3000/map for the
live issue map (see Phase 4), or log in at http://localhost:3000/login
and visit http://localhost:3000/officer for the officer dashboard (see
Phase 5 below).

## Project structure

```
smartcivic/
├── CLAUDE.md                 # Full spec & roadmap
├── frontend/                 # Next.js app (App Router)
│   └── src/app/{dashboard,map,report,officer}/  # route stubs for later phases
├── backend/                  # NestJS app
│   ├── src/                  # entities, modules, config
│   ├── db/schema.sql         # PostGIS schema init
│   ├── db/seed.ts            # departments + test user seeding
│   └── uploads/              # local media storage (Phase 3+)
└── ai-service/                # Optional Phase 2 FastAPI service (stub)
```

## What's next

Phase 6 (SLA cron engine) is next — `issues.sla_due_at` /
`is_sla_breached` columns and `@nestjs/schedule` (already installed and
initialized via `ScheduleModule.forRoot()` in `app.module.ts`) are ready
for a cron job that flags breached issues every 10 minutes. Phase 7
(citizen verification: confirm/reject fix) follows directly after — the
`VERIFICATION_PENDING` status this phase already lands on is exactly
what it acts on.
