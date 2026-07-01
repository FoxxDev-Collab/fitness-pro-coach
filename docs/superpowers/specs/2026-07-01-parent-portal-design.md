# Parent Portal (Phase 2A) — Design

**Date:** 2026-07-01
**Status:** Approved for implementation planning
**Scope:** A read-only, passwordless parent portal with per-season team join codes, plus app-wide PWA installability. First sub-project of Phase 2.

Builds on the Phase 1 Race Results engine (`docs/superpowers/specs/2026-07-01-race-results-pr-engine-design.md`). Later Phase 2 sub-projects (athlete portal, sharing/privacy + public rankings, messaging) reuse this foundation.

---

## 1. Goal & context

Parents of cross-country athletes need to see the schedule (meets, bus times, what to bring) and their own runner's results/PRs — on their phone, ideally as an installed app. Today parents exist only as denormalized fields on `Athlete` (`parentName/parentEmail/parentPhone`) with no login.

This sub-project adds a **`PARENT` role**, a **passwordless magic-link login** gated by a **per-season team join code**, a **read-only `(parent)` area**, and **PWA installability** for the whole app.

**Existing foundation reused:** NextAuth v5 (JWT, credentials provider) in `lib/auth.ts`; role helpers in `lib/auth-utils.ts`; the invite/token pattern in `lib/actions/invites.ts`; Resend email in `lib/email.ts`; route protection in `middleware.ts`; rate limiting in `lib/rate-limit.ts`; the `(client)` route group as the portal template; and the Phase 1 results engine/components.

---

## 2. Scope

### In scope
- `Role` gains `PARENT`.
- Per-season **`Team.joinCode`** (unique, auto-generated; rollover mints a fresh one).
- **Magic-link auth**: a passwordless NextAuth Credentials provider consuming a one-time `ParentMagicToken`.
- **Join flow**: `/join/{code}` (first time: code + email) and `/parent/login` (returning: email only). Generic responses (no roster leak). Unmatched attempts logged as `ParentJoinRequest` and surfaced to the coach.
- **`(parent)` read-only area**: schedule, their kid's results/PRs (reusing Phase 1 components), aggregate team meet scores (never other individuals' times), announcements feed, multiple-kids switcher.
- **Linking by email-match**: a parent sees athletes where `parentEmail == login email`.
- **Coach-side**: show the season join code + copy-link + "Email all parents" action + pending `ParentJoinRequest` list on the team page.
- **PWA**: web manifest, service worker (app-shell cache), iOS meta/icons, and an "Install app" button (prominent in the parent portal, subtle elsewhere).

### Explicitly deferred
- **Athlete portal** (Phase 2B) — reuses this portal shell + the `athleteProfile` scaffold.
- **Sharing/privacy controls + public rankings** (Phase 2C).
- **Messaging / message board** (Phase 2D).
- **Multi-guardian / manual linking** — a v2 upgrade from email-match to an explicit `Guardian` join table.
- RSVP/attendance, volunteer signups, parent-editable contact info.

---

## 3. Data model (Prisma additions)

```prisma
enum Role { ADMIN COACH CLIENT PARENT }   // add PARENT

// Team gains:
//   joinCode          String?             @unique
//   parentJoinRequests ParentJoinRequest[]

model ParentMagicToken {
  id        String   @id @default(cuid())
  email     String
  teamId    String?          // team context for first-time joins
  token     String   @unique
  expires   DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([token])
  @@index([email])
}

model ParentJoinRequest {
  id         String    @id @default(cuid())
  teamId     String
  email      String
  createdAt  DateTime  @default(now())
  resolvedAt DateTime?

  team       Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@index([teamId])
}
```

A `PARENT` `User` needs no extra columns — the email is the link. `joinCode` generation: an 8-char uppercase base32 (crypto-random, ambiguity-free alphabet), generated on team create and on rollover.

---

## 4. Auth flow (magic link + join code)

