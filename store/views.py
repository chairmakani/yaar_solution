import time
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Max, Q, Sum  # Add Sum
from django.http import JsonResponse
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import DetailView
from django.contrib import messages
import logging
logger = logging.getLogger(__name__)
from django.core.paginator import Paginator
import json
from .models import (
    Product, Category, Location, NGO, Cart, CartItem, 
    UnitType, ProductVariant, OTP, Order, Address,  # Add Address here
    WishlistItem, UserActivity ,  OrderItem ,  # Add these as well since they're used in profile_view
)
from django.core.exceptions import ObjectDoesNotExist
from decimal import Decimal
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, OperationalError, transaction, DatabaseError
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from .utils import send_otp_email, verify_otp

import razorpay
from django.conf import settings

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

def home(request):
    """View to render the homepage with categories and products."""
    products = Product.objects.all().select_related('category')
    
    # Enhanced sorting logic
    sort_option = request.GET.get('sort', 'default')
    
    # Apply sorting with proper handling
    if sort_option and sort_option != 'default':
        if sort_option == 'price-low-high':
            products = products.order_by('price')
        elif sort_option == 'price-high-low':
            products = products.order_by('-price')

    # Fetch categories and products from the database
    categories = Category.objects.all()
    ngo_menu = {
        location.name: location.ngos.all()
        for location in Location.objects.prefetch_related('ngos')
    }

    # Price filter logic
    max_price = products.aggregate(Max('price'))['price__max'] or 0
    min_price = int(request.GET.get('min_price', 0))
    max_price_range = int(request.GET.get('max_price', max_price))
    filtered_products = products.filter(price__gte=min_price, price__lte=max_price_range)

    # Pagination logic
    page = int(request.GET.get('page', 1))
    products_per_page = 9
    total_products = filtered_products.count()
    total_pages = -(-total_products // products_per_page)  # Calculate total pages
    paginated_products = filtered_products[(page - 1) * products_per_page:page * products_per_page]

    # Adjust the filtered max price if filters apply
    max_price_filtered = (
        filtered_products.aggregate(Max('price'))['price__max']
        if filtered_products.exists()
        else max_price
    )

    # Context for rendering
    context = {
        'categories': categories,
        'products': paginated_products,
        'total_pages': total_pages,
        'current_page': page,
        'sort_option': sort_option,
        'min_price': min_price,
        'max_price': max_price_range,
        'max_price_filtered': max_price_filtered,
        'ngo_menu': ngo_menu,
    }

    return render(request, 'store/home.html', context)


def product_search(request):
    """View to handle both API and page search requests"""
    query = request.GET.get('query', '') or request.GET.get('q', '')
    products = Product.objects.all()
    
    if query:
        products = products.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query)  # Fixed typo: icontain -> icontains
        )

        # If it's an API request, return JSON
        if request.path.startswith('/api/'):
            products_data = [{
                'id': product.id,
                'name': product.name,
                'description': product.description[:100] if product.description else '',
                'price': str(product.price),
                'image': product.primary_image.image.url if product.primary_image else None,
                'url': reverse('store:product_detail', args=[product.id])
            } for product in products[:5]]  # Limit to 5 results for API
            
            return JsonResponse({'products': products_data})

        # For page requests, return template
        context = {
            'products': products,
            'query': query,
            'categories': Category.objects.all(),
        }
        return render(request, 'store/search_results.html', context)

    # Return empty results for API requests
    if request.path.startswith('/api/'):
        return JsonResponse({'products': []})
        
    # Return search page for empty queries
    return render(request, 'store/search_results.html', {
        'products': [],
        'query': '',
        'categories': Category.objects.all(),
    })


def product_detail(request, product_id):
    """View to display product details with cart state"""
    product = get_object_or_404(
        Product.objects.prefetch_related('variants', 'images'),
        id=product_id
    )
    
    # Get cart state for this product
    cart = request.session.get('cart', {})
    cart_item = None
    
    if product.has_variants:
        variant_keys = [k for k in cart.keys() if k.startswith(f'variant_') and 
                       cart[k]['product_id'] == product_id]
        if variant_keys:
            cart_item = cart[variant_keys[0]]
    else:
        product_key = f'product_{product_id}'
        if product_key in cart:
            cart_item = cart[product_key]
    
    context = {
        'product': product,
        'variants': product.variants.filter(is_active=True) if product.has_variants else None,
        'cart_item': cart_item,
        'stock_info': product.check_stock_status(),
    }
    
    return render(request, 'store/product_detail.html', context)


