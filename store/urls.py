from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views

app_name = 'store'  # Add namespace

urlpatterns = [
    path('', views.main_view, name='main'),  # Changed from home_view to main_view
    path('shop/', views.shop_view, name='home'),  # Previous home view now as shop
    path('search/', views.product_search, name='product_search'),  # Change name to product_search
    path('product/<int:product_id>/', views.product_detail, name='product_detail'),
    path('category/<int:category_id>/', views.category_products, name='category_products'),
    path('api/search-products/', views.product_search, name='api_search_products'),  # Update this line
    path('api/search/suggestions/', views.search_suggestions, name='search_suggestions'),  # Add this line
    path('ngo/<int:ngo_id>/', views.ngo_detail, name='ngo_detail'),  # Change from ngos/ to ngo/ for consistency
    path('ngos/', views.ngo_list, name='ngo_list'),  # Add this line for NGO listing
    path('cart/', views.cart_view, name='cart'),
    path('cart/update/', views.update_cart, name='cart_update'),  # Update name to cart_update
    path('cart/remove/', views.remove_from_cart, name='cart_remove'),  # Update name to cart_remove
    path('checkout/', views.checkout_view, name='checkout'),  # Keep only this checkout URL
    path('api/cart/add/', views.add_to_cart, name='add_to_cart'),  # Changed name to avoid conflicts
    path('cart/add/', views.add_to_cart, name='cart_add'),  # Changed fro  m add_to_cart
    path('api/cart/get-state/', views.get_cart, name='cart_state'),  # Add this line
    path('api/cart/update/', views.update_cart, name='cart_update'),  # Update this line
    path('api/cart/remove/', views.remove_from_cart, name='api_cart_remove'),  # Update this line - make sure only one exists
    path('order/success/', views.order_success, name='order_success'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),  # Update this line
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', views.profile_view, name='profile'),  # Add this line
    path('profile/orders/', views.orders_view, name='orders'),  # Add this line
    path('profile/settings/', views.settings_view, name='settings'),  # Add this line
    path('profile/address/add/', views.add_address, name='add_address'),
    path('profile/wishlist/toggle/', views.toggle_wishlist, name='toggle_wishlist'),
    path('wishlist/add/', views.add_to_wishlist, name='add_to_wishlist'),  # Add this line
    path('profile/order/<int:order_id>/', views.get_order_details, name='order_details'),
    path('verify-otp/', views.verify_otp_view, name='verify_otp'),  # Fix view name
    path('resend-codes/', views.resend_verification_codes, name='resend_codes'),
    path('send-otp/', views.send_otp, name='send_otp'),
    path('api/stock/check/', views.check_stock, name='check_stock'),
    path('api/profile/update/', views.update_profile, name='update_profile'),
    path('about/', views.about, name='about'),
    path('privacy-policy/', views.privacy_policy, name='privacy-policy'),
    path('shipping-policy/', views.shipping_policy, name='shipping-policy'),
    path('terms-policy/', views.terms_policy, name='terms-policy'),
    path('return-and-cancellation-policy/', views.return_and_cancellation_policy, name='return-and-cancellation-policy'),
    path('contact/', views.contact_view, name='contact'),
    path('contact/submit/', views.contact_submit, name='contact_submit'),
]