# Candidate Communication Platform — Submission summary

**GitHub:** Add your repository URL here after publishing.

**Live demo:** Add your deployed frontend URL here after deployment (not included with this source archive).

## Delivered

- Responsive Next.js + React + TypeScript + Material UI recruiting interface.
- Django REST API and PostgreSQL database for candidates, messages and batches.
- Candidate creation, editing, searching, details, and message history.
- Individual and bulk messaging processed with Celery and Redis.
- Standalone FastAPI dummy communication provider with independent storage.
- Asynchronous webhook-based Sent, Delivered, Read and Failed status updates.
- Signed webhooks, duplicate protection and out-of-order event handling.
- Retryable provider failures, per-recipient bulk results, human-readable errors.
- Docker Compose setup, demo seed, automated test suite and CI workflow.

## Bonus

- Bounded automatic retries for transient provider failures.
- One-click manual retry for eligible failed messages.
- Configurable provider failure scenarios and mixed-success bulk demonstration.
- Dashboard summary metrics and auto-refresh status indicators.

## Notes

All messages are simulated; the app uses a separate dummy provider rather than real Twilio/WhatsApp/Resend. The app is a single-workspace assignment demo without recruiter authentication. The UI is Figma-inspired; exact pixel matching should be checked in the native file.

**Before submitting:** Run the tests and Docker demo, publish to GitHub, deploy if a public demo is required, and replace the placeholders above. Do not represent the unverified local archive as a successfully hosted or fully integration-tested application.