def category_products(request, category_id):
    category = get_object_or_404(Category, id=category_id)
    products = Product.objects.filter(category=category)
    
    # Sort products
    sort_option = request.GET.get('sort', 'default')
    if sort_option == 'price-low-high':
        products = products.order_by('price')
    elif sort_option == 'price-high-low':
        products = products.order_by('-price')
    elif sort_option == 'name-a-z':
        products = products.order_by('name')
    elif sort_option == 'name-z-a':
        products = products.order_by('-name')

    # Price filter
    max_price = products.aggregate(Max('price'))['price__max'] or 0
    min_price = int(request.GET.get('min_price', 0))
    max_price_range = int(request.GET.get('max_price', max_price))
    
    if min_price or max_price_range < max_price:
        products = products.filter(price__gte=min_price, price__lte=max_price_range)

    # Get the filtered max price
    max_price_filtered = products.aggregate(Max('price'))['price__max'] or 0

    # Pagination
    page = int(request.GET.get('page', 1))
    paginator = Paginator(products, 12)  # 12 products per page
    try:
        products = paginator.page(page)
    except:
        products = paginator.page(1)

    context = {
        'category': category,
        'products': products,
        'categories': Category.objects.all(),
        'sort_option': sort_option,
        'min_price': min_price,
        'max_price': max_price_range,
        'max_price_filtered': max_price_filtered,
        'current_page': page,
        'total_pages': paginator.num_pages,
        'products_count': products.paginator.count,
    }
    
    return render(request, 'store/category_products.html', context)


def ngo_list(request):
    ngos = NGO.objects.all()
    return render(request, 'ngo_list.html', {'ngos': ngos})

def ngo_detail(request, ngo_id):
    """View to display details of a specific NGO."""
    ngo = get_object_or_404(NGO, id=ngo_id)
    return render(request, 'store/ngo_detail.html', {'ngo': ngo})


class CartManager:
    def __init__(self, request):
        self.request = request
        self.session = request.session
        self._cart = None
        self.cart_id = self.session.get('cart_id')

    @property
    def cart(self):
        if self._cart is None:
            if self.request.user.is_authenticated:
                self._cart, _ = Cart.objects.get_or_create(
                    user=self.request.user,
                    is_active=True
                )
            elif self.cart_id:
                self._cart = Cart.objects.filter(id=self.cart_id, is_active=True).first()
            
            if not self._cart:
                self._cart = Cart.objects.create()
            
            self.session['cart_id'] = self._cart.id
        return self._cart

    def add_item(self, product_id, quantity=1):
        product = get_object_or_404(Product, id=product_id, is_available=True)
        cart_item, created = CartItem.objects.get_or_create(
            cart=self.cart,
            product=product,
            defaults={'price': product.price}
        )
        
        if not created:
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
            
        cart_item.save()
        return cart_item

    def remove_item(self, product_id):
        CartItem.objects.filter(cart=self.cart, product_id=product_id).delete()

    def update_quantity(self, product_id, quantity):
        if quantity < 1:
            self.remove_item(product_id)
            return
            
        cart_item = CartItem.objects.filter(cart=self.cart, product_id=product_id).first()
        if cart_item:
            cart_item.quantity = quantity
            cart_item.save()

    def clear(self):
        if self.cart_id:
            Cart.objects.filter(id=self.cart_id).delete()
            del self.session['cart_id']

    @property
    def get_total(self):
        """Get cart items total"""
        return sum(item.total_price for item in self.cart.items.all())

def cart_view(request):
    """View to display and handle the shopping cart"""
    cart = request.session.get('cart', {})
    
    # Format cart items for template
    formatted_cart = []
    subtotal = Decimal('0.00')
    total_items = 0
    
    for item_key, item in cart.items():
        item_data = {
            'key': item_key,
            'product_id': item['product_id'],
            'name': item['name'],
            'price': item['price'],
            'quantity': item['quantity'],
            'total': str(Decimal(item['price']) * item['quantity']),
            'image': item['image'],
            'max_quantity': item['max_quantity'],
            'default_unit': item.get('default_unit', 'pc'),  # Add default unit
            'variant': None
        }
        
        # Include variant information if exists
        if 'variant' in item:
            item_data['variant'] = {
                'value': item['variant'].get('value'),
                'unit': item['variant'].get('unit'),
                'price': item['variant'].get('price'),
                'stock': item['variant'].get('stock')
            }
        
        formatted_cart.append(item_data)
        subtotal += Decimal(item_data['total'])
        total_items += item['quantity']
    
    shipping = Decimal('50.00') if formatted_cart else Decimal('0.00')
    total = subtotal + shipping

    context = {
        'cart': formatted_cart,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'total_items': total_items
    }
    
    return render(request, 'store/cart.html', context)

from django.views.decorators.http import require_http_methods

