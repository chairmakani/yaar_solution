from decimal import Decimal
from .models import Category, NGO, Product, ProductVariant
from collections import defaultdict

def global_data(request):
    categories = Category.objects.prefetch_related('products').all()
    # Group NGOs by location for dropdown menu
    ngos = NGO.objects.all()
    ngo_menu = defaultdict(list)
    for ngo in ngos:
        ngo_menu[ngo.location].append(ngo)
    
    # Cart data
    cart = request.session.get('cart', {})
    cart_total_items = sum(item.get('quantity', 0) for item in cart.values())
    cart_total_amount = sum(
        Decimal(str(item.get('price', '0'))) * item.get('quantity', 0) 
        for item in cart.values()
    )

    return {
        'categories': categories,
        'ngo_menu': dict(ngo_menu),
        'cart': {
            'total_items': cart_total_items,
            'total_amount': str(cart_total_amount)
        }
    }

def cart_context(request):
    cart = request.session.get('cart', {})
    cart_items = []
    total_amount = Decimal('0.00')

    for key, item in cart.items():
        try:
            quantity = item['quantity']
            price = Decimal(str(item['price']))
            item['total'] = quantity * price
            total_amount += item['total']
            cart_items.append(item)
        except (KeyError, ValueError, TypeError):
            continue

    shipping = Decimal('50.00') if cart_items else Decimal('0.00')
    
    return {
        'cart': cart,
        'cart_items': cart_items,
        'cart_total': total_amount,
        'shipping': shipping,
        'total': total_amount + shipping
    }
