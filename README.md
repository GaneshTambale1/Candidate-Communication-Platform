# ConnectFlow — Candidate Communication Platform

A full-stack recruiting communication assignment built with **Next.js 15 / React 19 / TypeScript / Material UI**, **Python Django + Django REST Framework**, **PostgreSQL**, **Celery + Redis**, and a **separate FastAPI dummy communication provider**.

> **Demo-only:** messages are simulated, and the sample candidates are fictional. No real WhatsApp, email, or SMS messages are sent. The project intentionally omits recruiter login because authentication was not required by the assignment. **Do not expose this demo publicly with real candidate information unless proper authentication, access controls, secrets management, and deployment hardening are added.**

## Features

- Create, edit, list, search, and view candidates (phone validation in international format).
- Send individual messages asynchronously; create a message record immediately.
- Select and message multiple candidates in one batch; **one independent job and status per candidate**.
- Track `queued → sending → sent → delivered → read` and failed deliveries.
- Simulated independent provider with its own SQLite persistence, message IDs, idempotent sends, and signed HTTP webhook callbacks.
- Validate HMAC-SHA256 webhook signatures; deduplicate events by event ID; ignore out-of-order regressions and stale retry generations.
- Auto-retry rate limits and temporary service failures with bounded exponential backoff; manual retry for eligible failures.
- Show per-candidate communication history and per-batch delivery results.
- Responsive Material UI recruiter dashboard with loading, error, and empty states and polling for live status updates.
- **Demo mixed results**: select at least 3 candidates, enable the mixed-results toggle, and the third candidate gets a delayed delivery failure while the others continue to `read`.

## Architecture

```text
Browser (Next.js + MUI on port 3000)
     |
     |  JSON REST API
     v
Django REST Framework (port 8000) <------ provider status webhooks (HMAC)
     |              ^                             |
     |              |                             |
PostgreSQL        Celery worker ---HTTP POST--> FastAPI dummy provider (8001)
                    ^                             |
                    |                             |
                   Redis                       provider SQLite
```

**Backend owns the source of truth** for message state. PostgreSQL stores messages, batches, attempts, and received provider events. The provider has separate persistence and progresses messages asynchronously. Frontend polls every ~3.5–4s and treats queued messages as accepted for processing, not delivered.

### Status transitions

- `queued → sending → sent → delivered → read` (skipped intermediate events are permitted)
- `queued/sending/sent → failed`
- `failed → queued` only via an explicit, eligible manual retry (new `send_version`)
- Delivered/read cannot regress to older statuses.
- Each provider event uses a unique event ID; an older send-version webhook is ignored.

### Error simulation scenarios

| Scenario | Behavior |
| --- | --- |
| Normal | Provider immediately accepts then asynchronously posts `delivered`, `read` |
| Delivery failure | Provider accepts but posts `failed` |
| Temporary provider error | First request returns HTTP 503; Celery automatically retries and succeeds |
| Rate limit | First request returns HTTP 429; Celery automatically retries and succeeds |
| Invalid recipient | Returns HTTP 422; permanent failure, no retry |
| Provider unavailable | Returns HTTP 503 until automatic attempts are exhausted; manual retry can choose normal mode |
| Mixed bulk | Third selected recipient fails delivery, remaining recipients succeed |

## Run with Docker (recommended)

Prerequisites: **Docker Desktop with Compose** and Git.

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd candidate-communication-platform
cp .env.example .env
# Change DJANGO_SECRET_KEY, POSTGRES_PASSWORD and PROVIDER_WEBHOOK_SECRET in .env.
docker compose up --build
```

Open:

| Component | URL |
| --- | --- |
| Frontend dashboard | http://localhost:3000 |
| Candidate list | http://localhost:3000/candidates |
| Django API health | http://localhost:8000/api/v1/health/ |
| Django candidates API | http://localhost:8000/api/v1/candidates/ |
| Provider health | http://localhost:8001/health |
| Provider API docs | http://localhost:8001/docs |

The Docker `backend` container applies migrations and idempotently seeds **six fictitious candidates** on startup. Other containers start the Celery worker, Redis, provider and frontend. Use `docker compose down` to stop, or `docker compose down -v` to delete local volumes and demo data.

**If you change `POSTGRES_PASSWORD` in `.env`, also update the password in `DATABASE_URL`.** The hostnames in `.env.example` are Docker service names and are not valid for a backend running directly on your host.

## Run without Docker (development)

1. Create a PostgreSQL database and run Redis separately, or use SQLite for backend-only API testing.
2. Install backend dependencies:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8000
```

3. Start Celery in another terminal (requires Redis at `redis://localhost:6379/0`):

```bash
cd backend
celery -A config worker -l info
```

4. Start the independent provider in another terminal:

```bash
cd provider-simulator
pip install -r requirements.txt
# For host-only run, set DJANGO_CALLBACK_URL=http://localhost:8000/api/v1/webhooks/provider/
uvicorn main:app --host 0.0.0.0 --port 8001
```

5. Start the frontend in another terminal:

```bash
cd frontend
npm install
# NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8000/api/v1
npm run dev
```

Note: the host-only Django backend defaults to SQLite and the localhost provider/Redis addresses. For deployment, explicitly configure all environment variables instead of relying on defaults.

## REST API overview