@require_http_methods(["POST", "OPTIONS"])
def add_to_cart(request):
    if request.method == "OPTIONS":
        response = JsonResponse({'status': 'ok'})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken"
        return response

    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        variant_id = data.get('variant_id')
        quantity = int(data.get('quantity', 1))
        
        # Validate quantity
        if quantity < 1:
            return JsonResponse({'success': False, 'message': 'Invalid quantity'}, status=400)

        # Verify the product exists
        product = get_object_or_404(Product, id=product_id)
        
        # Handle variants vs standard products
        if product.has_variants:
            if not variant_id:
                return JsonResponse({
                    'success': False,
                    'message': 'Please select a variant'
                }, status=400)
            
            variant = get_object_or_404(ProductVariant, id=variant_id, product_id=product_id)

            if variant.stock < quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {variant.stock} items available'
                }, status=400)
            
            item_key = f'variant_{variant_id}'
            price = variant.price
            max_quantity = variant.stock
            product_name = f"{product.name} - {variant.value} {variant.get_unit_display()}"
            
            image_url = variant.image.url if getattr(variant, 'image', None) else (
                product.primary_image.image.url if product.primary_image else None
            )

        else:
            if product.stock < quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {product.stock} items available'
                }, status=400)
            
            item_key = f'product_{product_id}'
            price = product.price
            max_quantity = product.stock
            product_name = product.name
            image_url = product.primary_image.image.url if product.primary_image else None

        # Get or create cart from session
        cart = request.session.get('cart', {})

        # Update or add to cart
        if item_key in cart:
            total_quantity = cart[item_key]['quantity'] + quantity
            if total_quantity > max_quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Cannot add more items. Maximum available: {max_quantity}'
                }, status=400)
            cart[item_key]['quantity'] = total_quantity
        else:
            cart[item_key] = {
                'product_id': product_id,
                'variant_id': variant_id,
                'quantity': quantity,
                'price': str(price),  # store as string to avoid float precision issues
                'name': product_name,
                'image': image_url,
                'max_quantity': max_quantity
            }
        
        # Save updated cart back to session
        request.session['cart'] = cart
        request.session.modified = True

        # Calculate cart totals
        total_items = sum(item['quantity'] for item in cart.values())
        total_amount = sum(Decimal(item['price']) * item['quantity'] for item in cart.values())

        cart_data = {
            'total_items': total_items,
            'total_amount': str(total_amount),
            'items': list(cart.values())
        }

        # Ensure proper JSON response headers
        response = JsonResponse({
            'success': True,
            'message': 'Added to cart successfully',
            'cart': cart_data
        })
        response['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        logger.error(f"Add to cart error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=500, content_type='application/json')

@require_POST
def remove_from_cart(request):
    try:
        data = json.loads(request.body)
        item_key = data.get('item_key')
        
        if not item_key:
            return JsonResponse({
                'success': False,
                'message': 'Item key is required'
            }, status=400)

        # Get cart from session
        cart = request.session.get('cart', {})
        
        # Remove item if it exists
        if (item_key in cart):
            del cart[item_key]
            request.session['cart'] = cart
            request.session.modified = True
            
            # Calculate new totals
            subtotal = sum(
                Decimal(str(item['price'])) * item['quantity'] 
                for item in cart.values()
            )
            total_items = sum(item['quantity'] for item in cart.values())
            
            return JsonResponse({
                'success': True,
                'message': 'Item removed successfully',
                'cart': {
                    'subtotal': str(subtotal),
                    'total': str(subtotal + Decimal('50.00') if cart else Decimal('0.00')),
                    'total_items': total_items,
                    'items': list(cart.values())
                }
            })
        
        return JsonResponse({
            'success': False,
            'message': 'Item not found in cart'
        }, status=404)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@require_POST
def update_cart(request):
    try:
        data = json.loads(request.body)
        item_key = data.get('item_key')
        quantity = int(data.get('quantity', 1))
        
        # Get cart from session
        cart = request.session.get('cart', {})
        
        if item_key in cart:
            item = cart[item_key]
            
            # Validate quantity
            max_quantity = item['max_quantity']
            if quantity > max_quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {max_quantity} items available'
                }, status=400)
            
            # Update quantity and calculate new total
            item['quantity'] = quantity
            item_total = Decimal(str(item['price'])) * quantity
            
            # Calculate cart totals
            subtotal = sum(
                Decimal(str(item['price'])) * item['quantity'] 
                for item in cart.values()
            )
            shipping = Decimal('50.00') if cart else Decimal('0.00')
            total = subtotal + shipping
            
            # Save cart
            cart[item_key]['total'] = str(item_total)
            request.session['cart'] = cart
            request.session.modified = True
            
            return JsonResponse({
                'success': True,
                'message': 'Cart updated successfully',
                'item_total': str(item_total),
                'cart': {
                    'subtotal': str(subtotal),
                    'shipping': str(shipping),
                    'total': str(total),
                    'total_items': sum(item['quantity'] for item in cart.values()),
                    'total_amount': str(total),
                    'items': list(cart.values())
                }
            })
        
        return JsonResponse({
            'success': False,
            'message': 'Item not found in cart'
        }, status=404)
        
    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@login_required
