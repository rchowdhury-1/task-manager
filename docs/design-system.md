# Personal OS — Design System

## Source
Claude Design URL: https://api.anthropic.com/v1/design/h/kvvXg5_4BkulYnT3SBcZ3Q
Imported: 2026-05-17
Last sync: 2026-05-17

## Pages Covered
- Landing (light + dark, desktop + mobile)
- Today (light + dark, desktop + mobile)
- Lists (light + dark, desktop + mobile) — NEW
- Boards (light, desktop + mobile)
- Stats (light + dark, desktop + mobile)
- Settings (mobile only)

## Token Mapping

### Light (:root)

| Token | Old | New |
|---|---|---|
| `--color-page` | `#FAFAFA` | `#F9F9FB` |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` |
| `--color-surface-raised` | `#F5F5F7` | `#F4F3F5` |
| `--color-border` | `#E5E5E7` | `#ECECEE` |
| `--color-text-primary` | `#1C1C1E` | `#0E0E10` |
| `--color-text-secondary` | `#6B6B70` | `#5F5E60` |
| `--color-text-tertiary` | `#98989F` | `#8E8E93` |
| `--color-accent` | `#DC2626` | `#B70011` |
| `--color-accent-hover` | `#B91C1C` | `#8E0011` |
| `--color-accent-muted` | `#FEE2E2` | `#FCEEEC` |

### Dark (.dark)

| Token | Old | New |
|---|---|---|
| `--color-page` | `#0F0F10` | `#0A0A0B` |
| `--color-surface` | `#1C1C1E` | `#131316` |
| `--color-surface-raised` | `#2C2C2E` | `#1A1A1D` |
| `--color-border` | `#2E2E32` | `#26262A` |
| `--color-text-primary` | `#F5F5F7` | `#F4F4F6` |
| `--color-text-secondary` | `#98989F` | `#A1A1A6` |
| `--color-text-tertiary` | `#6B6B70` | `#74747A` |
| `--color-accent` | `#EF4444` | `#FF3B4D` |
| `--color-accent-hover` | `#DC2626` | `#C81325` |
| `--color-accent-muted` | `#3A1F1F` | `#2A0F12` |

### New Tokens (both themes)

- `--color-surface-hi` — elevated surface
- `--color-border-strong` — stronger borders
- `--color-ink-1`, `--color-ink-4` — extended ink scale
- `--color-crimson-soft`, `--color-crimson-line` — soft crimson variants
- 6 tag color pairs: blue, rose, green, amber, violet, slate (fg + bg)
- 7 radii: `--r-xs` (4px) through `--r-pill` (999px)
- 4 shadows: `--shadow-1` through `--shadow-pop`

## Typography

| Role | Font | Weights | CSS Variable |
|---|---|---|---|
| Display/editorial headings | Instrument Serif | 400 (normal + italic) | `--font-display` |
| Body/UI | Inter Tight | 400, 500, 600, 700 | `--font-sans` |
| Monospace/kbd | JetBrains Mono | 400, 500 | `--font-mono` |

Configured via `next/font/google` in `app/layout.tsx`.
Tailwind classes: `font-display`, `font-sans`, `font-mono`.

### Letter spacing
- `tracking-tight`: -0.022em
- `tracking-tighter`: -0.035em
- `tracking-display`: -0.045em

## Animation Primitives

Defined in `lib/animations.ts` (Framer Motion variants):
- `fadeIn` — 0.3s ease-out
- `fadeInUp` — 0.3s ease-out, 8px translate
- `staggerChildren` — 50ms gap
- `scaleIn` — 0.2s ease-out, scale 0.97→1
- `slideInRight` — 0.25s ease-out, translateX 100%→0

Not applied to any component yet — infrastructure only.

## Categories Architecture

- `categories` table in PostgreSQL (Drizzle ORM)
- 6 system categories seeded per user on creation:
  career (blue/briefcase), lms (violet/book), freelance (amber/code),
  learning (green/layers), uber (slate/truck), faith (rose/heart)
- Users can add custom categories via `/api/v1/categories`
- `Task.category` enum column remains for now (transition in Phase 4)
- `CategoryRecord` type added alongside existing `Category` string union

## API Endpoints

- `GET /api/v1/categories` — list user's categories
- `POST /api/v1/categories` — create custom category
- `PATCH /api/v1/categories/:id` — update category
- `DELETE /api/v1/categories/:id` — delete (blocked for system categories)

## Out of Scope for Phase 2

- Page redesigns (Phase 3-6)
- Category UI in Lists (Phase 4)
- Landing page (Phase 8)
- Animation application to components
