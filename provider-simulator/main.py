"""Standalone deterministic mock provider. Not imported by the Django app."""
import asyncio
import hashlib
import hmac
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager, asynccontextmanager
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field
import httpx

DB = os.environ.get('PROVIDER_DB_PATH', '/tmp/candidate-provider.sqlite3')
SECRET = os.environ.get('PROVIDER_WEBHOOK_SECRET', 'local-dev-webhook-secret-change-me').encode()

@contextmanager
def connection():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    finally:
        db.close()

def init_db():
    with connection() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS provider_messages (
            id TEXT PRIMARY KEY, client_id TEXT UNIQUE NOT NULL, recipient TEXT NOT NULL,
            body TEXT NOT NULL, status TEXT NOT NULL, scenario TEXT NOT NULL,
            callback_url TEXT NOT NULL, created_at TEXT NOT NULL
        )''')
        db.execute('''CREATE TABLE IF NOT EXISTS request_failures (
            client_id TEXT PRIMARY KEY, failures INTEGER NOT NULL
        )''')

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title='Independent Demo Communication Provider', version='1.0', lifespan=lifespan)

class SendRequest(BaseModel):
    client_message_id: str = Field(min_length=10, max_length=200)
    recipient: str = Field(min_length=8, max_length=30)
    body: str = Field(min_length=1, max_length=2000)
    scenario: str = 'success'
    callback_url: str

@app.get('/health')
def health():
    return {'status': 'operational', 'service': 'dummy-provider'}

@app.get('/messages/{provider_id}')
def get_message(provider_id: str):
    with connection() as db:
        row = db.execute('SELECT id, client_id, status FROM provider_messages WHERE id=?', (provider_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Message not found')
    return {'provider_message_id': row['id'], 'client_message_id': row['client_id'], 'status': row['status']}

async def post_webhook(payload, url):
    raw = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode()
    signature = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    for n in range(4):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.post(url, content=raw, headers={
                    'Content-Type': 'application/json', 'X-Provider-Signature': signature,
                })
                if response.status_code < 300:
                    return
        except httpx.HTTPError:
            pass
        await asyncio.sleep(min(2 ** n, 5))

async def dispatch_updates(provider_id: str, client_id: str, scenario: str, callback_url: str):
    # Production providers can update after acceptance; deliberately asynchronous.
    statuses = ['failed'] if scenario == 'delivery_failure' else ['delivered', 'read']
    for state in statuses:
        await asyncio.sleep(2)
        with connection() as db:
            db.execute('UPDATE provider_messages SET status=? WHERE id=?', (state, provider_id))
        await post_webhook({
            'event_id': str(uuid.uuid4()), 'client_message_id': client_id,
            'provider_message_id': provider_id, 'status': state,
            'occurred_at': datetime.now(timezone.utc).isoformat(),
        }, callback_url)

@app.post('/messages', status_code=202)
async def send_message(request: SendRequest, background_tasks: BackgroundTasks):
    if request.callback_url != os.environ.get('DJANGO_CALLBACK_URL', 'http://localhost:8000/api/v1/webhooks/provider/'):
        raise HTTPException(status_code=422, detail='Callback URL is not permitted')
    if request.scenario not in {'success', 'delivery_failure', 'temporary_failure', 'rate_limit', 'invalid_recipient', 'provider_unavailable'}:
        raise HTTPException(status_code=400, detail='Unknown simulation scenario')
    # Important: idempotency lookup comes before simulation of transient failures.
    with connection() as db:
        existing = db.execute('SELECT id, status FROM provider_messages WHERE client_id=?', (request.client_message_id,)).fetchone()
        if existing:
            return {'provider_message_id': existing['id'], 'status': existing['status'], 'duplicate': True}
        row = db.execute('SELECT failures FROM request_failures WHERE client_id=?', (request.client_message_id,)).fetchone()
        n = row['failures'] if row else 0
        if request.scenario in ('temporary_failure', 'rate_limit') and n < 1:
            db.execute('INSERT INTO request_failures(client_id, failures) VALUES (?,1) ON CONFLICT(client_id) DO UPDATE SET failures=failures+1', (request.client_message_id,))
            raise_code = 429 if request.scenario == 'rate_limit' else 503
        else:
            raise_code = 0
    if raise_code:
        raise HTTPException(status_code=raise_code, detail='Simulated transient provider failure')
    if request.scenario == 'provider_unavailable':
        raise HTTPException(status_code=503, detail='Simulated provider outage')
    if request.scenario == 'invalid_recipient' or not request.recipient.startswith('+'):
        raise HTTPException(status_code=422, detail='Invalid recipient')
    provider_id = f'mock_{uuid.uuid4().hex[:16]}'
    with connection() as db:
        try:
            db.execute('''INSERT INTO provider_messages(id,client_id,recipient,body,status,scenario,callback_url,created_at)
                VALUES(?,?,?,?,?,?,?,?)''', (provider_id, request.client_message_id, request.recipient,
                                           request.body, 'sent', request.scenario, request.callback_url,
                                           datetime.now(timezone.utc).isoformat()))
        except sqlite3.IntegrityError:
            row = db.execute('SELECT id,status FROM provider_messages WHERE client_id=?', (request.client_message_id,)).fetchone()
            return {'provider_message_id': row['id'], 'status': row['status'], 'duplicate': True}
    background_tasks.add_task(dispatch_updates, provider_id, request.client_message_id, request.scenario, request.callback_url)
    return {'provider_message_id': provider_id, 'status': 'sent'}
