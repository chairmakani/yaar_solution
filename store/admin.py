from django.contrib import admin, messages
from django.utils.html import format_html
from .models import (
    Product, Category, NGO, Location, ProductVariant, 
    VariantType, ProductImage, UnitType
)

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    min_num = 0
    fields = ['value', 'unit', 'price', 'stock', 'sku', 'is_active']
    show_change_link = True

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "unit":
            kwargs['choices'] = UnitType.choices
        return super().formfield_for_choice_field(db_field, request, **kwargs)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    min_num = 0
    fields = ['image', 'is_primary', 'order', 'alt_text']
    ordering = ['order', 'created_at']

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock_status_display', 'is_available']
    list_filter = ['category', 'is_available', 'has_variants']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'category')
        }),
        ('Pricing and Stock', {
            'fields': ('price', 'base_price', 'stock', 'is_available'),
            'description': 'Stock can be managed directly for products without variants.'
        }),
        ('Variant Settings', {
            'fields': ('has_variants', 'base_unit'),
            'classes': ('collapse',),
            'description': 'For products with variants, stock is automatically calculated from variant stocks.'
        })
    )
    inlines = [ProductImageInline, ProductVariantInline]

    def stock_status_display(self, obj):
        status = obj.stock_status
        if (status == 'out_of_stock'):
            return format_html('<span style="color: red;">Out of Stock</span>')
        elif (status == 'low_stock'):
            return format_html('<span style="color: orange;">Low Stock ({}/{})</span>', obj.stock, obj.stock_threshold)
        return format_html('<span style="color: green;">In Stock ({})</span>', obj.stock)
    stock_status_display.short_description = 'Stock Status'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        status, message = obj.check_stock_status()
        if status in ['out_of_stock', 'low_stock'] and message:
            messages.warning(request, f"{obj.name}: {message}")

@admin.register(NGO)
class NGOAdmin(admin.ModelAdmin):
    list_display = ('panchayat_name', 'shg_name', 'product', 'contact_person', 'mobile_number', 'price')
    search_fields = ('name', 'location')

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(VariantType)
class VariantTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit']
    search_fields = ['name', 'unit']

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['product', 'get_display_name', 'price', 'stock_status_display', 'sku', 'is_active']
    list_filter = ['is_active', 'unit']
    search_fields = ['product__name', 'sku']
    autocomplete_fields = ['product']
    readonly_fields = ['get_display_name']
    fieldsets = (
        (None, {
            'fields': ('product', 'display_name')
        }),
        ('Variant Details', {
            'fields': ('value', 'unit')
        }),
        ('Stock and Pricing', {
            'fields': ('price', 'stock', 'is_active')
        }),
        ('SKU and Timestamps', {
            'fields': ('sku', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_display_name(self, obj):
        return obj.display_name
    get_display_name.short_description = 'Display Name'

    def stock_status_display(self, obj):
        status, message = obj.check_stock_status()
        if status == 'out_of_stock':
            return format_html('<span style="color: red;">Out of Stock</span>')
        elif status == 'low_stock':
            return format_html('<span style="color: orange;">Low Stock ({})</span>', obj.stock)
        return format_html('<span style="color: green;">In Stock ({})</span>', obj.stock)
    stock_status_display.short_description = 'Stock Status'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        status, message = obj.check_stock_status()
        if status in ['out_of_stock', 'low_stock'] and message:
            messages.warning(request, f"{obj.product.name} - {obj.display_name}: {message}")

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "unit":
            kwargs['choices'] = UnitType.choices
        return super().formfield_for_choice_field(db_field, request, **kwargs)

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_primary', 'order', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['product__name', 'alt_text']
    ordering = ['product', 'order', 'created_at']


