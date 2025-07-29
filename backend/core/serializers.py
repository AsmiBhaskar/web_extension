from rest_framework import serializers
from .models import Contact, CallScript, CallLog

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class CallScriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallScript
        fields = '__all__'

class CallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallLog
        fields = '__all__' 