from django.conf import settings
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from .models import (
    Product, 
    ProductVariant,
    UnitType,  # Add UnitType import
)

class ProductVariantSerializer(ModelSerializer):
    unit_display = serializers.SerializerMethodField()
    formatted_value = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'value', 'unit', 'unit_display', 'formatted_value', 'price', 'stock']

    def get_unit_display(self, obj):
        return dict(UnitType.choices)[obj.unit]

    def get_formatted_value(self, obj):
        return obj.get_formatted_value()

class ProductSerializer(ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'variants']