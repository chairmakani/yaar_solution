from django import template

register = template.Library()

@register.filter
def filter_by_unit(variants, unit):
    """Filter variants by unit value"""
    return variants.filter(unit=unit, is_active=True).exists()
