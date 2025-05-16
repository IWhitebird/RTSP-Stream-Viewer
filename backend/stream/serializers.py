from rest_framework import serializers
from .models import Stream

class StreamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stream
        fields = ['id', 'name', 'url', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at'] 