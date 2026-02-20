# Cliniko Companion

`cliniko-companion` is a monorepo for a first-party-quality Cliniko extension:

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

## Workspace

```text
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

## Quick Start

```bash
pnpm install
pnpm dev
```

Useful scripts:

- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

## Environment Variables

Set in `apps/bff/.env` (or process env):

- `BFF_BASE_URL`
- `CLINIKO_API_BASE_URL`
- `CLINIKO_API_KEY` (server only)
- `PORTAL_SESSION_SECRET`
- `MAGIC_LINK_TTL_SECONDS`
- `S3_UPLOAD_REDIRECT_ALLOWLIST`
