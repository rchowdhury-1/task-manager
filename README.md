# TaskFlow — Real-Time Collaborative Kanban

A production-grade, full-stack Kanban board where multiple users collaborate on shared boards in real-time. Changes sync instantly across every connected client via WebSockets.

**Live Demo:** _[Add your deployment URL here]_

---

## Features

- **Real-time collaboration** — Task creates, edits, moves, and deletes sync live to all board members via Socket.IO
- **Live user cursors** — See where other collaborators are hovering, with name labels (throttled to 50ms)
- **Activity feed** — Live stream of every action on the board, persisted to DB and loaded on open
- **Kanban board** — Drag-and-drop between columns using @dnd-kit with smooth animations
- **Task management** — Priority levels, assignees, due dates, descriptions — all editable inline via slide-over panel
- **"X is editing..." indicator** — See when another user is actively editing the same task
- **Board invites** — Generate 8-character invite codes; share and join boards instantly
- **JWT authentication** — Stateless auth with 7-day token lifetime; validated on every app load
- **Optimistic updates** — UI responds immediately; rolls back on server error
- **Dark theme** — Carefully crafted slate-based palette with indigo accents

---

## Architecture Decisions

**Why Zustand?** Zero-boilerplate, selector-based subscriptions, and tiny bundle footprint. Stores are plain objects with actions — easy to reason about.

**Why Socket.IO rooms?** Each board becomes a `board:<id>` room. The server never broadcasts to users who aren't on that board — scalable without application-level filtering.

**Why optimistic updates?** The UI updates immediately on user action, and the server confirms or rolls back. This makes the app feel instantaneous even under poor network conditions.

**Why PostgreSQL?** Relational integrity between users, boards, tasks, and activity logs is load-bearing. UUIDs via `pgcrypto` avoid auto-increment collisions in distributed scenarios.

---

## Tech Stack

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL (Neon) |
| Auth | JWT + Refresh Tokens + httpOnly Cookies |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| Deploy | Vercel (frontend) + Render (backend) |

## Features

- **Real-time** — every card move, creation, update, deletion, and comment syncs instantly via Socket.io
- **Drag & Drop** — smooth kanban with @dnd-kit, supporting cross-column card movement
- **JWT Auth** — access token (15m) + refresh token (7d) with httpOnly cookie, Axios interceptor auto-refreshes
- **Multi-workspace** — organize boards into workspaces with owner/admin/member roles
- **Card details** — title, description, due date, priority, assignee, real-time comments
- **Dark emerald theme** — consistent design system with CSS custom properties

## Project Structure

```
task-manager/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # PostgreSQL + schema init
│   │   ├── middleware/auth.js    # JWT middleware
│   │   ├── routes/               # auth, workspaces, boards, columns, cards, comments, dashboard
│   │   └── socket/handlers.js   # Socket.io room management + events
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/axios.ts          # Axios + token refresh interceptor
│       ├── contexts/             # AuthContext, SocketContext
│       ├── pages/                # Landing, Login, Register, Dashboard, BoardPage, WorkspaceSettings
│       ├── components/
│       │   ├── Board/            # KanbanBoard (DnD container)
│       │   ├── Column/           # ColumnComponent (droppable)
│       │   ├── Card/             # CardItem (draggable), CardModal
│       │   ├── Layout/           # Navbar
│       │   └── UI/               # Button, Modal
│       └── types/index.ts
├── render.yaml                   # Render deployment config
└── README.md
```

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon free tier: neon.tech)

### 1. Clone and setup

```bash
cd task-manager
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
# VITE_SOCKET_URL=http://localhost:5000
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=<random 32+ char string>
REFRESH_SECRET=<different random 32+ char string>
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Deployment

### Backend → Render

1. Push to GitHub
2. Create new Web Service on Render, point to `backend/` directory
3. Or use the included `render.yaml` for automatic configuration
4. Add environment variables in Render dashboard

### Frontend → Vercel

1. Import the `frontend/` directory to Vercel
2. Add environment variables:
   - `VITE_API_URL` → your Render backend URL
   - `VITE_SOCKET_URL` → same Render backend URL
3. Vercel auto-detects Vite; `vercel.json` handles React Router rewrites

## Database Schema

```sql
users            -- id, name, email, password_hash, avatar_color
workspaces       -- id, name, owner_id
workspace_members-- id, workspace_id, user_id, role
boards           -- id, workspace_id, name, color
columns          -- id, board_id, title, position
cards            -- id, column_id, title, description, position, due_date, assigned_to, priority
card_comments    -- id, card_id, user_id, content
activity_log     -- id, board_id, user_id, action
refresh_tokens   -- id, token, user_id
```

Schema auto-initializes on first backend startup.

## API Routes

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

GET    /workspaces
POST   /workspaces
DELETE /workspaces/:id
POST   /workspaces/:id/invite
GET    /workspaces/:id/members
DELETE /workspaces/:id/members/:userId

GET    /boards
POST   /boards
GET    /boards/:id
PUT    /boards/:id
DELETE /boards/:id

GET    /columns?boardId=
POST   /columns
PUT    /columns/reorder
PUT    /columns/:id
DELETE /columns/:id

GET    /cards?boardId= OR ?columnId=
POST   /cards
PUT    /cards/reorder
PUT    /cards/:id
DELETE /cards/:id

GET    /comments?cardId=
POST   /comments
DELETE /comments/:id

GET    /dashboard/stats
```

## Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| `join-board` | client→server | boardId |
| `leave-board` | client→server | boardId |
| `card-moved` | both | { boardId, cardId, fromColumn, toColumn, cards } |
| `card-created` | both | { boardId, card } |
| `card-updated` | both | { boardId, card } |
| `card-deleted` | both | { boardId, cardId } |
| `column-created` | both | { boardId, column } |
| `column-updated` | both | { boardId, column } |
| `column-deleted` | both | { boardId, columnId } |
| `comment-created` | both | { boardId, cardId, comment } |
| `comment-deleted` | both | { boardId, cardId, commentId } |
