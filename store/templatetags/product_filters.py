from django import template

register = template.Library()

@register.filter
def filter_by_unit(variants, unit):
    """Filter variants by unit value"""
    return variants.filter(unit=unit, is_active=True).exists()

@register.filter
def in_cart(product_id, cart):
    """Check if a product is in the cart"""
    if not cart:
        return False
        
    # Check product directly
    product_key = f'product_{product_id}'
    if product_key in cart:
        return True
        
    # Check variants
    variant_keys = [k for k in cart.keys() if k.startswith('variant_') and 
                   cart[k]['product_id'] == product_id]
    return bool(variant_keys)

@register.filter
def get_cart_quantity(product_id, cart):
    """Get quantity of a product in cart"""
    if not cart:
        return 0
        
    total_quantity = 0
    
    # Check product directly
    product_key = f'product_{product_id}'
    if product_key in cart:
        total_quantity += cart[product_key]['quantity']
        
    # Check variants
    variant_keys = [k for k in cart.keys() if k.startswith('variant_') and 
                   cart[k]['product_id'] == product_id]
    for key in variant_keys:
        total_quantity += cart[key]['quantity']
        
    return total_quantity
