import hashlib
import hmac
import uuid
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from candidates.models import Candidate
from .models import Message, MessageBatch, ProviderEvent
from .serializers import MessageSerializer, SendSerializer, BulkSendSerializer, MessageBatchSerializer
from .tasks import send_message_task, RETRYABLE

class MessageViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options']
    queryset = Message.objects.select_related('candidate', 'batch').all()
    serializer_class = MessageSerializer
    filterset_fields = ['status', 'candidate', 'batch']
    search_fields = ['body', 'candidate__name', 'candidate__email']

    def create(self, request):
        serializer = SendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            message = Message.objects.create(candidate=data['candidate'], body=data['body'], scenario=data['scenario'])
            transaction.on_commit(lambda: send_message_task.delay(str(message.id), message.send_version))
        return Response(MessageSerializer(message).data, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        serializer = BulkSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            batch = MessageBatch.objects.create()
            messages = [Message(candidate_id=cid, batch=batch, body=data['body'],
                            scenario=('delivery_failure' if idx == 2 else 'success') if data['mixed_results'] else data['scenario'])
                        for idx, cid in enumerate(data['candidate_ids'])]
            Message.objects.bulk_create(messages)
            ids = [str(m.id) for m in messages]
            transaction.on_commit(lambda: [send_message_task.delay(mid, 1) for mid in ids])
        return Response({'batch_id': str(batch.id), 'total': len(ids), 'queued': len(ids),
                         'message_ids': ids}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        with transaction.atomic():
            msg = get_object_or_404(Message.objects.select_for_update(), pk=pk)
            if msg.status != Message.Status.FAILED or msg.error_code not in RETRYABLE:
                raise ValidationError({'message': 'Only transiently failed messages can be retried.'})
            msg.send_version += 1
            msg.status = Message.Status.QUEUED
            msg.provider_message_id = ''
            msg.error_code = ''
            msg.failure_reason = ''
            if request.data.get('scenario'):
                scenarios = dict(Message._meta.get_field('scenario').choices)
                if request.data['scenario'] not in scenarios:
                    raise ValidationError({'scenario': 'Unknown provider scenario.'})
                msg.scenario = request.data['scenario']
            msg.save()
            version = msg.send_version
            transaction.on_commit(lambda: send_message_task.delay(str(msg.id), version))
        return Response(MessageSerializer(msg).data, status=status.HTTP_202_ACCEPTED)

class BatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MessageBatch.objects.annotate(
        total=Count('messages'),
        sent=Count('messages', filter=Q(messages__status='sent')),
        delivered=Count('messages', filter=Q(messages__status='delivered')),
        read=Count('messages', filter=Q(messages__status='read')),
        failed=Count('messages', filter=Q(messages__status='failed')),
        queued=Count('messages', filter=Q(messages__status__in=['queued', 'sending'])),
    ).order_by('-created_at')
    serializer_class = MessageBatchSerializer

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        batch = self.get_object()
        rows = Message.objects.filter(batch=batch).select_related('candidate').order_by('candidate__name')
        page = self.paginate_queryset(rows)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(rows, many=True).data)

# Ordered progress. Failed is allowed only until a message is confirmed delivered.
ALLOWED = {
    'queued': {'sent', 'delivered', 'read', 'failed'},
    'sending': {'sent', 'delivered', 'read', 'failed'},
    'sent': {'delivered', 'read', 'failed'},
    'delivered': {'read'},
    'read': set(),
    'failed': set(),
}

class ProviderWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        signature = request.headers.get('X-Provider-Signature', '')
        expected = hmac.new(settings.PROVIDER_WEBHOOK_SECRET.encode(), request.body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return Response({'detail': 'Invalid provider signature.'}, status=401)
        try:
            event_id = str(request.data['event_id'])
            provider_id = str(request.data['provider_message_id'])
            client_id = str(request.data['client_message_id'])
            new_status = str(request.data['status'])
            occurred_at = parse_datetime(request.data['occurred_at'])
            mid, version_str = client_id.rsplit(':', 1)
            uuid.UUID(mid)
            version = int(version_str)
            if not event_id or not provider_id or new_status not in ('sent', 'delivered', 'read', 'failed') or not occurred_at:
                raise ValueError('Invalid payload')
            if timezone.is_naive(occurred_at):
                raise ValueError('Timezone required')
        except (KeyError, ValueError, TypeError):
            return Response({'detail': 'Malformed event.'}, status=400)
        with transaction.atomic():
            msg = Message.objects.select_for_update().filter(pk=mid).first()
            if not msg:
                return Response({'detail': 'Unknown message.'}, status=404)
            if version != msg.send_version:
                return Response({'status': 'stale_attempt_ignored'})
            if msg.provider_message_id and msg.provider_message_id != provider_id:
                return Response({'detail': 'Provider reference mismatch.'}, status=409)
            if ProviderEvent.objects.filter(event_id=event_id).exists():
                return Response({'status': 'duplicate_ignored'})
            # Serialize webhook events per message; unique event_id also protects concurrent workers.
            ProviderEvent.objects.create(event_id=event_id, message=msg, status=new_status,
                                         provider_message_id=provider_id, occurred_at=occurred_at)
            changed = new_status in ALLOWED.get(msg.status, set())
            if changed:
                msg.status = new_status
                msg.provider_message_id = provider_id
                if new_status == 'failed':
                    msg.error_code = 'delivery_failed'
                    msg.failure_reason = 'The communication provider could not deliver this message.'
                else:
                    msg.error_code = ''
                    msg.failure_reason = ''
                msg.save(update_fields=['status', 'provider_message_id', 'error_code', 'failure_reason', 'updated_at'])
        return Response({'status': 'updated' if changed else 'stale_status_ignored'})

class DashboardView(APIView):
    def get(self, request):
        counts = dict(Message.objects.values('status').annotate(total=Count('id')).values_list('status', 'total'))
        return Response({
            'candidates': Candidate.objects.count(),
            'messages': Message.objects.count(),
            'sent': counts.get('sent', 0),
            'delivered': counts.get('delivered', 0),
            'read': counts.get('read', 0),
            'failed': counts.get('failed', 0),
            'pending': counts.get('queued', 0) + counts.get('sending', 0),
            'batches': MessageBatch.objects.count(),
        })

class HealthView(APIView):
    def get(self, request):
        return Response({'status': 'operational', 'service': 'candidate-platform-api'})
