# Runbooks

## Local Dev

1. `pnpm install`
2. `pnpm dev`
3. Open:
   - Patient portal: `http://localhost:5173/demo/entry?token=dev-token`
   - Practitioner extension: `http://localhost:5174/entry?patient_id=pat_123&clinic=demo-clinic`
   - BFF health: `http://localhost:4000/health`

## Build and Verify

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:e2e`

## Release Checklist

1. Confirm API contract changes are documented in `docs/api-contracts.md`.
2. Confirm cache rule changes are documented in `docs/cache-invalidation.md`.
3. Confirm threat-model updates for new data flows.
4. Confirm CI green for build, typecheck, unit, and E2E.