| Method | Route | Notes |
| --- | --- | --- |
| GET/POST | `/api/v1/candidates/` | Paginated list / create |
| GET/PATCH | `/api/v1/candidates/{id}/` | Candidate detail / edit |
| GET | `/api/v1/candidates/{id}/messages/` | Candidate history |
| GET/POST | `/api/v1/messages/` | List / send one |
| POST | `/api/v1/messages/bulk/` | Send to selected candidates |
| POST | `/api/v1/messages/{id}/retry/` | Retry eligible transient failure |
| GET | `/api/v1/batches/` | Campaign list / counts |
| GET | `/api/v1/batches/{id}/` | Campaign totals |
| GET | `/api/v1/batches/{id}/messages/` | Per-candidate campaign results |
| GET | `/api/v1/dashboard/` | Aggregate counts |
| POST | `/api/v1/webhooks/provider/` | Signed provider-only callback |
| GET | `/api/v1/health/` | Backend health |

Candidate creation:

```bash
curl -X POST http://localhost:8000/api/v1/candidates/ \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sam Example","email":"sam@example.com","phone":"+919876543299"}'
```

Single message (replace the UUID with an actual candidate ID):

```bash
curl -X POST http://localhost:8000/api/v1/messages/ \
  -H 'Content-Type: application/json' \
  -d '{"candidate_id":"<UUID>","body":"Your interview is tomorrow.","scenario":"success"}'
```

Bulk message:

```json
{
  "candidate_ids": ["<UUID_1>", "<UUID_2>", "<UUID_3>"],
  "body": "Your interview is scheduled for tomorrow.",
  "scenario": "success",
  "mixed_results": true
}
```

`POST /api/v1/messages/bulk/` returns `202 Accepted`, with batch and message IDs. View status at `/api/v1/batches/<batch_id>/messages/`.

## Demo walkthrough (recommended for reviewers)

1. Open `http://localhost:3000/candidates` and search for Rahul.
2. Open a profile and send a normal message.
3. Watch the messages page move through `Queued → Sent → Delivered → Read` without reloading.
4. Select 3+ candidates and send a bulk message, enabling **Demo mixed results**.
5. Open the batch details to see a delivery failure for the third recipient without blocking others.
6. Send one message using **Provider unavailable**, wait for attempts to be exhausted, then click **Retry**. The demo retry switches the scenario to normal success.
7. Verify previous messages stay in each candidate's history.

## Automated checks

```bash
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run
pytest -q

cd ../frontend
npm install
npm run lint
npm run build
```

CI workflow in `.github/workflows/ci.yml` runs Django checks, migration-drift detection, Python tests, TypeScript checking, and Next build.

## Structure

```text
candidate-communication-platform/
  frontend/
    src/app/                 # Next.js App Router pages
    src/components/          # Shared layouts, message table, composer
    src/lib/api.ts           # Axios client
    src/types/               # TypeScript interfaces
  backend/
    config/                  # Django settings, URLs, Celery config
    candidates/              # Candidate models, validators and API
    communications/          # Models, APIs, tasks and tests
  provider-simulator/        # Separate FastAPI provider and SQLite state
  .github/workflows/ci.yml
  docker-compose.yml
  .env.example
```

## Design decisions, assumptions and limitations

- Uses a **dummy provider** as permitted by the assignment, so nothing is sent to real candidates.
- The dummy provider is an **independent HTTP service**, not an in-process fake, and stores its own provider message references.
- Realistically asynchronous sends are dispatched by Celery. Each bulk recipient is its own message and task, so failures are isolated.
- Persisted `MessageAttempt` and `ProviderEvent` records improve traceability.
- Provider callbacks are HMAC-signed; the provider accepts only the configured Django callback URL.
- Automatic retries reuse one provider idempotency key per send-version to avoid repeated sends when acceptance is uncertain. A new manual retry creates a new send-version.
- The frontend polls APIs instead of introducing WebSockets; this reduces deployment complexity while still showing changes promptly.
- Django APIs have **no recruiter auth** in this assignment demo. Add multi-tenant auth/permissions, rate limiting, audit logging, object authorization and secrets management before use with real candidate data.
- Provider update dispatch uses FastAPI background tasks, which can be lost if the provider process restarts; a production provider would have a durable queue or reconciliation job.
- The `scenario` and `mixed_results` fields are **demo-only test controls** and would not be exposed to regular recruiters.
- Styling follows a clean Material UI recruiter dashboard. **Exact Figma fidelity must be reviewed against the original `.fig` file in Figma**; the native design was not fully imported into this codebase.
- Optional message templates, scheduled sends and multiple real providers are not implemented. Core functional requirements take priority.

## Deployment notes

- Frontend: Vercel or a public Node container. Set `NEXT_PUBLIC_API_BASE_URL` to the public Django HTTPS API URL (including `/api/v1`) **at build time**.
- Backend: Django + gunicorn in a container with Postgres and Redis, plus a separate Celery worker.
- Provider: separate container with persistent storage and Django's HTTPS callback URL.
- Set `CORS_ALLOWED_ORIGINS`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `REDIS_URL`, `PROVIDER_URL`, `DJANGO_CALLBACK_URL`, and the shared secret correctly in both services.
- Never expose database ports, Redis, or developer secrets publicly. Secure the REST API before sharing a public demo link.

## Completion summary

**Implemented in source:** candidate CRUD/search, individual and bulk send APIs, asynchronous worker, provider simulation, unique provider IDs, delayed status callbacks, idempotent webhook updates, independent recipient results, history, bounded auto-retries, manual retry, Figma-inspired frontend, seed data, tests, Docker and CI.

**Not included:** hosted demo URL, real SMS/WhatsApp credentials, recruiter login, exact pixel-matched native Figma design, optional scheduled messages or templates.

**Verification notice:** Static Python syntax checks were performed when this package was generated. A complete install/build/integration test requires Docker or access to Python/npm dependency registries. Run the included commands and resolve any environment-specific integration issues before submitting this as a tested application.

### Provider-only smoke tests

```bash
cd provider-simulator
pytest -q
```

Original supplied requirements and native design reference are included under `docs/` for convenient reviewer access.
