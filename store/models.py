from django.db import models
from django.urls import reverse
from django.conf import settings
from django.utils import timezone  # Add this import
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Location(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True, help_text="Location name must be unique")
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

def ngo_image_path(instance, filename):
    """Store NGO images in store/static/media/ngos/<ngo_id>/"""
    return f'ngos/{instance.id}/{filename}'

class NGO(models.Model):
    shg_name = models.CharField(max_length=200, db_index=True, help_text="Self Help Group name")
    panchayat_name = models.CharField(max_length=200, default='Default Panchayat')
    product = models.CharField(max_length=200, default='Default Product')
    contact_person = models.CharField(max_length=100, default='Contact Person')
    mobile_number = models.CharField(max_length=15, default='0000000000')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    image = models.ImageField(
        upload_to=ngo_image_path, 
        null=True, 
        blank=True,
        help_text="Image will be stored in store/static/media/ngos/<ngo_id>/"
    )
    location = models.ForeignKey(Location, related_name='ngos', on_delete=models.CASCADE)

    def get_absolute_url(self):
        return reverse('store:ngo_detail', args=[str(self.id)])

    def __str__(self):
        return self.shg_name

    class Meta:
        ordering = ['shg_name']
        indexes = [
            models.Index(fields=['location', 'shg_name']),
        ]
        verbose_name = "NGO"
        verbose_name_plural = "NGOs"

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='category_images/' , null=True, blank=True)

    def __str__(self):
        return self.name

class UnitType(models.TextChoices):
    GRAMS = 'g', 'Grams'
    KILOGRAMS = 'kg', 'Kilograms'
    MILLILITERS = 'ml', 'Milliliters'
    LITERS = 'l', 'Liters'
    PIECES = 'pc', 'Pieces'

class VariantType(models.Model):
    name = models.CharField(max_length=50)  # e.g., "Weight", "Volume"
    unit = models.CharField(
        max_length=10,
        choices=UnitType.choices,
        default=UnitType.PIECES
    )

    def __str__(self):
        return f"{self.name} ({self.unit})"

class StandardUnit(models.TextChoices):
    PIECES = 'pc', 'Pieces'
    GRAMS = 'g', 'Grams'
    KILOGRAMS = 'kg', 'Kilograms'
    MILLILITERS = 'ml', 'Milliliters'
    LITERS = 'l', 'Liters'
    METERS = 'm', 'Meters'
    CENTIMETERS = 'cm', 'Centimeters'
    SQUARE_METERS = 'sqm', 'Square Meters'
    PACK = 'pack', 'Pack'
    BOX = 'box', 'Box'

