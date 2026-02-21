# Cliniko Companion — Patient Portal + Practitioner Timeline Extension

**Live demo:** [Patient Portal](https://cliniko-patient-portal-cge6.vercel.app/demo/home) · [Practitioner Timeline](https://cliniko-practitioner-extension.vercel.app/patients/pat_123/timeline)

Cliniko Companion is a lightweight, first-party-quality extension concept that improves Cliniko by reducing admin follow-ups and increasing patient completion (forms, uploads, telehealth attendance, payments).

- `apps/patient-portal`: loginless magic-link patient PWA.
- `apps/practitioner-extension`: Cliniko-launched patient timeline extension.
- `apps/bff`: secure backend-for-frontend for session exchange and API proxying.
- `packages/*`: shared client, cache keys/invalidation, forms, auth, UI, and utilities.

## Why This Improves Cliniko

- Builds on Cliniko’s forms model with richer portal continuity (home, forms, billing, telehealth hub, uploads).
- Uses Cliniko custom patient button flow (`/entry?patient_id=...`) for low-friction practitioner deep linking.
- Preserves telehealth-link caching realities by treating links as fetchable/cachable route data.
- Adds consistent cache invalidation and optimistic workflows for high-frequency clinic actions.
- Keeps security posture explicit with short-lived sessions, CSP, audit events, and server-side API boundaries.

**What this adds in real clinics:** Fewer admin touches (patients self-complete intake, upload docs, pay invoices in one place). Higher follow-through via a single “Next steps” portal. Faster clinician workflow via an embedded patient timeline from Cliniko. More consistent support outcomes with fewer “where is the form / link / invoice?” tickets.

## What You Get (Features)

**Patient Portal (PWA)** — Magic-link entry (no account creation). Dashboard: upcoming appointment, pending forms, outstanding invoices, join telehealth. Dynamic intake forms: multi-step, schema validation, autosave drafts (survive refresh/tab close). Attachment uploads (docs/photos) with progress and confirmation. Billing: invoices list, invoice detail, “pay now” (demo can mock payment provider).

![Patient Portal](docs/images/Cliniko%20Companion%20Portal.png)

**Practitioner Extension** — Opens from Cliniko using a custom patient button. Single “Patient Timeline” view: appointments, form submissions, attachments, invoice/payment status; filters and fast scrolling (virtualized). Quick actions: send intake link (template → send), request payment link (invoice → send), upload attachment on behalf of patient, copy telehealth link.

![Practitioner Extension](docs/images/Cliniko%20Companion%20Practitioner%20Extension.png)

**BFF** — Exchanges magic-link token → session. Proxies Cliniko REST API calls securely (no API keys in the browser). Optional audit event log for debugging and support.

## Workspace

```text
cliniko-companion/
  apps/
    patient-portal/
    practitioner-extension/
    bff/
  packages/
    ui/
    cliniko-api/
    auth/
    cache/
    forms/
    utils/
    config/
  docs/
    architecture.md
    api-contracts.md
    cache-invalidation.md
    threat-model.md
    runbooks.md
```

**Data flow (high level)** — Browser apps never talk to Cliniko directly. They call BFF endpoints. The BFF authenticates and proxies requests to the Cliniko API. React Router loaders prefetch queries into TanStack Query cache. Mutations trigger centralized invalidation helpers in `packages/cache`.

## Tech Stack

**Frontend:** React + TypeScript, React Router (data routers: loaders/actions), TanStack Query (cache + invalidation + prefetch), React Hook Form + Zod (schema validation), virtualization for timeline feed and lists.

**Backend:** Node.js BFF (minimal). Optional persistence: PostgreSQL for audit/session storage beyond in-memory.

**Testing:** Unit/integration: Vitest + React Testing Library. Browser tests: Playwright (E2E).

## Getting Started (Local)

**Prerequisites:** Node.js 20+, pnpm 9+. Optional: Docker if you add a local DB for sessions/audit.

```bash
pnpm install
pnpm dev
```

This starts:

- **Patient Portal:** http://localhost:5173
- **Practitioner Extension:** http://localhost:5174
- **BFF:** http://localhost:4000 (default; set `PORT` to override)

**Run apps individually:**

```bash
pnpm --filter @cliniko-companion/patient-portal dev
pnpm --filter @cliniko-companion/practitioner-extension dev
pnpm --filter @cliniko-companion/bff dev
```

**Build:** `pnpm build`

## Environment Variables

**`apps/bff/.env`** (or process env):

- `PORT` — BFF port (default `4000`)
- `PORTAL_SESSION_SECRET` — change in production
- `MAGIC_LINK_TTL_SECONDS` — e.g. `900`
- `CLINIKO_API_BASE_URL` — e.g. `https://api.cliniko.com/v1`
- `CLINIKO_API_KEY` — server-side only; never exposed to the browser
- `BFF_BASE_URL` — public BFF URL when frontends call it
- `S3_UPLOAD_REDIRECT_ALLOWLIST` — optional, for attachment redirects

**Frontend apps** (optional, when wired to BFF): set `VITE_BFF_BASE_URL=http://localhost:4000` in `apps/patient-portal/.env` and `apps/practitioner-extension/.env`.

## Scripts

- `pnpm lint` — Lint workspace
- `pnpm typecheck` — Type-check workspace
- `pnpm test` — Unit/integration tests
- `pnpm test:e2e` — Playwright E2E tests

## Routing + Data Loading

**Patient portal (examples):** `/:tenantSlug/entry` — exchanges magic-link token and creates session. `/:tenantSlug/home` — loader prefetches upcoming appointments, invoice summary, pending forms. `/:tenantSlug/forms/:formId/fill` — dynamic form renderer and autosave draft. `/:tenantSlug/uploads` — upload attachment flow (presign → upload → confirm).

**Practitioner extension (examples):** `/entry?patient_id=...` — validates input, prefetches timeline and summary. `/patients/:patientId/timeline` — virtualized feed and quick actions.

## Cache Strategy (TanStack Query)

All query keys and invalidation rules live in `packages/cache` (single source of truth). This prevents “invalidate everything” patterns, keeps cache invalidation reviewable and testable, and avoids scattered cache logic across components.

**Example invalidation rules:** Upload attachment → invalidate attachments, timeline, and patient summary. Submit form → invalidate forms and timeline, clear local draft. Send payment link → invalidate invoices, invoice summary, and timeline.

See `packages/cache/src/keys.ts` and `packages/cache/src/invalidation.ts`.

## Security Notes

Aligned with Cliniko’s priorities: Cliniko API keys never enter browser code (BFF only). Magic links are short-lived; sessions are scoped and revocable. Input validation is enforced at BFF boundaries. Recommended hardening: CSP (Content Security Policy), rate limiting, audit logs for mutations. See `docs/threat-model.md`.

## Demo

**Recommended demo story (~6 minutes):** Patient receives portal link → opens dashboard. Patient completes intake form (autosave shown) → submits. Patient uploads referral letter/photo. Patient joins telehealth from portal. Patient pays invoice (or sees status update). Staff opens patient timeline from Cliniko → sees everything and triggers quick actions.

**Demo data:** The repo includes simple seeding so you can demonstrate one telehealth appointment, one pending intake form, one outstanding invoice, and one upload-ready attachment workflow.

## Testing

**Unit/integration:** `pnpm test`

**Playwright E2E:** `pnpm test:e2e`

E2E journeys covered: **Patient** — entry → home → fill form → upload → billing. **Practitioner** — entry → timeline → send intake → upload attachment.

## Roadmap

- Add “request reschedule” flow (non-destructive, request-based)
- Add offline queue for drafts/uploads (careful with PHI)
- Add patient communication preferences
- Add richer timeline filters and search
- Optional: webhook-driven freshness (if available)

## Contributing

This repo is structured for clarity and reviewability. Prefer small PRs. Keep cache rules in `packages/cache`. Avoid “fetch in components” when route loaders can own data. Add tests for every new journey.
