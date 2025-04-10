from decimal import Decimal
from django.core.cache import cache
from django.db.models import Prefetch
from .models import Category, NGO, Product, ProductVariant, Location
from collections import defaultdict

def global_data(request):
    """Global context data with caching for better performance"""
    
    # Try to get cached data first
    cache_key = 'global_context_data'
    cached_data = cache.get(cache_key)
    
    if not cached_data:
        # Get categories with prefetched products
        categories = Category.objects.prefetch_related(
            Prefetch('products', queryset=Product.objects.filter(is_active=True))
        ).all()

        # Get locations with prefetched NGOs
        locations = Location.objects.prefetch_related('ngos').all()
        ngo_menu = {}
        for location in locations:
            ngo_menu[location.name] = list(location.ngos.all())

        # Cache the expensive queries
        cached_data = {
            'categories': categories,
            'ngo_menu': ngo_menu,
        }
        cache.set(cache_key, cached_data, timeout=300)  # Cache for 5 minutes
    
    # Get cart data from session (this should always be fresh)
    cart = request.session.get('cart', {})
    cart_total_items = sum(item.get('quantity', 0) for item in cart.values())
    cart_total_amount = Decimal('0.00')
    
    for item in cart.values():
        try:
            quantity = item.get('quantity', 0)
            price = Decimal(str(item.get('price', '0')))
            cart_total_amount += quantity * price
        except (TypeError, ValueError):
            continue

    # Combine cached data with dynamic data
    context = {
        **cached_data,
        'cart': {
            'total_items': cart_total_items,
            'total_amount': str(cart_total_amount),
            'items': cart.values(),
            'shipping': str(Decimal('50.00') if cart_total_items > 0 else Decimal('0.00')),
            'total': str(cart_total_amount + (Decimal('50.00') if cart_total_items > 0 else Decimal('0.00')))
        },
        'user_authenticated': request.user.is_authenticated,
    }

    return context

def cart_context(request):
    """Dedicated cart context processor"""
    cart = request.session.get('cart', {})
    cart_items = []
    total_amount = Decimal('0.00')

    for key, item in cart.items():
        try:
            quantity = int(item.get('quantity', 0))
            price = Decimal(str(item.get('price', '0')))
            item_total = quantity * price
            
            cart_items.append({
                **item,
                'key': key,
                'total': str(item_total)
            })
            total_amount += item_total
        except (ValueError, TypeError, KeyError):
            continue

    shipping = Decimal('50.00') if cart_items else Decimal('0.00')
    
    return {
        'cart_data': {
            'items': cart_items,
            'subtotal': str(total_amount),
            'shipping': str(shipping),
            'total': str(total_amount + shipping),
            'item_count': len(cart_items),
            'total_items': sum(item.get('quantity', 0) for item in cart.values())
        }
    }
