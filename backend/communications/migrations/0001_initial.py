import uuid
import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [('candidates', '0001_initial')]
    operations = [
        migrations.CreateModel(
            name='MessageBatch',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('body', models.TextField()),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('sending', 'Sending'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read'), ('failed', 'Failed')], db_index=True, default='queued', max_length=20)),
                ('scenario', models.CharField(choices=[('success', 'Success'), ('delivery_failure', 'Delivery failure'), ('temporary_failure', 'Temporary provider error'), ('rate_limit', 'Rate limit'), ('invalid_recipient', 'Invalid recipient'), ('provider_unavailable', 'Provider unavailable')], default='success', max_length=32)),
                ('provider_message_id', models.CharField(blank=True, db_index=True, max_length=160)),
                ('send_version', models.PositiveIntegerField(default=1)),
                ('error_code', models.CharField(blank=True, max_length=80)),
                ('failure_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('batch', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='messages', to='communications.messagebatch')),
                ('candidate', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='messages', to='candidates.candidate')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='MessageAttempt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('send_version', models.PositiveIntegerField()),
                ('number', models.PositiveIntegerField()),
                ('succeeded', models.BooleanField(default=False)),
                ('error_code', models.CharField(blank=True, max_length=80)),
                ('attempted_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='communications.message')),
            ],
        ),
        migrations.CreateModel(
            name='ProviderEvent',
            fields=[
                ('event_id', models.CharField(max_length=160, primary_key=True, serialize=False)),
                ('provider_message_id', models.CharField(max_length=160)),
                ('status', models.CharField(max_length=20)),
                ('occurred_at', models.DateTimeField()),
                ('received_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='communications.message')),
            ],
        ),
        migrations.AddIndex(model_name='message', index=models.Index(fields=['candidate', '-created_at'], name='communicati_candida_9aac09_idx')),
    ]
