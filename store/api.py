from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Product

@api_view(['POST'])
@permission_classes([AllowAny])
def check_stock(request):
    product_id = request.data.get('product_id')
    quantity = request.data.get('quantity', 1)
    
    try:
        product = Product.objects.get(id=product_id)
        in_stock = product.stock >= quantity
        return Response({
            'success': True,
            'in_stock': in_stock,
            'available_quantity': product.stock
        })
    except Product.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Product not found'
        }, status=404)
