import uuid
from django.db import models

SCENARIO_CHOICES = [
    ('success', 'Success'),
    ('delivery_failure', 'Delivery failure'),
    ('temporary_failure', 'Temporary provider error'),
    ('rate_limit', 'Rate limit'),
    ('invalid_recipient', 'Invalid recipient'),
    ('provider_unavailable', 'Provider unavailable'),
]

class MessageBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        SENDING = 'sending', 'Sending'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey('candidates.Candidate', on_delete=models.PROTECT, related_name='messages')
    batch = models.ForeignKey(MessageBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    body = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED, db_index=True)
    scenario = models.CharField(max_length=32, choices=SCENARIO_CHOICES, default='success')
    provider_message_id = models.CharField(max_length=160, blank=True, db_index=True)
    send_version = models.PositiveIntegerField(default=1)
    error_code = models.CharField(max_length=80, blank=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['candidate', '-created_at'], name='communicati_candida_9aac09_idx')]

class MessageAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attempts')
    send_version = models.PositiveIntegerField()
    number = models.PositiveIntegerField()
    succeeded = models.BooleanField(default=False)
    error_code = models.CharField(max_length=80, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

class ProviderEvent(models.Model):
    event_id = models.CharField(max_length=160, primary_key=True)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='events')
    provider_message_id = models.CharField(max_length=160)
    status = models.CharField(max_length=20)
    occurred_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)
