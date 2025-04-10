from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up unverified users after 24 hours'

    def handle(self, *args, **options):
        try:
            expiry_time = timezone.now() - timezone.timedelta(hours=24)
            count = User.objects.filter(
                is_active=False,
                date_joined__lt=expiry_time
            ).count()
            
            # Delete the users
            User.objects.filter(
                is_active=False,
                date_joined__lt=expiry_time
            ).delete()
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {count} unverified users')
            )
            
        except Exception as e:
            logger.error(f"Error cleaning up users: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f'Error cleaning up users: {str(e)}')
            )