def checkout_view(request):
    """Handle checkout process"""
    if request.method == 'POST':
        try:
            # Get cart and address
            cart_manager = CartManager(request)
            cart = cart_manager.cart
            address_id = request.POST.get('address_id')
            
            if not address_id:
                messages.error(request, 'Please select a delivery address')
                return redirect('store:checkout')
            
            address = get_object_or_404(Address, id=address_id, user=request.user)
            
            # Calculate amounts
            items_total = cart.total_amount
            shipping_fee = Decimal('50.00')
            tax_amount = items_total * Decimal('0.18')  # 18% GST
            total_amount = items_total + shipping_fee + tax_amount
            
            # Create Razorpay order
            razorpay_order = razorpay_client.order.create({
                'amount': int(total_amount * 100),  # Amount in paise
                'currency': 'INR',
                'payment_capture': '1'
            })
            
            # Create order in database
            order = Order.objects.create(
                user=request.user,
                address=address,
                items_total=items_total,
                shipping_fee=shipping_fee,
                tax_amount=tax_amount,
                total_amount=total_amount,
                razorpay_order_id=razorpay_order['id'],
                payment_method='razorpay'
            )
            
            # Create order items
            for item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    variant=item.variant,
                    quantity=item.quantity,
                    price=item.price,
                    total=item.total_price
                )
            
            # Clear cart
            cart_manager.clear()
            
            # Pass data to payment page
            context = {
                'order': order,
                'razorpay_order_id': razorpay_order['id'],
                'razorpay_merchant_key': settings.RAZORPAY_KEY_ID,
                'razorpay_amount': int(total_amount * 100),
                'currency': 'INR',
                'callback_url': request.build_absolute_uri(reverse('store:paymenthandler'))
            }
            return render(request, 'store/payment.html', context)
            
        except Exception as e:
            messages.error(request, f'Checkout failed: {str(e)}')
            return redirect('store:cart')
    
    # GET request - show checkout form
    addresses = Address.objects.filter(user=request.user)
    cart_manager = CartManager(request)
    cart = cart_manager.cart
    
    # Calculate totals
    items_total = cart_manager.get_total
    shipping_fee = Decimal('50.00')
    tax_amount = items_total * Decimal('0.18')  # 18% GST
    total_amount = items_total + shipping_fee + tax_amount
    
    context = {
        'addresses': addresses,
        'cart': cart,
        'cart_items': cart.items.select_related('product', 'variant'),
        'RAZORPAY_KEY_ID': settings.RAZORPAY_KEY_ID,
        'items_total': items_total,
        'shipping_fee': shipping_fee,
        'tax_amount': tax_amount,
        'total_amount': total_amount
    }
    return render(request, 'store/checkout.html', context)

