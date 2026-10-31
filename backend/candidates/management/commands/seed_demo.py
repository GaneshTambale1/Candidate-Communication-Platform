from django.core.management.base import BaseCommand
from candidates.models import Candidate

SEED = [
    ('Rahul Sharma', 'rahul@example.com', '+919876543210'),
    ('Priya Shah', 'priya@example.com', '+919876543211'),
    ('Amit Kumar', 'amit@example.com', '+919876543212'),
    ('Neha Patel', 'neha@example.com', '+919876543213'),
    ('Rohan Mehta', 'rohan@example.com', '+919876543214'),
    ('Ananya Rao', 'ananya@example.com', '+919876543215'),
]

class Command(BaseCommand):
    help = 'Create safe fictional demo candidates (idempotent)'

    def handle(self, *args, **options):
        for name, email, phone in SEED:
            Candidate.objects.get_or_create(email=email, defaults={'name': name, 'phone': phone})
        self.stdout.write(self.style.SUCCESS('Demo candidates ready.'))
