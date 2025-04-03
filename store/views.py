from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Max, Q
from django.http import JsonResponse
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import DetailView
from django.contrib import messages
import logging
logger = logging.getLogger(__name__)
from django.core.paginator import Paginator
import json
from .models import Product, Category, Location, NGO, Cart, CartItem, UnitType, ProductVariant  # Add UnitType and ProductVariant import
from django.core.exceptions import ObjectDoesNotExist
from decimal import Decimal
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction, DatabaseError
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from .utils import send_otp_email, verify_otp

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
    """View to handle product search."""
    query = request.GET.get('query', '')
    products = Product.objects.all()
    
    if query:
        products = products.filter(
            Q(name__icontains=query) |
            Q(description__icontain=query)
        )

    context = {
        'products': products,
        'query': query,
        'categories': Category.objects.all(),
    }
    return render(request, 'store/search_results.html', context)


def product_detail(request, product_id):
    product = get_object_or_404(
        Product.objects.prefetch_related('variants'),
        id=product_id
    )
    
    context = {
        'product': product,
        'variants': product.variants.all(),
        'variant_summary': product.get_variant_summary()  # Changed from get_variants_summary
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

def search_products(request):
    query = request.GET.get('query', '')
    if query:
        products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query)
        )[:5]
        products_data = [{
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'price': str(product.price),
            'image': product.primary_image.image.url if product.primary_image else None,
            'url': f'/product/{product.id}/'
        } for product in products]
        return JsonResponse({'products': products_data})
    
    return JsonResponse({'products': []})


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

def cart_view(request):
    """View to display and handle the shopping cart"""
    cart = request.session.get('cart', {})
    
    # Calculate cart totals
    subtotal = Decimal('0.00')
    total_items = 0
    
    for item in cart.values():
        item_total = Decimal(str(item['price'])) * item['quantity']
        item['total'] = str(item_total)
        subtotal += item_total
        total_items += item['quantity']
    
    # Calculate shipping and total
    shipping = Decimal('50.00') if cart else Decimal('0.00')
    total = subtotal + shipping

    context = {
        'cart': cart,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'total_items': total_items
    }
    
    return render(request, 'store/cart.html', context)

