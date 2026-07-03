# Unified Portal (parent + athlete) — Implementation Plan

**Date:** 2026-07-03
**Spec:** `docs/superpowers/specs/2026-07-01-parent-portal-design.md`
**Delta:** This plan unifies the spec's Phase-2A parent portal and deferred Phase-2B athlete portal into **one portal**, per decision "parent and athlete portal can be the same."

## Decisions (this build)
- **Naming:** neutral `PORTAL` — role `PORTAL`, route group `(portal)` at `/portal`, join at `/join/{code}`. (Not `PARENT`/`/parent` as the spec wrote.)
- **PWA:** included in this build (manifest, icons, service worker, install button, iOS meta).
- **Unification mechanism:** a portal login email resolves to athletes where `parentEmail == email` **OR** `athlete.email == email` (both trimmed, case-insensitive, `active` only). No new link table — the schema already has both `Athlete.email` and `Athlete.parentEmail`. A parent sees their kid(s); an athlete sees themselves. Same read-only dashboard for both.

## Naming map vs spec
| Spec | This build |
|---|---|
| role `PARENT` | role `PORTAL` |
| `(parent)` / `/parent` | `(portal)` / `/portal` |
| `ParentMagicToken` | `PortalMagicToken` |
| `ParentJoinRequest` | `PortalJoinRequest` |
| `requestParentLink` / `requestParentLoginLink` | `requestPortalLink` / `requestPortalLoginLink` |
| `getParentDashboard` | `getPortalDashboard` |

## Build sequence
1. **Schema** — `Role += PORTAL`; `Team.joinCode String? @unique`; models `PortalMagicToken`, `PortalJoinRequest`; migration `add_portal_access`; backfill `joinCode` for existing teams.
2. **Pure helpers** `lib/portal/` — `code.ts` (8-char base32 crypto gen), `token.ts` (expiry/used validation), `linking.ts` (email→athletes selection). Vitest unit tests for each.
3. **Auth** — `portal-magic-link` Credentials provider in `lib/auth.ts` (consumes one-time `PortalMagicToken`, findOrCreate `User{role:PORTAL}`, refuses to hijack an existing non-PORTAL user). Extend `EffectiveSession` role union + `auth-utils` (`requirePortal`, `getPortalEmail`). Middleware: PORTAL confined to `/portal` + `/join`.
3b. `types/next-auth.d.ts` already uses `role: string` — no change needed.
4. **Server actions** `lib/actions/portal.ts` — `requestPortalLink(code,email)`, `requestPortalLoginLink(email)`; generic responses; rate-limited; unmatched → `PortalJoinRequest`. `sendPortalMagicLinkEmail` in `lib/email.ts` (escaped).
5. **Auth pages** — `app/join/[code]/page.tsx`, `app/(portal)/portal/login/page.tsx`, `app/(portal)/portal/verify/[token]/page.tsx`.
6. **Dashboard** — `getPortalDashboard()` (server, scoped to session email; per athlete: team, upcoming/past events, own `MetricEntry` results + splits + PRs via `lib/results/records`, aggregate team scores via `lib/results/scoring`, announcements). `(portal)` shell layout + views: `AthleteSwitcher`, `PortalSchedule`, `PortalResults` (reuse `result-trend-chart`, `split-breakdown`), `PortalTeamScores`, `PortalAnnouncements`. **Privacy invariant:** only the viewer's own athlete individual data leaves the server; everything team-level is aggregate.
7. **Coach-side** — "Portal Access" card on `app/(coach)/teams/[id]`: join code, copy `/join/{code}`, "Email all" (distinct parentEmail + athlete.email on roster), pending `PortalJoinRequest` list w/ fix-email shortcut. Actions in `lib/actions/portal.ts` (coach-scoped): `getTeamJoinInfo`, `regenerateJoinCode`, `emailAllPortal`, `getPortalJoinRequests`, `resolveJoinRequest`.
8. **PWA** — `app/manifest.ts`, `public/icon-{192,512,maskable-512}.png` + `apple-touch-icon.png`, `public/sw.js` (app-shell cache), `components/pwa/service-worker-register.tsx` (mounted in root layout), `components/pwa/install-app-button.tsx` (prominent in portal shell), iOS meta in root layout.
9. **Verify** — tsc/lint/vitest/build green + Playwright mobile-viewport walkthrough.

## Security invariants (unchanged from spec §10)
Magic links only to the on-file address; generic join/login responses; rate-limit all link requests; reads scoped by `session.user.email`; single-use 30-min tokens, prior unused expired on reissue; middleware role isolation; never hijack a non-PORTAL account (verify page tells them to sign in normally).
