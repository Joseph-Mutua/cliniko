# Architecture

## Monorepo

- Tooling: `pnpm` workspaces + Turborepo.
- Runtime split:
  - `apps/patient-portal`: patient-facing PWA and magic-link routes.
  - `apps/practitioner-extension`: clinician-facing timeline UX launched from Cliniko button params.
  - `apps/bff`: secure server gateway for session mint/exchange, proxy endpoints, and audit.

## Frontend Strategy

- React + TypeScript.
- React Router data routers for loader/action boundaries.
- TanStack Query for cache/prefetch/invalidation.
- React Hook Form + Zod for form validation and draft persistence.
- Virtualized timeline/list rendering for dense data views.
- Browser APIs used intentionally:
  - `localStorage` and `sessionStorage` for drafts and short-lived session context.
  - `BroadcastChannel` for cross-tab sync.
  - Visibility API for focus-driven revalidation.

## Backend Strategy

- BFF owns secrets and session exchange.
- No Cliniko API keys in browser.
- Attachment flow represented with presign + confirm endpoints.
- Security defaults:
  - CSP via Helmet.
  - Cookie-backed session.
  - Structured audit events.
