# Personal OS

A self-hosted life and work management system built on top of a real-time collaborative kanban base (TaskFlow). Combines a weekly schedule, 4-column kanban, daily habits tracker, recurring task engine, iCloud/CalDAV sync, and a natural-language AI update bar — all in one app.

---

## Table of Contents

1. [Stack](#stack)
2. [Repository Layout](#repository-layout)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Backend](#backend)
   - [Server bootstrap](#server-bootstrap)
   - [Authentication](#authentication)
   - [API Routes](#api-routes)
   - [AI Update Route (Groq)](#ai-update-route-groq)
   - [CalDAV Sync Library](#caldav-sync-library)
   - [Seeding](#seeding)
   - [Socket.IO](#socketio)
6. [Frontend](#frontend)
   - [Entry point and providers](#entry-point-and-providers)
   - [Auth context](#auth-context)
   - [PersonalOS context](#personalos-context)
   - [Pages and routing](#pages-and-routing)
   - [Components](#components)
7. [Data flow: end-to-end request](#data-flow-end-to-end-request)
8. [Real-time updates](#real-time-updates)
9. [AI bar](#ai-bar)
10. [CalDAV / iCloud sync](#caldav--icloud-sync)
11. [Testing](#testing)
12. [Local development](#local-development)
13. [Environment variables](#environment-variables)
14. [Deployment](#deployment)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS custom properties (dark theme) |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| HTTP client | Axios with 401 refresh interceptor |
| Real-time (client) | Socket.IO client |
| Backend | Node.js + Express |
| Database | PostgreSQL via Neon (serverless) |
| DB access | Raw SQL with `pg` connection pool |
| Auth | JWT access token (15 min) + httpOnly refresh cookie (7 days) |
| Real-time (server) | Socket.IO |
| AI | Groq SDK — `llama-3.3-70b-versatile` |
| Calendar sync | Raw HTTP via Axios to CalDAV/iCloud (not tsdav — ESM incompatible with CJS backend) |
| Frontend tests | Vitest + @testing-library/react |
| Backend tests | Jest + Supertest |

---

## Repository Layout

```
task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                      # PG pool, initDB (runs migrations on boot)
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       └── 001_personal_os.sql    # All Personal OS tables + indexes
│   │   ├── lib/
│   │   │   ├── caldav.js                  # CalDAV/iCloud sync library
│   │   │   └── seed.js                    # Default data seeded on registration
│   │   ├── middleware/
│   │   │   ├── auth.js                    # JWT verify, attaches req.user.userId
│   │   │   └── errorHandler.js            # Global Express error handler
│   │   ├── routes/
│   │   │   ├── auth.js                    # /api/auth — login, register, refresh, me
│   │   │   ├── tasks.js                   # /api/tasks — CRUD + activity + next steps
│   │   │   ├── habits.js                  # /api/habits — definitions + toggle completions
│   │   │   ├── day-rules.js               # /api/day-rules — weekly focus configuration
│   │   │   ├── recurring.js               # /api/recurring — recurring task rules
│   │   │   ├── claude-update.js           # /api/claude-update — Groq AI operations
│   │   │   └── (base TaskFlow: boards, columns, cards, comments, workspaces …)
│   │   ├── socket/
│   │   │   └── handlers.js                # Socket.IO auth + room management
│   │   └── server.js                      # Express app, HTTP server, Socket.IO
│   ├── __tests__/                         # Jest test suites (48 tests)
│   ├── .env                               # Local secrets (gitignored)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.ts                   # Axios instance + 401 refresh interceptor
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx            # Login state, token storage
│   │   │   ├── SocketContext.tsx          # Socket.IO connection lifecycle
│   │   │   └── PersonalOSContext.tsx      # All OS state + socket listeners
│   │   ├── types/
│   │   │   └── personalOS.ts              # TypeScript interfaces + label/colour constants
│   │   ├── pages/PersonalOS/
│   │   │   ├── PersonalOSPage.tsx         # /os/week
│   │   │   ├── BoardsPage.tsx             # /os/boards
│   │   │   └── TodayPage.tsx              # /os/today
│   │   ├── components/PersonalOS/
│   │   │   ├── PersonalOSLayout.tsx       # Shell: header, nav tabs, ClaudeBar mount
│   │   │   ├── WeekView.tsx               # 7-column schedule grid
│   │   │   ├── KanbanBoard.tsx            # 4-column DnD kanban
│   │   │   ├── HabitsTracker.tsx          # Habit grid with streaks
│   │   │   ├── TodayView.tsx              # Today's tasks + habits
│   │   │   ├── TaskDetailPanel.tsx        # Slide-in task editor (lazy loaded)
│   │   │   └── ClaudeBar.tsx              # Fixed AI input bar at page bottom
│   │   ├── __tests__/                     # Vitest test suites (28 tests)
│   │   ├── App.tsx                        # React Router routes + guards
│   │   └── main.tsx                       # Root render + provider tree
│   ├── .env                               # VITE_API_URL, VITE_SOCKET_URL (gitignored)
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── render.yaml                            # Render.com backend deployment config
├── vercel.json                            # Root Vercel config (monorepo hint)
└── frontend/vercel.json                   # SPA rewrite rule for Vercel
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (React)                        │
│                                                              │
│  PersonalOSContext ──── socket.on('board:refresh')           │
│         │                                                    │
│   WeekView   KanbanBoard   HabitsTracker   TodayView         │
│         │          │                                         │
│   TaskDetailPanel (lazy-loaded)   ClaudeBar (fixed bottom)   │
└──────────────┬────────────────────────┬──────────────────────┘
               │ HTTPS REST             │ WebSocket (Socket.IO)
               ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express + Socket.IO                       │
│                                                              │
│  /api/auth          JWT issue + httpOnly refresh cookie      │
│  /api/tasks         CRUD, activity log, next-step toggle     │
│  /api/habits        definitions + toggle completions by date │
│  /api/day-rules     weekly focus area configuration          │
│  /api/recurring     recurring task rules + resolve           │
│  /api/claude-update Groq → validate → SQL txn → emit        │
│  /api/caldav-status last sync_log entry                      │
│                                                              │
│  Socket.IO rooms:  user:{userId}  (private per-user room)    │
└──────────┬──────────────────────┬──────────────────────┬────┘
           │ pg pool              │ Groq SDK             │ axios
           ▼                      ▼                      ▼
    PostgreSQL (Neon)      Groq Cloud API         CalDAV / iCloud
```

Every user gets a **private Socket.IO room** (`user:{userId}`). When any write operation happens — whether from a REST route or the AI route — the server emits `board:refresh` or `task:updated` into that room. The React context picks it up and re-fetches or patches state, keeping every open browser tab in sync automatically.

---

## Database Schema

All tables are created by `001_personal_os.sql`, which is read from disk and executed inside `initDB()` on every server boot. All statements use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so they are fully idempotent.

### `day_rules`
The user's weekly focus schedule — one row per day.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `day_of_week` | int | 0=Sun … 6=Sat |
| `focus_area` | text | `job_hunt`, `lms`, `freelance`, `learning`, `flex`, `rest` |
| `max_focus_hours` | int | Upper bound for the hours bar in WeekView |
| `calendar_color` | text | Hex colour, used in CalDAV category styling |

### `tasks`
Central Personal OS task table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `title` | text | |
| `status` | text | `backlog`, `this_week`, `in_progress`, `done` |
| `priority` | int | 1 = high, 2 = medium, 3 = low |
| `category` | text | `career`, `lms`, `freelance`, `learning`, `uber`, `faith` |
| `assigned_day` | date | Which calendar day the task is pinned to |
| `scheduled_time` | time | Optional start time shown in WeekView |
| `duration_minutes` | int | Planned duration for hours bar |
| `time_logged_minutes` | int | Accumulated logged time |
| `last_left_off` | text | Short context note for resuming |
| `next_steps` | jsonb | `[{ text: string, done: boolean }]` checklist |
| `notes` | text | Long-form markdown notes |
| `caldav_uid` | text | iCal UID stored so updates/deletes can target the right event |
| `updated_at` | timestamptz | Auto-updated on every write |

Indexes: `(user_id, status)`, `(user_id, assigned_day)`, `(user_id, category)`.

### `recurring_tasks`
Template rules for tasks that repeat (e.g. Uber Eats every evening).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `title` | text | |
| `category` | text | |
| `scheduled_time` | time | Time shown in WeekView |
| `days_of_week` | int[] | Array of DOW ints (e.g. `[0,1,2,3,4,5,6]`) |
| `until_condition` | text | Human-readable stop condition |
| `condition_met` | bool | Set to true by `resolve_recurring` operation |
| `active` | bool | Flipped to false when condition_met |

### `habits`
Habit definitions grouped by life category.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `name` | text | |
| `category` | text | `faith`, `body`, `growth` |
| `time_of_day` | text | `morning`, `evening`, `anytime` |
| `duration_minutes` | int | |
| `sort_order` | int | Display order within category |
| `active` | bool | Soft delete |

### `habit_completions`
One row per (habit, date) when the user marks a habit done.

| Column | Type | Notes |
|---|---|---|
| `habit_id` | uuid FK → habits | Composite PK |
| `user_id` | uuid FK | |
| `completed_date` | date | Composite PK — prevents duplicates |

### `task_activity`
Append-only audit log. Every task change writes a row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → tasks | |
| `user_id` | uuid FK | |
| `action` | text | `created`, `completed`, `claude_update`, `next_step_added`, `status_change` … |
| `payload` | jsonb | Action-specific data (e.g. `{ "new_status": "done" }`) |
| `created_at` | timestamptz | |

### `caldav_sync_log`
Records every CalDAV operation so the frontend can show a sync status indicator.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `task_id` | uuid | |
| `operation` | text | `create`, `update`, `delete` |
| `caldav_uid` | text | |
| `status` | text | `success`, `failed`, `skipped` |
| `error_message` | text | Null on success |
| `created_at` | timestamptz | |

---

## Backend

### Server bootstrap

`backend/src/server.js` is the entry point. On startup:

1. **`initDB()`** connects to Neon and runs two schema blocks:
   - The base TaskFlow schema (users, workspaces, boards, columns, cards, comments, activity_log, refresh_tokens) — inline SQL in `db.js`.
   - Personal OS tables — read from `db/migrations/001_personal_os.sql` via `fs.readFileSync` and executed as a single statement block.
   Both are `CREATE IF NOT EXISTS`, so safe to run on every boot.

2. **Express middleware**: `cors` (with `credentials: true` and `CLIENT_URL` origin), `cookie-parser`, `express.json`.

3. **Route mounting** — all under `/api/`:
   ```
   /api/auth          → auth.js
   /api/tasks         → tasks.js
   /api/habits        → habits.js
   /api/day-rules     → day-rules.js
   /api/recurring     → recurring.js
   /api/claude-update → claude-update.js
   /api/caldav-status → inline handler (last sync_log row)
   /api/health        → { status: 'ok' }
   ```

4. **`app.set('io', io)`** makes the Socket.IO instance available inside any route handler via `req.app.get('io')` — no import cycle needed.

5. A **pool-exhaustion guard** wraps every request: if `pool.waitingCount > pool.options.max * 2` the server returns 503 immediately rather than letting the queue pile up indefinitely.

### Authentication

`backend/src/middleware/auth.js` — applied to every Personal OS route.

- Reads `Authorization: Bearer <token>` from the request header.
- Verifies against `JWT_SECRET`. Attaches `{ userId }` to `req.user`.
- Returns 401 on missing, expired, or invalid tokens.

**Token lifecycle** (in `routes/auth.js`):

| Endpoint | Behaviour |
|---|---|
| `POST /api/auth/register` | Hashes password with bcrypt, inserts user, triggers `seedUserDefaults` via `setImmediate`, returns `{ accessToken, token, user }` |
| `POST /api/auth/login` | Verifies password, issues 15-min access token + 7-day refresh token in httpOnly cookie |
| `POST /api/auth/refresh` | Reads refresh cookie, verifies, returns new access token |
| `GET /api/auth/me` | Returns `{ user: { id, name, email } }` for the current token |

Both `accessToken` and `token` fields are returned from login/register for compatibility with any client that reads either name.

The frontend Axios instance (`api/axios.ts`) attaches the stored access token to every request via a request interceptor. A response interceptor catches 401 responses, calls `/api/auth/refresh`, stores the new token, and replays the original request — completely transparently to all callers.

### API Routes

**`/api/tasks`**

| Method | Path | What it does |
|---|---|---|
| GET | `/` | All user tasks, sorted by priority |
| GET | `/:id` | Single task + full `task_activity` log |
| POST | `/` | Create task → CalDAV `createCalEvent` (fire-and-forget) → emit `task:created` |
| PATCH | `/:id` | Update allowed fields. Status → `done` writes a `completed` activity entry. → CalDAV `updateCalEvent` → emit `task:updated` |
| DELETE | `/:id` | Delete task → CalDAV `deleteCalEvent` → emit `task:deleted` |
| POST | `/:id/activity` | Append a free-form activity entry |
| PATCH | `/:id/next-steps/:stepIndex` | Toggle `done` on one item in the `next_steps` jsonb array |

**`/api/habits`**

| Method | Path | What it does |
|---|---|---|
| GET | `/` | All active habits + `completions[]` array (last 30 days) |
| POST | `/:id/complete` | Toggle completion for a date (defaults to today) — inserts or deletes the `habit_completions` row |
| POST | `/` | Create a new habit |
| PATCH | `/:id` | Update habit fields |
| DELETE | `/:id` | Soft-delete (sets `active=false`) |

**`/api/day-rules`**

| Method | Path | What it does |
|---|---|---|
| GET | `/` | All 7 rules for the user |
| PATCH | `/:dayOfWeek` | Update `focus_area`, `max_focus_hours`, or `calendar_color` |

**`/api/recurring`**

| Method | Path | What it does |
|---|---|---|
| GET | `/` | All active recurring rules |
| POST | `/` | Create a new rule |
| PATCH | `/:id/resolve` | Set `condition_met=TRUE`, `active=FALSE` — idempotent (WHERE clause guards against double-resolve) |
| DELETE | `/:id` | Delete the rule |

### AI Update Route (Groq)

`backend/src/routes/claude-update.js` — the most complex file. Here is the exact execution flow for a single ClaudeBar submission.

**Step 1 — Build context snapshot**

Five parallel SQL queries pull the current board state:
- All tasks (id, title, status, priority, category, assigned_day)
- Active recurring tasks
- All 7 day rules
- All active habits
- Today's habit completions

This snapshot is serialised as JSON and injected into the system prompt at the `<BOARD_STATE>` placeholder.

**Step 2 — Call Groq**

```js
groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  max_tokens: 2048,
  response_format: { type: 'json_object' },  // forces valid JSON — no markdown
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: message },
  ],
})
```

Wrapped in `Promise.race` with a 15-second timeout. If Groq doesn't respond in time, the route returns 504.

The system prompt instructs the model to return **only** a JSON object:
```json
{
  "operations": [...],
  "summary": "one sentence for the success toast",
  "warnings": ["schedule conflict strings shown in the yellow banner"]
}
```

The prompt includes the user's full context (day rules, categories, Uber Eats schedule, prayer habits) so the model can enforce constraints without being told every time.

**Step 3 — Validate every operation**

`validateOp()` runs before any operation touches the database:

- `type` checked against an 8-item allowlist — unknown types are rejected
- `task_id` / `habit_id` / `recurring_id` must pass UUID regex
- `new_status` must be one of the 4 valid status strings
- `fields` in `update_task` checked against an explicit field allowlist — prevents injecting arbitrary column names
- `priority` must be 1, 2, or 3
- `assigned_day` must match `YYYY-MM-DD`
- String fields run through `sanitize()` — strips `<>`, truncates to prevent oversized payloads

Operations that fail validation go into a `skipped[]` array returned to the client. They never reach the database.

**Step 4 — Execute in a transaction**

All valid operations run inside a single `BEGIN` / `COMMIT` block using a dedicated pool client. Each operation type has its own typed handler function — the model output is never executed as raw SQL:

| Operation | Handler |
|---|---|
| `move_task` | `UPDATE tasks SET status=?` — writes `claude_update` activity entry, extra `completed` entry if `done` |
| `update_task` | Builds parameterised `SET` clause from the allowed field list only |
| `add_next_step` | Reads `next_steps` jsonb, appends `{ text, done: false }`, writes back |
| `complete_next_step` | Reads steps, sets `steps[i].done = true`, writes back |
| `create_task` | `INSERT INTO tasks …` — writes `created` activity entry |
| `complete_habit` | `INSERT … ON CONFLICT DO NOTHING` into `habit_completions` |
| `resolve_recurring` | `UPDATE … SET condition_met=TRUE, active=FALSE WHERE condition_met=FALSE` |
| `schedule_warning` | No DB write — passes the warning message through to the response |

If any handler throws, the entire transaction rolls back.

**Step 5 — Emit and respond**

```js
io.to(`user:${userId}`).emit('board:refresh', { triggeredBy: 'claude' });
```

The frontend context listens for `board:refresh` and calls `fetchAll()` — a full re-fetch of all data. The HTTP response returns `operations_applied`, `skipped`, `summary` (becomes the toast), and `warnings` (trigger the yellow banner).

### CalDAV Sync Library

`backend/src/lib/caldav.js` — mirrors task writes to iCloud Calendar.

**isConfigured()** returns `true` only when all four `CALDAV_*` env vars are set. If not configured, every function returns `null` immediately and nothing is written to the log.

**VEVENT format** (`buildVEvent`):
- All-day tasks: `DTSTART;VALUE=DATE:YYYYMMDD`
- Timed tasks: `DTSTART:YYYYMMDDTHHmmss`
- `SUMMARY`: task title
- `CATEGORIES`: task category
- `PRIORITY`: maps 1→1, 2→5, 3→9 (iCal priority scale)
- `DESCRIPTION`: last_left_off + next steps joined as text

**Retry logic** (`withRetry(fn, 3)`): on network failure waits 1s, then 2s, then 4s. 4xx responses (except 207 Multi-Status) are not retried — they indicate a client error that retrying won't fix. All results (success or failure) are written to `caldav_sync_log`. A 404 on delete is treated as success (idempotent).

**Fire-and-forget**: Every route that modifies a task wraps the CalDAV call in `setImmediate(async () => { … })`. The HTTP response is sent to the client immediately; the CalDAV request runs in the next event-loop iteration. A slow or unreachable CalDAV server never delays the user.

### Seeding

`backend/src/lib/seed.js` is called via `setImmediate(() => seedUserDefaults(userId))` inside the registration route, so it runs after the response has been sent.

It inserts, if not already present:
- **7 day rules**: Sun=rest, Mon=job_hunt, Tue=lms, Wed=freelance, Thu=lms, Fri=learning, Sat=flex — each with a default hex colour and max hours
- **9 habits**: Fajr, 5 daily prayers, Jamaa, Morning adkar, Evening adkar, Salawat, Quran hifz (faith category); Gym (body); Coding learning (growth)
- **1 recurring task**: Uber Eats at 21:00, every day of the week, `until_condition = 'mercor_or_outlier_or_fulltime'`

Each group checks `COUNT(*) > 0` before inserting, so the function is safe to call multiple times.

### Socket.IO

`backend/src/socket/handlers.js`

On every new connection:
1. JWT is read from `socket.handshake.auth.token` and verified.
2. If invalid, the socket is disconnected immediately.
3. If valid, `socket.join('user:${userId}')` puts the user in their private room.

Two room types coexist without conflict:
- `user:{userId}` — Personal OS events. Used by claude-update, tasks, habits.
- `board:{boardId}` — Original TaskFlow collaborative editing. Used by cards, columns, comments.

Events emitted into `user:{userId}`:

| Event | Trigger | Payload |
|---|---|---|
| `board:refresh` | claude-update route | `{ triggeredBy: 'claude' }` |
| `task:updated` | PATCH /tasks/:id | updated task object |
| `task:deleted` | DELETE /tasks/:id | `{ id }` |

---

## Frontend

### Entry point and providers

`main.tsx` renders the provider tree in this exact order:

```
BrowserRouter
  AuthProvider            ← manages login state, access token
    SocketProvider        ← manages Socket.IO connection
      PersonalOSProvider  ← all OS data + socket event listeners
        App               ← route definitions
        Toaster           ← react-hot-toast notifications
```

The order is load-bearing. `PersonalOSProvider` must be inside `SocketProvider` (needs the socket) and inside `AuthProvider` (needs `user` to gate API calls).

### Auth context

`AuthContext.tsx` is the source of truth for the logged-in user.

- On mount: calls `GET /api/auth/me` to restore the session from the access token in `localStorage`.
- `login()`: calls login endpoint, stores access token in `localStorage`, sets `user` state.
- `logout()`: clears `localStorage`, resets state.
- Exports `user`, `loading`, `login`, `logout`, `register`.

`ProtectedRoute` and `PublicRoute` in `App.tsx` read `user` and `loading`:
- While `loading` is true, a spinner is shown (prevents flash redirect before session is restored).
- `ProtectedRoute` redirects to `/login` when `user` is null.
- `PublicRoute` redirects to `/dashboard` when `user` is set (prevents logged-in users visiting login/register).

### PersonalOS context

`PersonalOSContext.tsx` is the single source of truth for all Personal OS data.

**State held**:
- `tasks[]` — all the user's tasks
- `recurringTasks[]` — active recurring rules
- `dayRules[]` — the 7-day focus schedule
- `habits[]` — habit definitions with embedded `completions[]` arrays
- `caldavStatus` — `'synced' | 'syncing' | 'error' | 'not_configured'`
- `activeTaskId` — which task currently has the detail panel open (null = closed)
- `loading` — true until the first `fetchAll` resolves

**Initialization guard**: the main `useEffect` starts with `if (!user) return`. This prevents unauthenticated API calls on the login page, which would trigger 401 → refresh fail → `window.location.href = '/login'` → page reload → infinite loop.

**Socket listeners** are registered in a separate `useEffect` that depends only on `[socket, fetchAll]`:
- `board:refresh` → `fetchAll()` (full re-fetch of all 4 data types)
- `task:updated` → patches the single task in state — no full re-fetch needed
- `task:deleted` → removes the task, closes panel if it was open

`activeTaskId` is read by the delete handler using a ref (`activeTaskIdRef`) rather than as a closure variable, so it doesn't need to be a dependency of the socket effect — which would cause all listeners to teardown and re-register every time a task is selected.

**`toggleHabit(habitId, date?)`**: calls `POST /api/habits/:id/complete`, then patches `habits` state directly based on the `{ completed, date }` response — no full re-fetch.

**`applyClaudeDiff(operations)`**: applies AI operations optimistically to local state. For `create_task` it calls `fetchAll()` since the server-generated UUID isn't known client-side.

### Pages and routing

| Path | Component | Guard |
|---|---|---|
| `/` | Landing | Public |
| `/login` | Login | PublicRoute |
| `/register` | Register | PublicRoute |
| `/dashboard` | Dashboard (TaskFlow) | ProtectedRoute |
| `/board/:boardId` | BoardPage (TaskFlow) | ProtectedRoute |
| `/os` | → redirect to `/os/week` | — |
| `/os/week` | PersonalOSPage | ProtectedRoute |
| `/os/boards` | BoardsPage | ProtectedRoute |
| `/os/today` | TodayPage | ProtectedRoute |

### Components

**`PersonalOSLayout`** — shell wrapping all three OS pages.
- Fixed header: logo, view-switcher tabs (Week / Boards / Today), CalDAV status dot.
- Status dot: green = synced, amber = not configured, red = last sync failed.
- Renders `{children}` in a scrollable main area.
- Mounts `<ClaudeBar />` fixed at page bottom.

**`WeekView`** — primary view at `/os/week`.
- `getWeekDates()` finds the Monday of the current week and returns 7 ISO date strings.
- `dateToDbDow()` converts an ISO date string to a DOW integer (Sunday=0) matching the `day_rules` table.
- 7 day columns. Today's column highlighted with a green border.
- Each column:
  - Day label + formatted date
  - Focus area badge (colour from `calendar_color` in day_rules)
  - `HoursBar` — width = `time_logged / (max_hours × 60)`, turns amber at ≥75%
  - `TaskPill` per assigned task, sorted by `scheduled_time` then `priority`. Click → `setActiveTask(id)`
  - `UberPill` pinned at column bottom if today's DOW is in the recurring task's `days_of_week`
- `TaskDetailPanel` rendered here (lazy-loaded via `React.lazy` — not bundled until first open).

**`KanbanBoard`** — `/os/boards`.
- 4 fixed columns: Backlog, This Week, In Progress, Done.
- Category filter bar. Filtered task count shown on the right.
- `@dnd-kit` setup:
  - `useSortable` on each `TaskCard` — provides `transform`, `transition`, `isDragging`.
  - `useDroppable` on each `Column` — highlights with green border when a card is dragged over it.
  - `onDragOver` — calls `updateTask(id, { status })` immediately for a real-time visual update while the user is still holding the card.
  - `onDragEnd` — fires `PATCH /api/tasks/:id`. On failure, calls `updateTask` again to revert the optimistic state.
  - `DragOverlay` — renders a semi-transparent floating copy of the card while it is in motion.

**`HabitsTracker`** — embedded in both Week and Today views.
- Groups habits into Faith / Body / Growth sections with colour-coded headers.
- 7 dot buttons per habit (Mon–Sun header). Today's dot has a glow ring.
- `calcStreak(completions)` — counts consecutive completed days backwards from today.
- Clicking a dot calls `toggleHabit(habitId, dateString)`.

**`TodayView`** — `/os/today`.
- Quick-add form: title input + category select → `POST /api/tasks` with `assigned_day = today`.
- Task list: `assigned_day === today` and `status !== done`, sorted by `scheduled_time` then `priority`.
- Recurring section: Uber tasks whose `days_of_week` includes today's DOW.
- Habit checklist: one checkbox per active habit, pre-ticked if today is in `completions[]`.

**`TaskDetailPanel`** — lazy-loaded slide-in panel (right side of screen).
- Mounts when `activeTaskId` is set. Unmounts on Escape key or backdrop click.
- An 800ms debounce ref (`saveTimeoutRef`) batches all field edits into a single `PATCH /api/tasks/:id` — no save button needed.
- Save state indicator in the header: `idle → saving… → saved`
- Sections:
  - **Header**: priority badge (click cycles 1→2→3→1), status dropdown, title.
  - **Last left off**: single-line context note.
  - **Next steps**: checklist. Checkbox → `PATCH /tasks/:id/next-steps/:stepIndex`. Enter adds a new step.
  - **Time tracking**: log minutes form + progress bar (time_logged vs duration_minutes).
  - **Notes**: textarea with a Preview toggle that renders markdown.
  - **Schedule**: assigned day date picker + scheduled time input.
  - **Activity log**: reverse-chronological list of `task_activity` entries.

**`ClaudeBar`** — fixed at the bottom of every OS page.
- `<textarea>`: Enter submits, Shift+Enter adds newline.
- While loading: spinner replaces button text, input is disabled.
- On success: `summary` shown as a green react-hot-toast. `refetch()` called to sync state.
- On warnings: yellow banner appears with Cancel or "Override & proceed". Proceeding re-submits the original message with `[override confirmed]` appended so the model knows the conflict was acknowledged.
- On error: `response.data.error` shown in a red toast.

---

## Data flow: end-to-end request

What happens when the user drags a task card from **This Week** to **In Progress**:

```
1. User releases card over the In Progress column

2. onDragEnd fires in KanbanBoard.tsx
   └─ updateTask(taskId, { status: 'in_progress' })   ← optimistic state update

3. api.patch('/tasks/${taskId}', { status: 'in_progress' })

4. Express — PATCH /api/tasks/:id
   ├─ authenticate middleware verifies JWT, attaches req.user.userId
   ├─ UPDATE tasks SET status='in_progress', updated_at=NOW()
   ├─ INSERT INTO task_activity … action='status_change'
   ├─ setImmediate(() => caldav.updateCalEvent(task))  ← async, non-blocking
   └─ io.to('user:${userId}').emit('task:updated', updatedTask)

5. 200 response → KanbanBoard confirms success

6. Socket.IO delivers 'task:updated' to all other open tabs
   └─ PersonalOSContext patches tasks[] in state           ← other tabs update live

7. CalDAV runs in next event-loop tick (setImmediate)
   └─ Updates iCloud calendar event, writes to caldav_sync_log
```

If step 3 fails (network error), `onDragEnd` calls `updateTask(taskId, { status: originalStatus })` to revert the optimistic update.

---

## Real-time updates

```
Tab A (user edits task)          Tab B (another open window)
        │                                  │
        │  PATCH /api/tasks/:id            │
        │─────────────────→ Express        │
        │                      │           │
        │                      io.to('user:xxx')
        │                      │  .emit('task:updated', task)
        │                      │──────────────────────────────→ │
        │                                PersonalOSContext       │
        │                                setTasks(prev.map patch)│
        │ ←─── 200 OK ─────────                                  │
```

Two event types:
- **`task:updated`** — lightweight, carries the changed task object. Used by individual task mutations.
- **`board:refresh`** — heavy, triggers `fetchAll()`. Used after AI operations where multiple entities may have changed in a single request.

---

## AI bar

The ClaudeBar accepts free-form natural language. Example inputs the model handles correctly:

```
"move the LMS build task to in progress and log 2 hours"
"add a next step to the Fiverr proposal: write the scope section"
"mark Fajr and morning adkar as done"
"create a career task: prep for Mercor interview, priority 1, this week"
"stop the Uber Eats task — I got the Outlier job"
"schedule gym for Wednesday at 6pm"
"move everything from backlog into this week"
```

The model has the user's full board state, all 7 day rules, and the life context in the system prompt. It enforces day rules itself — returning a `schedule_warning` instead of silently creating a conflict.

**Security model**: Model output is never executed as SQL. It returns operation names (strings from an 8-item allowlist) with typed parameters (UUIDs, status strings, field names). The server's `validateOp()` checks every field independently. Even a hallucinating model cannot write arbitrary SQL — it can only call the predefined typed handler functions.

---

## CalDAV / iCloud sync

**Setup**: generate an app-specific password at appleid.apple.com. Set the four `CALDAV_*` env vars.

**Optional**: if the vars are absent, `isConfigured()` returns false, all CalDAV functions return null immediately, and the header shows an amber dot. Everything else works identically.

**When configured**:
- Creating a task → `PUT` a VEVENT to the calendar collection URL
- Updating title, status, day, or time → `PUT` to the existing VEVENT URL (using `caldav_uid`)
- Deleting a task → `DELETE` the VEVENT (404 treated as success — idempotent)
- Every operation is logged to `caldav_sync_log` — the frontend polls `/api/caldav-status` every 30s to show the sync dot

---

## Testing

**Backend** — 48 tests, 6 suites:

| Suite | Coverage |
|---|---|
| `claude-update.test.js` | Operation schema validation, SQL injection resistance, allowlist enforcement, sanitize function |
| `caldav.test.js` | isConfigured, VEVENT format, retry logic, 401 non-retry behaviour |
| `habits.test.js` | Toggle logic, streak calculation |
| `recurring.test.js` | resolve idempotency (`condition_met=FALSE` guard in WHERE clause) |
| `integration/tasks.integration.test.js` | Full CRUD request/response with mocked DB and socket |
| `integration/claude-update.integration.test.js` | Groq mock, valid op execution order, schedule_warning passthrough, socket emit |

All suites mock the DB (`pg` pool) and Groq SDK — no real connections. Run with:
```bash
cd backend && npm test
```

**Frontend** — 28 tests, 4 suites:

| Suite | Coverage |
|---|---|
| `ClaudeBar.test.tsx` | Submit flow, loading state, success toast, warning banner, error toast, input clear |
| `TaskDetailPanel.test.tsx` | Panel open/close, Escape key, debounced field save, next-step toggle |
| `WeekView.test.tsx` | Week date calculation, 7-column render, today column highlight |
| `applyClaudeDiff.test.ts` | All 7 operation types applied correctly to context state |

Run with:
```bash
cd frontend && npx vitest run
```

---

## Local development

**Prerequisites**: Node.js 18+, a Neon (or any PostgreSQL) database.

```bash
# Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, REFRESH_SECRET, GROQ_API_KEY
npm install
npm run dev                 # nodemon, restarts on file change — http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # Vite HMR — http://localhost:5173
```

Navigate to `http://localhost:5173`, register an account. Default habits, day rules, and the Uber Eats recurring task are seeded automatically. Visit `/os/week` to start.

---

## Environment variables

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
JWT_SECRET=<random string, min 32 chars>
REFRESH_SECRET=<different random string, min 32 chars>
GROQ_API_KEY=gsk_...
CLIENT_URL=https://your-vercel-app.vercel.app
PORT=5000
NODE_ENV=production

# Optional — app works without these, amber dot shown instead of green
CALDAV_URL=https://caldav.icloud.com
CALDAV_USERNAME=your@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
CALDAV_CALENDAR_PATH=/dav/calendars/your@icloud.com/personal/
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=https://your-render-service.onrender.com
VITE_SOCKET_URL=https://your-render-service.onrender.com
```

---

## Deployment

Backend → **Render** (free tier) · Frontend → **Vercel**

**Render** (`render.yaml` is pre-configured):
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node src/server.js`
- Health check path: `/health`
- Set all env vars in the Render dashboard — never commit secrets

**Vercel** (`frontend/vercel.json` is pre-configured):
- Root directory: `frontend`
- Build: `npm run build` (tsc + vite build)
- Output: `dist/`
- SPA rewrite: all paths → `/index.html` (handles React Router client-side routes)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`

**Deployment order**:
1. Deploy backend on Render → copy the `.onrender.com` URL
2. On Vercel: set `VITE_API_URL` and `VITE_SOCKET_URL` to that URL, then deploy frontend
3. Copy the `.vercel.app` URL back into Render's `CLIENT_URL` env var and redeploy

The Neon database requires no separate deployment step — tables are created automatically on first boot via `initDB()`.
