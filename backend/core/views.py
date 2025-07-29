from django.shortcuts import render
from rest_framework import viewsets
from .models import Contact, CallScript, CallLog
from .serializers import ContactSerializer, CallScriptSerializer, CallLogSerializer

# Create your views here.

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

class CallScriptViewSet(viewsets.ModelViewSet):
    queryset = CallScript.objects.all()
    serializer_class = CallScriptSerializer

class CallLogViewSet(viewsets.ModelViewSet):
    queryset = CallLog.objects.all()
    serializer_class = CallLogSerializer