**Provider** (`lib/auth.ts`): add a second Credentials provider `parent-magic-link` whose `authorize({ token })`:
1. Finds an unused, unexpired `ParentMagicToken` by `token`; else returns null.
2. Marks it `used`.
3. `findOrCreate` a `User` with that email, `role: PARENT`, `active: true`.
4. Returns `{ id, email, role: "PARENT" }` → NextAuth issues a JWT session.

**Session type** (`types/next-auth.d.ts`): role already includes portal roles; ensure `PARENT` is handled.

**Middleware** (`middleware.ts`): `PARENT` users are allowed only under `/parent` and `/join`; other authed areas redirect to `/parent`; unauthed access to `/parent/*` redirects to `/parent/login`.

**Issue flows (server actions, rate-limited via `rate-limit.ts`):**
- `requestParentLink(code, email)` — find team by `joinCode`. If a matching active athlete on that team has `parentEmail == email` (case-insensitive), create a `ParentMagicToken{ email, teamId }` and email `/parent/verify/{token}`. If no match, create a `ParentJoinRequest{ teamId, email }`. **Always** return the same generic result.
- `requestParentLoginLink(email)` — for returning parents: if a `PARENT` user exists with that email OR any athlete has `parentEmail == email`, send a token. Generic result. Rate-limited.

**Verify page** `/parent/verify/[token]` — client calls `signIn("parent-magic-link", { token })` → on success redirect to `/parent`; on failure show "link expired — request a new one."

**Token policy:** 30-minute expiry, single-use, one active token per email (expire prior unused on new request), like `inviteClient`.

---

## 5. Linking (email-match, no join table)

A parent's linked athletes = `Athlete` where `parentEmail == session.user.email` (trimmed, case-insensitive) and `active`. Grouped by team. Rationale: leverages existing data, links auto-follow email edits, no migration. Limitation (accepted for v1): one `parentEmail` per athlete; multi-guardian is the Phase-2 `Guardian`-table upgrade.

---

## 6. Route structure

```
app/(parent)/
  layout.tsx            // parent shell: header, kid switcher, install button, sign out
  parent/
    page.tsx            // dashboard: schedule + selected kid's results + team scores + announcements
    login/page.tsx      // returning-parent email entry
    verify/[token]/page.tsx  // consumes magic link → signIn
app/join/[code]/page.tsx // first-time: code prefilled, email entry
```

(Route-group folder `(parent)` keeps URLs at `/parent`, mirroring `(client)`.)

---

## 7. Parent portal views (read-only)

`getParentDashboard()` (server, scoped to session email) returns, per linked athlete: team, upcoming + past events, the athlete's own `RaceResult`s (+ splits), and — computed **server-side** — aggregate team scores per meet (so other kids' individual values never reach the client), plus the team's announcements.

Components (new, in `app/(parent)/parent/`), reusing Phase 1 where possible:
- **KidSwitcher** — dropdown when a parent has >1 athlete.
- **ParentSchedule** — upcoming/past events with details (read-only render of the same event shape).
- **ParentResults** — the athlete's PRs + `ResultTrendChart` (reused from Phase 1) + per-meet results.
- **ParentTeamScores** — aggregate meet scores (team score, place, pack time) via the Phase 1 scoring engine.
- **ParentAnnouncements** — read-only list.

**Privacy invariant:** the only individual athlete data sent to a parent's client is their own kid's. Everything team-level is aggregate.

---

## 8. Coach-side additions

On the team page (`app/(coach)/teams/[id]`): a **"Parent Access"** card showing the season **join code**, a **Copy join link** button (`/join/{code}`), an **"Email all parents"** action (sends the join link to every distinct `parentEmail` on the roster, rate-limited), and a **pending requests** list (unresolved `ParentJoinRequest`s) with a **"Fix / add email"** shortcut to the athlete. Server actions: `getTeamJoinInfo`, `regenerateJoinCode`, `emailAllParents`, `getParentJoinRequests`, `resolveJoinRequest`.

---

## 9. PWA (app-wide installability)

