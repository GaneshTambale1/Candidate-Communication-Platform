import logging
import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import Message, MessageAttempt

logger = logging.getLogger(__name__)

ERROR_TEXT = {
    'invalid_recipient': 'The candidate phone number was rejected. Please verify it.',
    'rate_limit': 'The communication service is rate limiting requests.',
    'service_unavailable': 'The communication service is temporarily unavailable.',
    'network_error': 'Could not confirm provider acceptance. Retrying safely.',
    'delivery_failed': 'The provider could not deliver this message.',
}
RETRYABLE = {'rate_limit', 'service_unavailable', 'network_error'}

@shared_task(bind=True, max_retries=3)
def send_message_task(self, message_id, send_version):
    # Version fences protect manual retry from older queued jobs.
    with transaction.atomic():
        msg = Message.objects.select_for_update().select_related('candidate').get(pk=message_id)
        if msg.send_version != send_version or msg.status in ('sent', 'delivered', 'read', 'failed'):
            return
        msg.status = Message.Status.SENDING
        msg.save(update_fields=['status', 'updated_at'])
        attempt = MessageAttempt.objects.create(
            message=msg, send_version=send_version, number=self.request.retries + 1
        )
        payload = {
            'client_message_id': f'{msg.pk}:{send_version}',
            'recipient': msg.candidate.phone,
            'body': msg.body,
            'scenario': msg.scenario,
            'callback_url': settings.DJANGO_CALLBACK_URL,
        }
    error_code = ''
    provider_id = ''
    provider_status = 'sent'
    try:
        response = requests.post(f'{settings.PROVIDER_URL}/messages', json=payload, timeout=5)
        if response.status_code in (200, 201, 202):
            provider_payload = response.json()
            provider_id = provider_payload['provider_message_id']
            provider_status = provider_payload.get('status', 'sent')
        elif response.status_code == 429:
            error_code = 'rate_limit'
        elif response.status_code in (502, 503, 504):
            error_code = 'service_unavailable'
        elif response.status_code in (400, 422):
            error_code = 'invalid_recipient'
        else:
            error_code = 'service_unavailable' if response.status_code >= 500 else 'invalid_recipient'
    except (requests.RequestException, ValueError, KeyError) as exc:
        logger.warning('Provider request failed: %s', type(exc).__name__)
        error_code = 'network_error'

    with transaction.atomic():
        msg = Message.objects.select_for_update().get(pk=message_id)
        if msg.send_version != send_version:
            return
        attempt.succeeded = not bool(error_code)
        attempt.error_code = error_code
        attempt.save(update_fields=['succeeded', 'error_code'])
        if not error_code:
            msg.provider_message_id = provider_id
            msg.error_code = ''
            msg.failure_reason = ''
            if msg.status in ('queued', 'sending'):
                msg.status = provider_status if provider_status in ('sent', 'delivered', 'read', 'failed') else Message.Status.SENT
                if msg.status == Message.Status.FAILED:
                    msg.error_code = 'delivery_failed'
                    msg.failure_reason = ERROR_TEXT['delivery_failed']
            msg.save(update_fields=['provider_message_id', 'error_code', 'failure_reason', 'status', 'updated_at'])
            return
        # Retry transient requests using the SAME provider idempotency key.
        transient = error_code in RETRYABLE and self.request.retries < self.max_retries
        msg.error_code = error_code
        msg.failure_reason = ('Retrying automatically: ' if transient else '') + ERROR_TEXT[error_code]
        msg.status = Message.Status.QUEUED if transient else Message.Status.FAILED
        msg.save(update_fields=['error_code', 'failure_reason', 'status', 'updated_at'])
    if transient:
        countdown = min(2 ** (self.request.retries + 1), 30)
        raise self.retry(countdown=countdown)