@login_required
@csrf_protect
def paymenthandler(request):
    """Handle Razorpay payment callback"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        # Get payment data
        payment_id = request.POST.get('razorpay_payment_id', '')
        order_id = request.POST.get('razorpay_order_id', '')
        signature = request.POST.get('razorpay_signature', '')
        
        # Get order from database
        order = get_object_or_404(Order, razorpay_order_id=order_id)
        
        # Verify signature
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        
        try:
            razorpay_client.utility.verify_payment_signature(params_dict)
        except Exception:
            # Signature verification failed
            order.status = 'failed'
            order.payment_status = 'failed'
            order.save()
            return render(request, 'store/payment_failed.html')
        
        # Payment successful
        order.status = 'confirmed'
        order.payment_status = 'paid'
        order.razorpay_payment_id = payment_id
        order.payment_date = timezone.now()
        order.save()
        
        # Record activity
        UserActivity.objects.create(
            user=request.user,
            activity_type='order',
            description=f'Order #{order.order_number} placed successfully'
        )
        
        return render(request, 'store/payment_success.html', {'order': order})
        
    except Exception as e:
        return render(request, 'store/payment_failed.html', {'error': str(e)})

def get_cart(request):
    """API endpoint to get current cart state"""
    cart_manager = CartManager(request)
    cart = cart_manager.cart
    
    return JsonResponse({
        'success': True,
        'cart': {
            'total_items': cart.total_items,
            'total_amount': str(cart.total_amount),
            'items': [{
                'id': item.id,
                'name': item.product.name,
                'price': str(item.price),
                'quantity': item.quantity,
                'image': item.product.primary_image.image.url if item.product.primary_image else None
            } for item in cart.items.all()]
        }
    })

@login_required
def order_success(request):
    """Display order success page"""
    return render(request, 'store/order_success.html', {
        'message': 'Your order has been placed successfully!'
    })

@login_required
@require_POST
def create_order(request):
    """Handle order creation after payment"""
    try:
        data = json.loads(request.body)
        payment_id = data.get('razorpay_payment_id')
        payment_method = data.get('payment_method')
        
        cart_manager = CartManager(request)
        cart = cart_manager.cart
        
        # Create order logic here
        # For now, just returning success response
        order_id = "ORD-" + str(cart.id)
        
        # Clear the cart after successful order
        cart_manager.clear()
        
        return JsonResponse({
            'success': True,
            'order_id': order_id,
            'message': 'Order created successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@ensure_csrf_cookie
@csrf_protect
def login_view(request):
    """Enhanced login view with better error handling and address check"""
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        try:
            # First try to get user by email
            user = User.objects.get(email=email)
            
            # Use Django's built-in authenticate function
            authenticated_user = authenticate(username=user.username, password=password)
            
            if authenticated_user is None:
                logger.warning(f"Failed login attempt for email: {email}")
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid email or password'
                })

            # Check if user is active
            if not authenticated_user.is_active:
                request.session['verification_user_id'] = authenticated_user.id
                return JsonResponse({
                    'status': 'verify_otp',
                    'message': 'Please complete your email verification'
                })

            # Check email verification
            if not authenticated_user.profile.email_verified:
                if send_otp_email(email):
                    request.session['login_user_id'] = authenticated_user.id
                    return JsonResponse({
                        'status': 'verify_otp',
                        'message': 'Please verify your email'
                    })
                else:
                    raise ValidationError('Failed to send verification code')

            # Log the user in
            login(request, authenticated_user)
            
            # Check if user has any address
            has_address = Address.objects.filter(user=authenticated_user).exists()
            
            if not has_address:
                return JsonResponse({
                    'status': 'success',
                    'redirect_url': reverse('store:profile') + '?address_required=true',
                    'message': f'Welcome back, {authenticated_user.first_name}! Please add a delivery address.'
                })
            
            return JsonResponse({
                'status': 'success',
                'redirect_url': reverse('store:home'),
                'message': f'Welcome back, {authenticated_user.first_name}!'
            })
                
        except User.DoesNotExist:
            logger.warning(f"Login attempt with non-existent email: {email}")
            return JsonResponse({
                'status': 'error',
                'message': 'No account found with this email'
            })
        except ValidationError as e:
            logger.error(f"Validation error during login: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })
        except Exception as e:
            logger.error(f"Unexpected login error: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'An error occurred during login'
            })

    return render(request, 'store/login.html')

# 🔹 Logout View
def logout_view(request):
    logout(request)
    messages.success(request, 'Logged out successfully.')
    return redirect('store:login')

# 🔹 Profile View (Optional - For Account Details)
@login_required
def profile_view(request):
    """Display user profile with comprehensive data"""
    user = request.user
    
    # Get recent orders with prefetch for efficiency
    recent_orders = Order.objects.filter(user=user).order_by('-created_at')[:5]
    
    # Get addresses
    addresses = Address.objects.filter(user=user)
    
    # Get wishlist items with proper image handling
    wishlist_items = WishlistItem.objects.filter(user=user).select_related('product')[:6]
    
    # Format wishlist items to handle missing images
    formatted_wishlist = []
    for item in wishlist_items:
        image_url = None
        if item.product.primary_image and item.product.primary_image.image:
            try:
                image_url = item.product.primary_image.image.url
            except ValueError:
                image_url = None
                
        formatted_wishlist.append({
            'id': item.id,
            'product': item.product,
            'image_url': image_url,
            'created_at': item.created_at
        })
    
    # Get recent activities
    recent_activities = UserActivity.objects.filter(user=user).order_by('-timestamp')[:5]
    
    # Calculate order statistics
    total_orders = Order.objects.filter(user=user).count()
    total_spent = Order.objects.filter(user=user).aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    active_orders = Order.objects.filter(
        user=user,
        status__in=['pending', 'processing', 'shipped']
    ).count()
    
    context = {
        'user': user,
        'recent_orders': recent_orders,
        'addresses': addresses,
        'wishlist_items': formatted_wishlist,  # Use formatted wishlist
        'recent_activities': recent_activities,
        'total_orders': total_orders,
        'total_spent': total_spent,
        'active_orders': active_orders,
    }
    
    return render(request, 'store/profile.html', context)

@login_required
@require_POST 
def update_profile(request):
    """Handle profile updates"""
    try:
        data = json.loads(request.body)
        user = request.user
        
        with transaction.atomic():
            # Update user info with validation
            first_name = data.get('first_name', '').strip()
            last_name = data.get('last_name', '').strip()
            email = data.get('email', '').strip()
            phone = data.get('phone', '').strip()
            
            if not first_name:
                raise ValidationError('First name is required')
                
            user.first_name = first_name
            user.last_name = last_name
            
            if email and email != user.email:
                if User.objects.filter(email=email).exclude(id=user.id).exists():
                    raise ValidationError('Email already in use')
                user.email = email
                user.profile.email_verified = False
            
            if phone:
                if not phone.isdigit() or len(phone) != 10:
                    raise ValidationError('Phone number must be 10 digits')
                user.profile.phone_number = phone
            
            user.save()
            user.profile.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully',
                'data': {
                    'full_name': user.get_full_name(),
                    'email': user.email,
                    'phone': user.profile.phone_number or ''
                }
            })
    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to update profile'
        }, status=500)

@login_required
@require_POST
def add_address(request):
    """Add a new address for the user"""
    try:
        data = json.loads(request.body)
        address = Address.objects.create(
            user=request.user,
            name=data['name'],
            phone=data['phone'],
            street=data['street'],
            city=data['city'],
            state=data['state'],
            pincode=data['pincode'],
            type=data['type']
        )
        
        return JsonResponse({
            'success': True,
            'address': {
                'id': address.id,
                'name': address.name,
                'type': address.type,
                'full_address': address.get_full_address()
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
@require_POST
def toggle_wishlist(request):
    """Add or remove product from wishlist"""
    try:
        product_id = json.loads(request.body)['product_id']
        product = get_object_or_404(Product, id=product_id)
        
        wishlist_item, created = WishlistItem.objects.get_or_create(
            user=request.user,
            product=product
        )
        
        if not created:
            wishlist_item.delete()
            action = 'removed'
        else:
            action = 'added'
            
        return JsonResponse({
            'success': True,
            'action': action,
            'message': f'Product {action} to wishlist'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)
        
@login_required
def get_order_details(request, order_id):
    """Get detailed information about a specific order"""
    try:
        order = get_object_or_404(Order, id=order_id, user=request.user)
        return JsonResponse({
            'success': True,
            'order': {
                'id': order.id,
                'created_at': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'status': order.status,
                'total_amount': str(order.total_amount),
                'items': [{
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'price': str(item.price)
                } for item in order.items.all()]
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
def orders_view(request):
    """Display user's orders"""
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'store/profile/orders.html', {'orders': orders})

