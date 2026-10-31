from rest_framework import serializers
from candidates.models import Candidate
from .models import Message, MessageBatch, SCENARIO_CHOICES

class MessageSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    candidate_phone = serializers.CharField(source='candidate.phone', read_only=True)
    class Meta:
        model = Message
        fields = ['id', 'candidate', 'candidate_name', 'candidate_phone', 'batch', 'body',
                  'status', 'scenario', 'provider_message_id', 'error_code', 'failure_reason',
                  'created_at', 'updated_at']

class SendSerializer(serializers.Serializer):
    candidate_id = serializers.PrimaryKeyRelatedField(queryset=Candidate.objects.all(), source='candidate')
    body = serializers.CharField(max_length=2000, trim_whitespace=True, allow_blank=False)
    scenario = serializers.ChoiceField(choices=SCENARIO_CHOICES, default='success')

class BulkSendSerializer(serializers.Serializer):
    mixed_results = serializers.BooleanField(default=False)
    candidate_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False, min_length=1, max_length=100
    )
    body = serializers.CharField(max_length=2000, trim_whitespace=True, allow_blank=False)
    scenario = serializers.ChoiceField(choices=SCENARIO_CHOICES, default='success')

    def validate_candidate_ids(self, ids):
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('Please select each candidate only once.')
        existing = set(Candidate.objects.filter(id__in=ids).values_list('id', flat=True))
        if len(existing) != len(ids):
            raise serializers.ValidationError('One or more selected candidates do not exist.')
        return ids

class MessageBatchSerializer(serializers.ModelSerializer):
    total = serializers.IntegerField(read_only=True)
    sent = serializers.IntegerField(read_only=True)
    delivered = serializers.IntegerField(read_only=True)
    read = serializers.IntegerField(read_only=True)
    failed = serializers.IntegerField(read_only=True)
    queued = serializers.IntegerField(read_only=True)
    class Meta:
        model = MessageBatch
        fields = ['id', 'created_at', 'total', 'sent', 'delivered', 'read', 'failed', 'queued']
