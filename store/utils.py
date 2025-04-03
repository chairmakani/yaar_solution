import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import OTP
from django.db import transaction
import time
import logging
from smtplib import SMTPException

logger = logging.getLogger(__name__)

def filter_products(products, query):
    """Filter products based on a search query."""
    return [product for product in products if query in product['name'].lower()]

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email):
    try:
        # Delete any existing unused OTP with a lock to prevent race conditions
        with transaction.atomic():
            OTP.objects.filter(email=email, is_verified=False).delete()
            
            # Generate new OTP
            otp_code = generate_otp()
            expires_at = timezone.now() + timedelta(minutes=10)
            
            # Save OTP in database
            OTP.objects.create(
                email=email,
                otp=otp_code,
                expires_at=expires_at
            )
        
        # Send email with multiple retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                send_mail(
                    subject='Your OTP for verification',
                    message=f'Your OTP is {otp_code}. This OTP will expire in 10 minutes.',
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return True
            except SMTPException as e:
                if attempt == max_retries - 1:  # Last attempt
                    logger.error(f"Failed to send OTP email after {max_retries} attempts: {str(e)}")
                    raise
                time.sleep(1)  # Wait before retrying
                
    except Exception as e:
        logger.error(f"Error in send_otp_email: {str(e)}")
        # Clean up OTP if email fails
        OTP.objects.filter(email=email, is_verified=False).delete()
        return False

def verify_otp(email, otp_code):
    try:
        otp_obj = OTP.objects.get(
            email=email,
            otp=otp_code,
            is_verified=False
        )
        
        if otp_obj.is_valid():
            otp_obj.is_verified = True
            otp_obj.save()
            return True
        return False
    except OTP.DoesNotExist:
        return False
