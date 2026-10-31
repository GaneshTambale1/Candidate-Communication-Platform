import phonenumbers
from rest_framework import serializers
from .models import Candidate

class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ['id', 'name', 'email', 'phone', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Enter a name of at least 2 characters.')
        return value

    def validate_email(self, value):
        return value.strip().lower()

    def validate_phone(self, value):
        try:
            parsed = phonenumbers.parse(value, None)
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError('Enter a phone number with country code, e.g. +919876543210.')
        if not phonenumbers.is_valid_number(parsed):
            raise serializers.ValidationError('Enter a valid international phone number.')
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