@login_required
def settings_view(request):
    """Handle user settings"""
    if request.method == 'POST':
        # Handle settings update
        try:
            user = request.user
            user.first_name = request.POST.get('first_name', user.first_name)
            user.last_name = request.POST.get('last_name', user.last_name)
            user.email = request.POST.get('email', user.email)
            user.profile.phone_number = request.POST.get('phone', user.profile.phone_number)
            
            user.save()
            user.profile.save()
            
            messages.success(request, 'Profile updated successfully!')
            return redirect('store:settings')
            
        except Exception as e:
            messages.error(request, f'Error updating profile: {str(e)}')
    
    return render(request, 'store/profile/settings.html', {'user': request.user})

@ensure_csrf_cookie
@csrf_protect
def verify_account(request):
    user_id = request.session.get('verification_user_id')
    if not user_id:
        return redirect('store:login')
        
    if request.method == 'POST':
        code = request.POST.get('code')
        user = User.objects.get(id=user_id)
        cache_key = f'email_verification_{user_id}'
        stored_code = cache.get(cache_key)
        
        if code == stored_code:
            user.profile.is_verified = True
            user.profile.save()
            del request.session['verification_user_id']
            messages.success(request, 'Account verified successfully! Please login.')
            return redirect('store:login')
        else:
            messages.error(request, 'Invalid verification code')
    
    return render(request, 'store/verify_account.html')

@ensure_csrf_cookie
@csrf_protect
@require_http_methods(["GET", "POST"])
def register_view(request):
    """Handle user registration with GET and POST"""

    if request.method == 'GET':
        return render(request, 'store/register.html')

    try:
        # Get data based on content type
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST

        phone = data.get('phone')
        email = data.get('email')
        name = data.get('name')
        password = data.get('password')

        # Validate required fields
        if not all([phone, email, name, password]):
            return JsonResponse({
                'status': 'error',
                'message': 'All fields are required'
            }, status=400)

        # Check if user already exists
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return JsonResponse({
                'status': 'error',
                'message': 'A user with this email already exists'
            }, status=400)

        # Create user with is_active=False
        with transaction.atomic():
            names = name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''

            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=False
            )

            user.profile.phone_number = phone
            user.profile.save()

            # Store user ID in session for verification
            request.session['registration_user_id'] = user.id
            request.session['verification_user_id'] = user.id

            # Send OTP
            if send_otp_email(email):
                return JsonResponse({
                    'status': 'success',
                    'redirect_url': reverse('store:verify_otp')
                })
            else:
                raise ValidationError('Failed to send OTP')

    except ValidationError as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': 'Registration failed'
        }, status=500)

@ensure_csrf_cookie
@csrf_protect
def verify_otp_view(request):
    """Handle OTP verification with proper request handling"""
    if not request.session.get('registration_user_id'):
        return redirect('store:register')

    try:
        user = User.objects.get(
            id=request.session['registration_user_id'],
            is_active=False
        )

        if request.method == 'POST':
            otp_code = request.POST.get('otp')
            
            # Verify the OTP
            if check_otp(user.email, otp_code):
                with transaction.atomic():
                    user.is_active = True
                    user.save(update_fields=['is_active'])

                    user.profile.email_verified = True
                    user.profile.save(update_fields=['email_verified'])

                    # Clear session data
                    request.session.pop('registration_user_id', None)
                    request.session.modified = True

                    # Log the user in
                    login(request, user)

                    return JsonResponse({
                        'status': 'success',
                        'redirect_url': reverse('store:home'),
                        'message': 'Account verified successfully!'
                    })
            else:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid or expired OTP'
                })

        return render(request, 'store/verify_otp.html', {
            'email': user.email,
            'resend_available': True
        })

    except User.DoesNotExist:
        messages.error(request, 'Invalid verification attempt')
        return redirect('store:register')

