# Threat Model

## Assets

- Patient PII/PHI in sessions, forms, invoices, messages, and attachments.
- Cliniko API credentials.
- Signed links and upload tokens.

## Key Risks

- API key leakage into browser bundle.
- Stolen/forged magic links.
- Session theft via insecure cookies.
- Overly broad frontend script execution (XSS).
- Untracked sensitive actions.

## Mitigations in This Repo

- BFF pattern keeps provider credentials server-side.
- Token verification and short TTL for link exchange.
- `httpOnly` session cookie for BFF session.
- Helmet CSP enforced in BFF.
- Audit endpoint for immutable event capture.
- Centralized mutation invalidation avoids stale sensitive state.

## Next Hardening Steps

- Rotate and vault secrets.
- Encrypt audit log at rest.
- Add rate limiting and abuse detection.
- Add signed request validation for Cliniko custom-button entry params.
