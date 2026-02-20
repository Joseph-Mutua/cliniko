# API Contracts

## Session

- `POST /session/exchange`
  - Input: `{ token: string, tenantSlug?: string }`
  - Output: `{ ok: true, patientId: string, tenantSlug: string }`
- `GET /session/me`
  - Output: `{ patientId: string, tenantSlug: string, createdAt: number }`

## Cliniko Proxy Surface

- `GET /cliniko/patients/:id/summary`
- `GET /cliniko/patients/:id/timeline?cursor=...`
- `GET /cliniko/appointments?...`
- `GET /cliniko/invoices?...`
- `GET /cliniko/appointments/:id/telehealth-links`

## Attachments

- `POST /cliniko/patients/:id/attachments/presign`
  - Input: `{ fileName: string, contentType?: string }`
  - Output: `{ uploadUrl, method, requiredHeaders, uploadToken }`
- `POST /cliniko/patients/:id/attachments/confirm`
  - Input: `{ uploadToken: string, fileName: string }`
  - Output: `{ attachmentId, patientId, fileName, uploadedAt }`

## Audit

- `POST /audit/events`
  - Input: `{ type: string, actor: string, payload: Record<string, unknown> }`
  - Output: stored audit record