def check_otp(email, otp_code):
    """Verify OTP for given email"""
    if not otp_code:
        return False
        
    try:
        otp_entry = OTP.objects.get(
            email=email, 
            otp=otp_code, 
            is_verified=False,
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        # Mark OTP as verified
        otp_entry.is_verified = True
        otp_entry.save(update_fields=['is_verified'])
        return True
        
    except OTP.DoesNotExist:
        return False

@require_POST
def resend_verification_codes(request):
    """Handle resending of verification codes with rate limiting"""
    try:
        # Get user from session
        user_id = request.session.get('verification_user_id')
        if not user_id:
            raise ValidationError('Invalid session')
        
        user = User.objects.get(id=user_id)
        
        # Check rate limiting for resend
        resend_key = f'resend_timeout_{user_id}'
        if cache.get(resend_key):
            raise ValidationError('Please wait before requesting new codes')

        # Send new verification codes
        email_code, phone_code = send_verification_codes(user)
        
        # Set resend timeout
        cache.set(resend_key, True, settings.VERIFICATION_RATE_LIMIT['RESEND_TIMEOUT'])

        logger.info(f"Verification codes resent successfully for user {user_id}")
        return JsonResponse({
            'success': True,
            'message': 'Verification codes sent successfully'
        })
        
    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=429)
    except User.DoesNotExist:
        logger.error(f"User not found for verification code resend: {user_id}")
        return JsonResponse({
            'success': False,
            'message': 'User not found'
        }, status=404)
    except Exception as e:
        logger.error(f"Error in resend_verification_codes: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': 'An error occurred'
        }, status=500)