class Product(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE, blank=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_available = models.BooleanField(default=True)  # Add this field if not present
    is_active = models.BooleanField(default=True)  # Add this field
    created_at = models.DateTimeField(default=timezone.now)  # Changed from auto_now_add
    has_variants = models.BooleanField(default=False)
    base_unit = models.ForeignKey(VariantType, on_delete=models.SET_NULL, null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base price per unit")
    stock = models.PositiveIntegerField(default=0)
    stock_threshold = models.PositiveIntegerField(
        default=10,
        help_text="Minimum stock level before notification"
    )
    standard_unit = models.CharField(
        max_length=20,
        choices=StandardUnit.choices,
        default=StandardUnit.PIECES,
        help_text="Standard unit of measurement for this product"
    )
    unit_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        help_text="Value in standard units (e.g., 500 for 500g)"
    )

    @property
    def available_variants(self):
        return self.variants.filter(is_active=True).order_by('value')

    def get_default_variant(self):
        return self.variants.filter(is_active=True).first()

    def get_absolute_url(self):
        return f'/product/{self.id}/'
        # or use reverse():
        # from django.urls import reverse
        # return reverse('product_detail', kwargs={'product_id': self.id})

    def __str__(self):
        return self.name

    @property
    def primary_image(self):
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def additional_images(self):
        if self.primary_image:
            return self.images.exclude(id=self.primary_image.id)
        return self.images.none()

    @property
    def get_primary_image_url(self):
        """Safely get the primary image URL or return None"""
        if self.primary_image and self.primary_image.image:
            return self.primary_image.image.url
        return None

    @property
    def get_all_valid_images(self):
        """Return only valid images"""
        return [img for img in self.images.all() if img.image]

    def get_organized_variants(self):
        """Return variants organized by attributes"""
        if not self.has_variants:
            return None
            
        variants = self.variants.filter(is_active=True)
        organized = {}
        
        for variant in variants:
            value_key = str(variant.value)
            if value_key not in organized:
                organized[value_key] = {
                    'display': f"{variant.value} {variant.unit}",
                    'variants': []
                }
            
            variant_info = {
                'id': variant.id,
                'price': variant.price,
                'stock': variant.stock,
                'sku': variant.sku
            }
            organized[value_key]['variants'].append(variant_info)
            
        return organized

    def get_variant_summary(self):
        """Get a summary of variants including price range and availability"""
        variants = self.variants.filter(is_active=True)
        if not variants.exists():
            return None
        
        prices = [v.price for v in variants]
        return {
            'price_range': {
                'min': min(prices),
                'max': max(prices)
            },
            'total_variants': variants.count(),
            'available_variants': variants.filter(stock__gt=0).count(),
            'unit_types': list(set(v.get_unit_display() for v in variants))
        }

    def update_stock_and_price(self):
        """Update product stock and price based on variants"""
        if self.has_variants:
            variant_stats = self.variants.filter(is_active=True).aggregate(
                total_stock=models.Sum('stock'),
                min_price=models.Min('price'),
                max_price=models.Max('price')
            )
            
            self.stock = variant_stats['total_stock'] or 0
            
            if variant_stats['min_price'] == variant_stats['max_price']:
                self.price = variant_stats['min_price'] or self.base_price
            else:
                self.price = self.base_price

            self.save(update_fields=['stock', 'price'])
        else:
            # For products without variants, allow direct stock management
            self.save(update_fields=['stock'])

    def clean(self):
        if self.stock < 0:
            raise ValidationError({'stock': _('Stock cannot be negative.')})
        super().clean()

    def check_stock_status(self):
        """Check stock status and return warning if low"""
        if self.stock <= 0:
            return 'out_of_stock', _('Out of stock!')
        elif self.stock <= self.stock_threshold:
            return 'low_stock', _('Low stock! Only {} remaining').format(self.stock)
        return 'in_stock', None

    @property
    def stock_status(self):
        """Return current stock status"""
        if self.has_variants:
            total_stock = sum(v.stock for v in self.variants.filter(is_active=True))
            if total_stock <= 0:
                return 'out_of_stock'
            elif total_stock <= self.stock_threshold:
                return 'low_stock'
            return 'in_stock'
        else:
            if self.stock <= 0:
                return 'out_of_stock'
            elif self.stock <= self.stock_threshold:
                return 'low_stock'
            return 'in_stock'

    def save(self, *args, **kwargs):
        if not self.price and self.base_price:
            self.price = self.base_price
        super().save(*args, **kwargs)

    def get_unit_display_value(self):
        """Returns formatted unit display (e.g., '500g' or '1 Piece')"""
        unit_label = self.get_standard_unit_display()
        if self.standard_unit in ['pc', 'pack', 'box']:
            return f"{int(self.unit_value)} {unit_label}"
        return f"{self.unit_value}{self.standard_unit}"

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category', 'is_available']),
            models.Index(fields=['price']),
        ]

def product_image_path(instance, filename):
    # Organize product images: products/product_id/filename
    return f'products/{instance.product.id}/{filename}'

class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(
        upload_to=product_image_path,
        blank=True,
        null=True
    )
    order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Image for {self.product.name} - {'Primary' if self.is_primary else 'Secondary'}"

    def save(self, *args, **kwargs):
        if self.is_primary:
            # Ensure only one primary image per product
            ProductImage.objects.filter(product=self.product, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(
        max_length=20,
        choices=UnitType.choices,
        default=UnitType.PIECES
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    sku = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)  # Changed from auto_now_add
    updated_at = models.DateTimeField(auto_now=True)  # Add this field

    @property
    def display_name(self):  # Add this property
        return f"{self.product.name} - {self.get_formatted_value()} {self.get_unit_display()}"

    def __str__(self):
        return f"{self.product.name} - {self.get_formatted_value()} {self.get_unit_display()}"

    def get_formatted_value(self):
        """Format value based on unit type"""
        if self.unit in ['kg', 'l'] and self.value < 1:
            # Convert to smaller unit (g or ml) if less than 1
            converted_value = int(self.value * 1000)
            converted_unit = 'g' if self.unit == 'kg' else 'ml'
            return f"{converted_value}{converted_unit}"
        elif self.unit == 'pc' and self.value % 1 == 0:
            # Remove decimal for whole numbers
            return int(self.value)
        return self.value

    class Meta:
        ordering = ['value']
        unique_together = ['product', 'value', 'unit']

    def get_absolute_url(self):
        return f"{self.product.get_absolute_url()}?variant={self.id}"

    def save(self, *args, **kwargs):
        # Auto-generate SKU if not provided
        if not self.sku:
            base = f"{self.product.id}-{self.value}{self.unit}"
            self.sku = base
        
        super().save(*args, **kwargs)
        # Update product stock and price
        self.product.update_stock_and_price()

    def is_in_stock(self):
        return self.stock > 0 and self.is_active

    def clean(self):
        if self.stock < 0:
            raise ValidationError({'stock': _('Stock cannot be negative.')})
        super().clean()

    def check_stock_status(self):
        """Check variant stock status"""
        if self.stock <= 0:
            return 'out_of_stock', _('Out of stock!')
        elif self.stock <= self.product.stock_threshold:
            return 'low_stock', _('Low stock! Only {} remaining').format(self.stock)
        return 'in_stock', None

class Cart(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Cart {self.id}"

    @property
    def total_amount(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['created_at']),
        ]

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of adding
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True)

    @property
    def total_price(self):
        return self.price * self.quantity

    @property
    def variant_display(self):
        if self.variant:
            return f"{self.variant.value} {self.variant.get_unit_display()}"
        return None

    class Meta:
        unique_together = ('cart', 'product')

    def save(self, *args, **kwargs):
        if self.variant:
            self.price = self.variant.price
        else:
            self.price = self.product.price
        super().save(*args, **kwargs)

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    last_login_attempt = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    
    @property
    def is_verified(self):
        return self.email_verified and self.phone_verified

    def verify_email(self):
        self.email_verified = True
        self.save(update_fields=['email_verified'])

    def verify_phone(self):
        self.phone_verified = True
        self.save(update_fields=['phone_verified'])

    def record_login_attempt(self, success):
        self.last_login_attempt = timezone.now()
        if not success:
            self.failed_login_attempts += 1
        else:
            self.failed_login_attempts = 0
        self.save(update_fields=['last_login_attempt', 'failed_login_attempts'])

    def __str__(self):
        return f"{self.user.email}'s profile"

