import hashlib
import hmac
import json
import uuid
from unittest.mock import patch
import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from candidates.models import Candidate
from communications.models import Message, MessageBatch, ProviderEvent

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def people(db):
    return [Candidate.objects.create(name=f'Candidate {i}', email=f'candidate{i}@example.com', phone=f'+9198765432{i:02}') for i in range(3)]

def signed_event(client, msg, status='delivered', event_id='evt-1', version=1, provider_id='mock_abc'):
    payload = {
        'event_id': event_id,
        'provider_message_id': provider_id,
        'client_message_id': f'{msg.id}:{version}',
        'status': status,
        'occurred_at': timezone.now().isoformat(),
    }
    body = json.dumps(payload).encode()
    signature = hmac.new(settings.PROVIDER_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return client.post('/api/v1/webhooks/provider/', body, content_type='application/json', HTTP_X_PROVIDER_SIGNATURE=signature)

@pytest.mark.django_db
def test_candidate_validation(client):
    invalid = client.post('/api/v1/candidates/', {'name':'A','email':'bad','phone':'123'}, format='json')
    assert invalid.status_code == 400
    valid = client.post('/api/v1/candidates/', {'name':'Rahul Sharma','email':'RAHUL@example.com','phone':'+919876543210'}, format='json')
    assert valid.status_code == 201
    assert valid.data['email'] == 'rahul@example.com'
    assert client.get('/api/v1/candidates/?search=rahul').data['count'] == 1

@pytest.mark.django_db
def test_single_send_queued(client, people, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True), patch('communications.views.send_message_task.delay') as schedule:
        resp = client.post('/api/v1/messages/', {'candidate_id':str(people[0].id), 'body':'Hi there'}, format='json')
    assert resp.status_code == 202
    assert resp.data['status'] == 'queued'
    assert Message.objects.count() == 1
    schedule.assert_called_once()

@pytest.mark.django_db
def test_bulk_creates_independent_messages(client, people, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True), patch('communications.views.send_message_task.delay') as schedule:
        result = client.post('/api/v1/messages/bulk/', {'candidate_ids':[str(p.id) for p in people], 'body':'Interview tomorrow','mixed_results':True}, format='json')
    assert result.status_code == 202
    assert MessageBatch.objects.count() == 1
    assert Message.objects.count() == 3
    assert Message.objects.filter(scenario='delivery_failure').count() == 1
    assert schedule.call_count == 3
    assert client.get(f"/api/v1/batches/{result.data['batch_id']}/messages/").data['count'] == 3

@pytest.mark.django_db
def test_bulk_rejects_duplicates(client, people):
    uid=str(people[0].id)
    response=client.post('/api/v1/messages/bulk/', {'candidate_ids':[uid,uid], 'body':'Hi'}, format='json')
    assert response.status_code == 400
    assert Message.objects.count() == 0

@pytest.mark.django_db
def test_webhook_auth_and_idempotency(client, people):
    msg=Message.objects.create(candidate=people[0],body='Hello',status='sent',provider_message_id='mock_abc')
    unauthorized=client.post('/api/v1/webhooks/provider/', {}, format='json')
    assert unauthorized.status_code == 401
    one=signed_event(client,msg)
    two=signed_event(client,msg)
    assert one.status_code == 200 and one.data['status']=='updated'
    assert two.data['status']=='duplicate_ignored'
    msg.refresh_from_db()
    assert msg.status == 'delivered'
    assert ProviderEvent.objects.count() == 1

@pytest.mark.django_db
def test_out_of_order_webhooks_do_not_regress(client, people):
    msg=Message.objects.create(candidate=people[0],body='Hello',status='sent',provider_message_id='mock_abc')
    assert signed_event(client,msg,status='read',event_id='evt-1').status_code == 200
    assert signed_event(client,msg,status='delivered',event_id='evt-2').data['status']=='stale_status_ignored'
    msg.refresh_from_db()
    assert msg.status == 'read'

@pytest.mark.django_db
def test_retry_only_transient_failures(client,people,django_capture_on_commit_callbacks):
    perm=Message.objects.create(candidate=people[0],body='A',status='failed',error_code='invalid_recipient')
    transient=Message.objects.create(candidate=people[1],body='B',status='failed',error_code='service_unavailable',scenario='provider_unavailable')
    assert client.post(f'/api/v1/messages/{perm.id}/retry/', format='json').status_code == 400
    with django_capture_on_commit_callbacks(execute=True), patch('communications.views.send_message_task.delay') as schedule:
        resp=client.post(f'/api/v1/messages/{transient.id}/retry/', {'scenario':'success'}, format='json')
    assert resp.status_code == 202
    transient.refresh_from_db()
    assert transient.status == 'queued' and transient.send_version == 2 and transient.scenario == 'success'
    schedule.assert_called_once()

@pytest.mark.django_db
def test_older_webhook_version_ignored(client,people):
    msg=Message.objects.create(candidate=people[0],body='A',status='queued',send_version=2)
    response=signed_event(client,msg,status='failed',event_id='old-event',version=1)
    assert response.data['status']=='stale_attempt_ignored'
    msg.refresh_from_db()
    assert msg.status=='queued'
