from django.contrib import admin
from .models import Contact, CallScript, CallLog

admin.site.register(Contact)
admin.site.register(CallScript)
admin.site.register(CallLog)
