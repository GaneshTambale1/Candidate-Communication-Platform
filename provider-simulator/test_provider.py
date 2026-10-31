"""Provider-specific tests: run `pytest -q` from provider-simulator/."""
import os
from fastapi.testclient import TestClient
import main


def test_provider_accept_idempotent_and_failure_modes(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB', str(tmp_path / 'messages.sqlite3'))
    async def noop(*args, **kwargs):
        return None
    monkeypatch.setattr(main, 'dispatch_updates', noop)
    with TestClient(main.app) as client:
        payload = {
            'client_message_id':'client-message-001:1', 'recipient':'+919876543210',
            'body':'Hello', 'scenario':'success',
            'callback_url':'http://localhost:8000/api/v1/webhooks/provider/',
        }
        accepted=client.post('/messages',json=payload)
        assert accepted.status_code==202
        provider_id=accepted.json()['provider_message_id']
        assert client.post('/messages',json=payload).json()['provider_message_id']==provider_id
        assert client.get('/messages/'+provider_id).json()['status']=='sent'
        rate={**payload,'client_message_id':'client-message-002:1','scenario':'rate_limit'}
        assert client.post('/messages',json=rate).status_code==429
        assert client.post('/messages',json=rate).status_code==202
        invalid={**payload,'client_message_id':'client-message-003:1','scenario':'invalid_recipient'}
        assert client.post('/messages',json=invalid).status_code==422
        unsafe={**payload,'client_message_id':'client-message-004:1','callback_url':'http://untrusted.example/webhook'}
        assert client.post('/messages',json=unsafe).status_code==422
