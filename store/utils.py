import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string  # Add this import
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

def send_otp_email(email, otp_code=None):
    """Send OTP email to user"""
    try:
        with transaction.atomic():
            # Delete any existing unverified OTPs
            OTP.objects.filter(
                email=email,
                is_verified=False
            ).delete()
            
            # Generate new OTP if not provided
            if not otp_code:
                otp_code = get_random_string(length=6, allowed_chars='0123456789')
            
            # Create OTP record with expiry
            OTP.objects.create(
                email=email,
                otp=otp_code,
                expires_at=timezone.now() + timezone.timedelta(minutes=10),
                attempts=0,
                is_active=True
            )

            # Send email
            subject = 'Your Verification Code'
            message = f'Your verification code is: {otp_code}'
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [email]
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                fail_silently=False
            )
            
            return True
            
    except Exception as e:
        logger.error(f"Error in send_otp_email: {str(e)}")
        return False

def verify_otp(email, otp_code):
    """Verify OTP code against database record"""
    try:
        # Get the most recent valid OTP record
        otp_record = OTP.objects.filter(
            email=email,
            otp=otp_code,
            is_verified=False,
            is_active=True,
            expires_at__gt=timezone.now()
        ).select_for_update().first()

        if not otp_record:
            logger.warning(f"No valid OTP found for email {email}")
            return False

        with transaction.atomic():
            # Mark OTP as verified
            otp_record.is_verified = True
            otp_record.save(update_fields=['is_verified'])

            # Cleanup old OTPs for this email
            OTP.objects.filter(
                email=email,
                is_verified=False,
                expires_at__lte=timezone.now()
            ).delete()

        return True

    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        return False
