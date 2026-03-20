# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build` (runs `prisma generate && next build`)
- **Lint:** `npm run lint`
- **DB push schema:** `npm run db:push`
- **DB seed:** `npm run db:seed`
- **DB GUI:** `npm run db:studio`

## Tech Stack

- Next.js 16 (App Router) with React 19, TypeScript, Tailwind CSS v4
- PostgreSQL via Prisma ORM with the `@prisma/adapter-pg` driver adapter
- UI: Radix UI primitives + shadcn/ui components (in `components/ui/`)
- Deployed on Vercel (primary deployment platform — use Vercel conventions, environment variables, and edge-compatible patterns)

## Architecture

**Fitness coaching app** — a coach manages clients, builds exercise programs, assigns them to clients, and logs workout sessions.

### Data flow

Server Actions in `lib/actions/` are the primary data mutation layer (not API routes). Each domain has its own action file: `exercises.ts`, `clients.ts`, `programs.ts`, `assignments.ts`, `sessions.ts`, `measurements.ts`. The Prisma client singleton lives in `lib/db.ts`.

Two API routes exist at `app/api/programs/route.ts` and `app/api/clients/route.ts` — these are secondary to the server actions.

### Key domain concept: Assignments

When a program is assigned to a client, the program's workouts/exercises are **copied** into `Assignment` → `AssignmentWorkout` → `AssignmentWorkoutExercise` records. This snapshot approach means editing the original program doesn't affect already-assigned copies.

### Session tracking

Live workout sessions use the route `app/session/[assignmentId]/[workoutIndex]/` with a client component (`live-session.tsx`) that tracks sets, reps, and weights in real-time, then saves via server actions to `SessionLog` → `SessionExercise` → `SessionSet`.

### Component patterns

- Page-level components are in `app/` route directories (Server Components by default)
- Interactive client components colocated with their routes (e.g., `delete-button.tsx`, `exercise-filters.tsx`, `live-session.tsx`)
- Shared UI primitives in `components/ui/`, domain dialogs in `components/` root

### Database

PostgreSQL with Prisma. Schema at `prisma/schema.prisma`. Uses cuid IDs, cascade deletes throughout, and `@@index` on all foreign keys.

### Environment

Requires `DATABASE_URL` env var pointing to PostgreSQL.
