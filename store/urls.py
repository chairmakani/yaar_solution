from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views
from django.conf import settings
from django.conf.urls.static import static

app_name = 'store'  # Add namespace

urlpatterns = [
    path('', views.home, name='home'),
    path('search/', views.product_search, name='product_search'),  # Change name to product_search
    path('product/<int:product_id>/', views.product_detail, name='product_detail'),
    path('category/<int:category_id>/', views.category_products, name='category_products'),
    path('api/search-products/', views.search_products, name='api_search_products'),
    path('ngo/<int:ngo_id>/', views.ngo_detail, name='ngo_detail'),  # Change from ngos/ to ngo/ for consistency
    path('ngos/', views.ngo_list, name='ngo_list'),  # Add this line for NGO listing
    path('cart/', views.cart_view, name='cart'),
    path('cart/update/', views.update_cart, name='cart_update'),  # Update name to cart_update
    path('cart/remove/', views.remove_from_cart, name='cart_remove'),  # Update name to cart_remove
    path('checkout/', views.checkout_view, name='checkout'),
    path('api/cart/add/', views.add_to_cart, name='add_to_cart'),
    path('api/cart/remove/', views.remove_from_cart, name='remove_from_cart'),
    path('api/cart/get-state/', views.get_cart, name='cart_state'),  # Add this line
    path('api/order/create/', views.create_order, name='create_order'),
    path('order/success/', views.order_success, name='order_success'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('resend-codes/', views.resend_verification_codes, name='resend_codes'),
    path('send-otp/', views.send_otp, name='send_otp'),
    path('api/stock/check/', views.check_stock, name='check_stock'),
    path('about/', views.about, name='about'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)