class Address(models.Model):
    ADDRESS_TYPES = (
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other')
    )

    STATES = (
        ('AP', 'Andhra Pradesh'),
        ('AR', 'Arunachal Pradesh'),
        # ...add other states...
        ('WB', 'West Bengal'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    alternate_phone = models.CharField(max_length=15, blank=True, null=True)
    street = models.CharField(max_length=255)
    landmark = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, choices=STATES)
    pincode = models.CharField(max_length=10)
    type = models.CharField(max_length=10, choices=ADDRESS_TYPES, default='home')
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name_plural = 'Addresses'
        indexes = [
            models.Index(fields=['user', 'is_default']),
            models.Index(fields=['pincode']),
        ]

    def get_full_address(self):
        return f"{self.street}, {self.city}, {self.state} - {self.pincode}"

    def save(self, *args, **kwargs):
        if self.is_default:
            # Set all other addresses of user as non-default
            Address.objects.filter(user=self.user).update(is_default=False)
        super().save(*args, **kwargs)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create or get UserProfile when User is created."""
    UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved."""
    profile, created = UserProfile.objects.get_or_create(user=instance)
    if not created:
        profile.save()

class OTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)  # Added default value
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'otp']),
            models.Index(fields=['email', 'is_verified']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"OTP for {self.email}"

    def is_valid(self):
        return not self.is_verified and timezone.now() <= self.expires_at

class Order(models.Model):
    """Model for storing order information"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded')
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ]

    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('cod', 'Cash on Delivery'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    order_number = models.CharField(max_length=20, unique=True)
    address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='orders')
    items_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Total order amount including items, shipping and tax"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='razorpay')
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    @property
    def total(self):
        """Property to maintain compatibility with admin"""
        return self.total_amount

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['order_number']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
            
        # Calculate total_amount before saving
        self.total_amount = self.items_total + self.shipping_fee + self.tax_amount
        
        super().save(*args, **kwargs)

    def calculate_total(self):
        return self.items_total + self.shipping_fee + self.tax_amount

    def generate_order_number(self):
        date_str = timezone.now().strftime('%Y%m%d')
        count = Order.objects.filter(
            created_at__date=timezone.now().date()
        ).count() + 1
        return f"ORD{date_str}{count:04d}"

    def __str__(self):
        return f"Order {self.order_number}"

class OrderItem(models.Model):
    """Model for storing order line items"""
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('Product', on_delete=models.SET_NULL, null=True)
    variant = models.ForeignKey('ProductVariant', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    product_data = models.JSONField(default=dict)  # Store product details at time of order

    class Meta:
        indexes = [
            models.Index(fields=['order', 'product'])
        ]

    def __str__(self):
        return f"{self.quantity}x {self.product.name if self.product else 'Deleted Product'}"

    def save(self, *args, **kwargs):
        if not self.total:
            self.total = self.price * self.quantity
        
        if not self.product_data and self.product:
            self.product_data = {
                'name': self.product.name,
                'price': str(self.price),
                'variant': self.variant.display_name if self.variant else None,
                'image_url': self.product.primary_image.url if self.product.primary_image else None
            }
        super().save(*args, **kwargs)

class WishlistItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

class UserActivity(models.Model):
    ACTIVITY_TYPES = (
        ('order', 'Order'),
        ('wishlist', 'Wishlist'),
        ('review', 'Review'),
        ('account', 'Account'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'User Activities'

    def __str__(self):
        return f"{self.user.email} - {self.activity_type} - {self.timestamp}"

class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    company = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def _str_(self):
        return f"{self.name} - {self.subject}"