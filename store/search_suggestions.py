from django.db.models import Count, Q
from django.http import JsonResponse
from store.models import Product, Category, ProductImage
import logging
from django.utils.text import slugify

logger = logging.getLogger(__name__)

def search_suggestions(request):
    try:
        # Get and clean query
        query = request.GET.get('q', '').strip()
        if not query or len(query) < 2:
            return JsonResponse({
                'categories': [],
                'products': [],
                'popular': []
            })

        # Clean and normalize query
        normalized_query = slugify(query).replace('-', ' ')

        # Get matching categories with product count
        categories = Category.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query)
        ).annotate(
            product_count=Count('products', filter=Q(products__is_available=True))
        ).values('id', 'name', 'product_count')[:5]

        # Get matching products that are available
        products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(category__name__icontains=query),
            is_available=True,
            stock__gt=0
        ).select_related(
            'category',
            'base_unit'
        ).prefetch_related(
            'images'
        ).distinct()[:8]

        # Format product results
        product_suggestions = []
        for product in products:
            # Get the first image if available
            image_url = None
            try:
                first_image = product.images.first()
                if first_image:
                    image_url = first_image.image.url
            except (AttributeError, Exception) as e:
                logger.warning(f"Error getting image for product {product.id}: {str(e)}")

            product_suggestions.append({
                'id': product.id,
                'name': product.name,
                'price': str(product.price),
                'category_name': product.category.name if product.category else None,
                'image_url': image_url,
                'stock': product.stock,
                'url': f'/product/{product.id}/'
            })

        # Get popular related searches
        popular_searches = get_popular_related_searches(normalized_query)

        response_data = {
            'categories': list(categories),
            'products': product_suggestions,
            'popular': popular_searches
        }

        return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Search suggestions error: {str(e)}")
        return JsonResponse({
            'categories': [],
            'products': [],
            'popular': [],
            'error': 'An error occurred while fetching suggestions'
        })

def get_popular_related_searches(query):
    """Get popular related searches based on query"""
    try:
        # Get similar products
        similar_products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(category__name__icontains=query)
        ).values_list('name', 'category__name').distinct()[:5]

        # Extract search terms
        popular = []
        for name, category in similar_products:
            if name and name.lower() != query.lower():
                popular.append(name)
            if category and category.lower() != query.lower():
                popular.append(category)

        return list(set(popular))  # Remove duplicates
        
    except Exception as e:
        logger.error(f"Error getting popular searches: {str(e)}")
        return []
