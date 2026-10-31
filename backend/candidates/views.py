from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from communications.models import Message
from communications.serializers import MessageSerializer
from .models import Candidate
from .serializers import CandidateSerializer

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    search_fields = ['name', 'email', 'phone']

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        self.get_object()
        queryset = Message.objects.filter(candidate_id=pk).select_related('candidate').order_by('-created_at')
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(queryset, many=True).data)
