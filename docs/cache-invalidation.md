# Cache Invalidation

## Query Key Source

All keys are centralized in `packages/cache/src/keys.ts` (`qk`).

## Mutation Helpers

All mutation invalidation rules are centralized in `packages/cache/src/invalidation.ts`.

- `onAttachmentUploaded({ patientId })`
- `onFormSubmitted({ patientId, formId })`
- `onPaymentRequested({ patientId })`
- `runInvalidations(queryClient, invalidations)`

## Contract

- App mutation hooks call shared invalidation helpers.
- No ad-hoc invalidate calls for core business mutations.
- Loaders prefetch key route dependencies before rendering.
