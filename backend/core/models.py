from django.db import models

# Create your models here.

class Contact(models.Model):
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return self.name or self.email or self.phone

class CallScript(models.Model):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='scripts')
    script_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Script for {self.contact} at {self.created_at}"

class CallLog(models.Model):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='call_logs')
    script = models.ForeignKey(CallScript, on_delete=models.SET_NULL, null=True, blank=True, related_name='call_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, choices=[('initiated', 'Initiated'), ('completed', 'Completed'), ('failed', 'Failed')], default='initiated')

    def __str__(self):
        return f"Call to {self.contact} at {self.timestamp} ({self.status})"