- **`app/manifest.ts`** (`MetadataRoute.Manifest`): `name: "Praevio"`, `short_name: "Praevio"`, `start_url: "/"`, `display: "standalone"`, theme/background colors from the design tokens, and `icons` (192, 512, plus a maskable 512).
- **Icons**: add `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png` (generated from the existing brand mark / favicon).
- **Service worker**: `public/sw.js` — minimal app-shell cache, network-first for navigations, cache-first for static assets; registered by a `components/pwa/service-worker-register.tsx` client component mounted in the root layout.
- **iOS meta** (root `layout.tsx` metadata): `appleWebApp` capable + `apple-touch-icon` + `themeColor`.
- **Install affordance**: `components/pwa/install-app-button.tsx` — captures `beforeinstallprompt`, shows an "Install app" button; on iOS (no event) shows "Add to Home Screen" instructions. Rendered prominently in the parent shell, subtly (e.g. settings) elsewhere.

---

## 10. Security & privacy

- Magic links go only to the address on file (the real inbox) — the join code never grants access by itself.
- Generic join/login responses avoid roster enumeration.
- Rate-limit all link-request actions by IP + email (`rate-limit.ts`).
- Parent reads are scoped strictly by `session.user.email`; server never returns other athletes' individual data.
- Tokens: single-use, 30-min expiry, prior unused expired on reissue.
- Middleware forbids `PARENT` sessions from coach/client/admin areas.
- **Email collision:** if the login email already belongs to a non-`PARENT` `User` (coach/client/admin), the magic-link flow does **not** create or hijack that account. `authorize` returns null and the verify page shows "This email already has an account — sign in normally." (Email is unique on `User`; a person who is both a coach and a parent uses their coach login. Cross-role portal access is out of scope for v1.)

---

## 11. Error handling

- Invalid/expired/used token → verify page shows "link expired — request a new one" with a link to `/parent/login`.
- Unknown/So-such join code → generic "check the code with your coach."
- No linked athletes after login (e.g. coach removed the athlete) → friendly empty state.
- Email send failure → surfaced to the parent as "couldn't send — try again," logged server-side.

---

## 12. Testing

- **Unit** (vitest, pure logic): join-code generation shape/uniqueness helper; token expiry/used validation; email-match athlete selection (given roster + email → correct athletes, case/trim handling); generic-response contract (matched vs unmatched both return identical shape).
- **Manual**: full join → magic link → dashboard; multi-kid switch; expired-link path; install flow on Android + iOS; middleware role isolation.
- Phase 1 results engine/components already unit-tested.

---

## 13. Build sequence (for the plan)

1. Schema: `Role` += `PARENT`, `Team.joinCode`, `ParentMagicToken`, `ParentJoinRequest` + migration; backfill `joinCode` for existing teams.
2. Token + email-match helpers in `lib/parent/` (pure) + unit tests.
3. Magic-link Credentials provider + session/middleware handling.
4. Join/login/verify server actions (rate-limited) + `sendParentMagicLinkEmail` in `lib/email.ts`.
5. `/join/[code]`, `/parent/login`, `/parent/verify/[token]` pages.
6. `getParentDashboard` + `(parent)` shell and views (reuse Phase 1 components).
7. Coach-side "Parent Access" card + actions.
8. PWA: manifest, icons, service worker + registration, install button, iOS meta.
9. Verification pass (mobile viewport + install).

---

## 14. Decisions on record

| Decision | Choice |
|---|---|
| Login | Passwordless **magic link** (Credentials provider consuming one-time token) |
| Access gate | Per-season **team join code** + email-match to roster |
| Parent↔athlete link | **Email-match** (`parentEmail`), no join table (v2 upgrade later) |
| Portal scope | Schedule, own kid's results/PRs, aggregate team scores, announcements, multi-kid switcher — **read-only** |
| Privacy | Per-family: only own kid's individual data leaves the server |
| Unmatched join | Generic response **+ log `ParentJoinRequest`** surfaced to coach |
| PWA | **Whole app installable**; install button prominent in parent portal |
| Deferred | Athlete portal, sharing/public rankings, messaging, multi-guardian |