@require_POST
def add_to_cart(request):
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        variant_id = data.get('variant_id')
        quantity = int(data.get('quantity', 1))
        
        product = get_object_or_404(Product, id=product_id)
        
        # Initialize cart
        cart = request.session.get('cart', {})
        
        if product.has_variants:
            if not variant_id:
                return JsonResponse({
                    'success': False,
                    'message': 'Please select a variant'
                })
            
            variant = get_object_or_404(ProductVariant, id=variant_id, product_id=product_id)
            if variant.stock < quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {variant.stock} items available'
                })
            
            item_key = f'variant_{variant_id}'
            price = variant.price
            max_quantity = variant.stock
        else:
            if product.stock < quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {product.stock} items available'
                })
            
            item_key = f'product_{product_id}'
            price = product.price
            max_quantity = product.stock
        
        # Update or add to cart
        if item_key in cart:
            cart[item_key]['quantity'] += quantity
        else:
            cart[item_key] = {
                'product_id': product_id,
                'variant_id': variant_id,
                'quantity': quantity,
                'price': str(price),
                'name': product.name,
                'image': product.primary_image.image.url if product.primary_image else None,
                'max_quantity': max_quantity
            }
        
        request.session['cart'] = cart
        request.session.modified = True
        
        # Calculate totals
        total_items = sum(item['quantity'] for item in cart.values())
        total_amount = sum(
            Decimal(item['price']) * item['quantity'] 
            for item in cart.values()
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Item added to cart',
            'cart': {
                'total_items': total_items,
                'total_amount': str(total_amount),
                'items': list(cart.values())
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        })

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
        
        if not item_key:
            return JsonResponse({
                'success': False,
                'message': 'Item key is required'
            }, status=400)

        # Get cart from session
        cart = request.session.get('cart', {})
        
        # Update item if it exists
        if item_key in cart:
            item = cart[item_key]
            
            # Validate quantity against max stock
            max_quantity = item['max_quantity']
            if quantity > max_quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Only {max_quantity} items available'
                }, status=400)
            
            # Update quantity
            item['quantity'] = quantity
            item['total'] = str(Decimal(str(item['price'])) * quantity)
            
            # Save cart
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
                'message': 'Cart updated successfully',
                'item_total': item['total'],
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
    except ValueError as e:
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
    cart_manager = CartManager(request)
    cart = cart_manager.cart
    
    if request.method == 'POST':
        # Handle the AJAX request from cart page
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'status': 'success'})
    
    cart_items = cart.items.select_related('product').all()
    
    context = {
        'cart_items': cart_items,
        'subtotal': cart.total_amount,
        'shipping': Decimal('50.00') if cart.total_items else Decimal('0.00'),
        'total': cart.total_amount + (Decimal('50.00') if cart.total_items else Decimal('0.00'))
    }
    return render(request, 'store/checkout.html', context)

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
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        try:
            user = User.objects.filter(email=email).first()
            
            if not user:
                return JsonResponse({
                    'status': 'error',
                    'message': 'User not found'
                })

            if not user.check_password(password):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid password'
                })

            if not user.profile.is_verified:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Please verify your account first'
                })
            
            login(request, user)
            
            return JsonResponse({
                'status': 'success',
                'redirect_url': reverse('store:home'),
                'message': f'Welcome back, {user.first_name}!'
            })

        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })

    return render(request, 'store/login.html')

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
def register_view(request):
    if request.method == 'POST':
        try:
            # Get form data
            phone = request.POST.get('phone')
            email = request.POST.get('email')
            name = request.POST.get('name')
            password = request.POST.get('password')
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Email already registered'
                })

            if User.objects.filter(profile__phone_number=phone).exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Phone number already registered'
                })

            # Create user with is_active=False
            with transaction.atomic():
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=name,
                    is_active=False
                )
                
                user.profile.phone_number = phone
                user.profile.save()
                
                # Store user_id in session
                request.session['registration_user_id'] = user.id
                
                # Send OTP
                try:
                    if send_otp_email(email):
                        return JsonResponse({
                            'status': 'success',
                            'redirect_url': reverse('store:verify_otp')
                        })
                    else:
                        # If OTP sending fails, rollback transaction
                        raise ValidationError('Failed to send OTP')
                except Exception as e:
                    # Rollback by deleting the user
                    user.delete()
                    raise ValidationError(f'OTP sending failed: {str(e)}')

        except ValidationError as ve:
            logger.error(f"Validation error during registration: {str(ve)}")
            return JsonResponse({
                'status': 'error',
                'message': str(ve)
            }, status=400)
        except DatabaseError as de:
            logger.error(f"Database error during registration: {str(de)}")
            return JsonResponse({
                'status': 'error',
                'message': 'Database error occurred'
            }, status=500)
        except Exception as e:
            logger.error(f"Unexpected error during registration: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'An unexpected error occurred'
            }, status=500)
    
    return render(request, 'store/register.html')

@ensure_csrf_cookie
@csrf_protect
def verify_otp(request):
    user_id = request.session.get('registration_user_id')
    if not user_id:
        return redirect('store:register')
    
    try:
        user = User.objects.get(id=user_id, is_active=False)
    except User.DoesNotExist:
        return redirect('store:register')
        
    if request.method == 'POST':
        try:
            otp = request.POST.get('otp')
            email = user.email
            
            if verify_otp(email, otp):
                # Activate user and set profile as verified
                user.is_active = True
                user.save()
                user.profile.is_verified = True
                user.profile.save()
                
                # Clear session
                del request.session['registration_user_id']
                
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
                    'message': 'Invalid OTP'
                })
        except Exception as e:
            logger.error(f"OTP verification error: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'An error occurred during verification'
            })
            
    return render(request, 'store/verify_otp.html', {
        'email': user.email
    })

# Remove success_page view as we're redirecting directly to verify_otp

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

def send_otp(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        if send_otp_email(email):
            return JsonResponse({
                'status': 'success',
                'message': 'OTP sent successfully'
            })
        return JsonResponse({
            'status': 'error',
            'message': 'Failed to send OTP'
        })
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    })

def verify_otp_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        otp_code = request.POST.get('otp')
        
        if verify_otp(email, otp_code):
            return JsonResponse({
                'status': 'success',
                'message': 'OTP verified successfully'
            })
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid OTP'
        })
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    })

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
        data = json.loads(request.body)
        product_ids = data.get('product_ids', [])

        stock_data = []
        for product_id in product_ids:
            product = get_object_or_404(Product, id=product_id)
            
            # Handle variants
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

        return JsonResponse({
            'success': True,
            'stock_data': stock_data
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Product not found'
        }, status=404)
    except Exception as e:
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

def about(request):
    return render(request, 'store/about.html')