def send_otp(email, otp_code=None):
    """Send OTP via email"""
    try:
        # Generate OTP if not provided
        if not otp_code:
            otp_code = get_random_string(length=6, allowed_chars='0123456789')
            
            # Delete any existing unverified OTPs for this email
            OTP.objects.filter(
                email=email,
                is_verified=False
            ).delete()
            
            # Create new OTP record
            expiry = timezone.now() + timezone.timedelta(minutes=10)
            OTP.objects.create(
                email=email,
                otp=otp_code,
                expires_at=expiry
            )
        
        # Send the email
        send_mail(
            subject='Your Verification Code',
            message=f'Your verification code is: {otp_code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return True
    except Exception as e:
        logger.error(f"Error sending OTP email: {str(e)}")
        return False

def check_otp(email, otp_code):
    """New function to verify OTP correctly"""
    try:
        otp_entry = OTP.objects.get(email=email, otp=otp_code, is_verified=False)
        if otp_entry.expires_at < timezone.now():
            return False
        otp_entry.is_verified = True  # Mark OTP as used
        otp_entry.save(update_fields=['is_verified'])
        return True
    except OTP.DoesNotExist:
        return False

def send_verification_codes(user):
    """Send verification codes via both email and SMS"""
    try:
        # Generate codes
        email_code = get_random_string(length=6, allowed_chars='0123456789')
        phone_code = get_random_string(length=6, allowed_chars='0123456789')
        
        # Store codes in cache with timeout
        timeout = getattr(settings, 'VERIFICATION_CODE_TIMEOUT', 300)  # 5 minutes default
        cache.set(f'email_verification_{user.id}', email_code, timeout)
        cache.set(f'phone_verification_{user.id}', phone_code, timeout)
        
        # Send email verification
        send_mail(
            subject='Your Verification Code',
            message=f'Your email verification code is: {email_code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Log phone code in development
        if settings.DEBUG:
            print(f"Phone verification code for {user.profile.phone_number}: {phone_code}")
            
        # Send SMS verification (implement your SMS gateway here)
        # TODO: Implement SMS sending
        # send_sms(user.profile.phone_number, f'Your verification code is: {phone_code}')
        
        return email_code, phone_code
        
    except Exception as e:
        logger.error(f"Error sending verification codes: {str(e)}")
        raise

# Add new function to clean up unverified users
def cleanup_unverified_users():
    """Delete unverified users after 24 hours"""
    expiry_time = timezone.now() - timezone.timedelta(hours=24)
    User.objects.filter(
        is_active=False,
        date_joined__lt=expiry_time
    ).delete()

class ProductDetailView(DetailView):
    model = Product
    template_name = 'store/product_detail.html'
    context_object_name = 'product'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        product = self.get_object()
        
        # Simplified variant data without packaging, color, size
        variants_data = []
        for variant in product.variants.filter(is_active=True):
            variants_data.append({
                'id': variant.id,
                'value': variant.value,
                'unit': variant.unit,
                'price': variant.price,
                'stock': variant.stock,
            })
        
        context['variants'] = variants_data
        return context

@require_POST 
def check_stock(request):
    """API endpoint to check stock levels for products"""
    try:
        # Get CSRF token from either header or request
        csrf_token = request.headers.get('X-CSRFToken') or request.COOKIES.get('csrftoken')
        
        # If no CSRF token found in standard places, check other common header variations
        if not csrf_token:
            csrf_token = (request.headers.get('X-CSRF-Token') or 
                         request.headers.get('CSRF-Token') or 
                         request.headers.get('Csrf-Token'))
        
        if not csrf_token and not request.is_ajax():
            return JsonResponse({
                'success': False,
                'message': 'CSRF verification failed. Please reload the page.'
            }, status=403)

        data = json.loads(request.body)
        product_ids = data.get('product_ids', [])

        stock_data = []
        for product_id in product_ids:
            try:
                product = Product.objects.get(id=product_id)
                if product.has_variants:
                    variants = product.variants.filter(is_active=True)
                    for variant in variants:
                        stock_data.append({
                            'product_id': product_id,
                            'variant_id': variant.id,
                            'stock': variant.stock,
                            'status': get_stock_status(variant.stock, product.stock_threshold)
                        })
                else:
                    stock_data.append({
                        'product_id': product_id,
                        'stock': product.stock,
                        'status': get_stock_status(product.stock, product.stock_threshold)
                    })
            except Product.DoesNotExist:
                continue

        return JsonResponse({
            'success': True,
            'stock_data': stock_data
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        logger.error(f"Stock check error: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

def get_stock_status(stock, threshold):
    """Helper function to determine stock status"""
    if stock <= 0:
        return 'out_of_stock'
    elif stock <= threshold:
        return 'low_stock'
    return 'in_stock'

# pages included

def about(request):
    return render(request, 'store/ourself/about.html')

def main(request):
    return render(request, 'store/main.html')

def privacy_policy(request):
    return render(request, 'store/policy/privacy_policy.html')

def shipping_policy(request):
    return render(request, 'store/policy/shipping_policy.html')

def terms_policy(request):
    return render(request, 'store/policy/terms_policy.html')

def return_and_cancellation_policy(request):
    return render(request, 'store/policy/return and cancellation_policy.html')

def contact_view(request):
    return render(request, 'store/ourself/contact.html')

@login_required
@require_POST
def add_to_wishlist(request):
    """Add a product to user's wishlist"""
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        variant_id = data.get('variant_id')
        
        # Verify the product exists
        product = get_object_or_404(Product, id=product_id)
        
        # Check if item already in wishlist
        wishlist_item, created = WishlistItem.objects.get_or_create(
            user=request.user,
            product=product
        )

        if created:
            # Record activity
            UserActivity.objects.create(
                user=request.user,
                activity_type='wishlist',
                description=f'Added {product.name} to wishlist'
            )
            message = 'Product added to wishlist'
        else:
            message = 'Product already in wishlist'

        return JsonResponse({
            'success': True,
            'message': message,
            'in_wishlist': True
        })

    except (TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({
            'success': False,
            'message': 'Invalid request data'
        }, status=400)
    except Exception as e:
        logger.error(f"Wishlist error: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to update wishlist'
        }, status=500)

from django.shortcuts import render

def main_view(request):
    """Landing page view using main.html"""
    categories = Category.objects.all()
    context = {
        'categories': categories,
    }
    return render(request, 'store/main.html', context)

def shop_view(request):
    """Shop view using previous home.html template"""
    products = Product.objects.all().select_related('category')
    
    # Enhanced sorting logic
    sort_option = request.GET.get('sort', 'default')
    
    # Apply sorting with proper handling
    if sort_option and sort_option != 'default':
        if sort_option == 'price-low-high':
            products = products.order_by('price')
        elif sort_option == 'price-high-low':
            products = products.order_by('-price')

    # Fetch categories
    categories = Category.objects.all()
    
    # Price filter logic
    max_price = products.aggregate(Max('price'))['price__max'] or 0
    min_price = int(request.GET.get('min_price', 0))
    max_price_range = int(request.GET.get('max_price', max_price))
    filtered_products = products.filter(price__gte=min_price, price__lte=max_price_range)

    # Pagination logic
    page = int(request.GET.get('page', 1))
    products_per_page = 9
    paginator = Paginator(filtered_products, products_per_page)
    try:
        paginated_products = paginator.page(page)
    except:
        paginated_products = paginator.page(1)

    context = {
        'categories': categories,
        'products': paginated_products,
        'sort_option': sort_option,
        'min_price': min_price,
        'max_price': max_price_range,
        'max_price_filtered': max_price,
        'current_page': page,
        'total_pages': paginator.num_pages
    }
    
    return render(request, 'store/home.html', context)