"""
Resilient Services - Bulletproof error handling for external services
"""
import time
import random
import logging
from functools import wraps
from typing import Callable, Any, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

class ServiceUnavailableError(Exception):
    """Raised when a service is unavailable after all retries"""
    pass

class RetryConfig:
    """Configuration for retry logic"""
    def __init__(self, max_retries=3, base_delay=1, max_delay=30, backoff_factor=2):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor

def resilient_service(max_retries=3, base_delay=1, max_delay=30, backoff_factor=2, 
                     service_name="Unknown", rate_limit_delay=1):
    """
    Decorator for resilient service calls with retry logic and rate limiting
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            retry_config = RetryConfig(max_retries, base_delay, max_delay, backoff_factor)
            
            for attempt in range(retry_config.max_retries + 1):
                try:
                    # Add rate limiting delay
                    if attempt > 0:
                        delay = min(retry_config.base_delay * (retry_config.backoff_factor ** (attempt - 1)), 
                                  retry_config.max_delay)
                        # Add jitter to prevent thundering herd
                        jitter = random.uniform(0.1, 0.5)
                        time.sleep(delay + jitter)
                    elif rate_limit_delay > 0:
                        time.sleep(rate_limit_delay)
                    
                    logger.info(f"🔄 {service_name} - Attempt {attempt + 1}/{retry_config.max_retries + 1}")
                    
                    result = func(*args, **kwargs)
                    
                    if result:  # Success
                        logger.info(f"✅ {service_name} - Success on attempt {attempt + 1}")
                        return result
                    else:
                        logger.warning(f"⚠️ {service_name} - Failed on attempt {attempt + 1} (returned False)")
                        if attempt == retry_config.max_retries:
                            logger.error(f"❌ {service_name} - All retries exhausted")
                            return False
                        
                except requests.exceptions.Timeout as e:
                    logger.warning(f"⏰ {service_name} - Timeout on attempt {attempt + 1}: {e}")
                    if attempt == retry_config.max_retries:
                        logger.error(f"❌ {service_name} - Timeout after all retries")
                        return False
                        
                except requests.exceptions.ConnectionError as e:
                    logger.warning(f"🔌 {service_name} - Connection error on attempt {attempt + 1}: {e}")
                    if attempt == retry_config.max_retries:
                        logger.error(f"❌ {service_name} - Connection failed after all retries")
                        return False
                        
                except Exception as e:
                    logger.warning(f"⚠️ {service_name} - Error on attempt {attempt + 1}: {e}")
                    if attempt == retry_config.max_retries:
                        logger.error(f"❌ {service_name} - Failed after all retries: {e}")
                        return False
            
            return False
            
        return wrapper
    return decorator

def create_resilient_session():
    """Create a requests session with retry strategy"""
    session = requests.Session()
    
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS", "TRACE"]
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

class ResilientEmailService:
    """Resilient email service with retry logic"""
    
    def __init__(self, original_send_email_func):
        self.original_send_email = original_send_email_func
        self.failure_count = 0
        self.last_failure_time = 0
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 300  # 5 minutes
    
    def is_circuit_breaker_open(self):
        """Check if circuit breaker should be open"""
        if self.failure_count >= self.circuit_breaker_threshold:
            if time.time() - self.last_failure_time < self.circuit_breaker_timeout:
                return True
            else:
                # Reset circuit breaker
                self.failure_count = 0
                self.last_failure_time = 0
        return False
    
    @resilient_service(max_retries=3, base_delay=2, max_delay=10, 
                      service_name="Email Service", rate_limit_delay=1.5)
    def send_email_resilient(self, to_email, to_name, subject, html_content):
        """Send email with retry logic and circuit breaker"""
        
        # Check circuit breaker
        if self.is_circuit_breaker_open():
            logger.warning(f"🔴 Email service circuit breaker is OPEN - skipping {to_email}")
            return False
        
        try:
            result = self.original_send_email(to_email, to_name, subject, html_content)
            
            if result:
                # Reset failure count on success
                self.failure_count = 0
                return True
            else:
                self.failure_count += 1
                self.last_failure_time = time.time()
                return False
                
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.error(f"❌ Email service error: {e}")
            raise e

class ResilientSMSService:
    """Resilient SMS service with retry logic"""
    
    def __init__(self, original_send_sms_func):
        self.original_send_sms = original_send_sms_func
        self.failure_count = 0
        self.last_failure_time = 0
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 300  # 5 minutes
    
    def is_circuit_breaker_open(self):
        """Check if circuit breaker should be open"""
        if self.failure_count >= self.circuit_breaker_threshold:
            if time.time() - self.last_failure_time < self.circuit_breaker_timeout:
                return True
            else:
                # Reset circuit breaker
                self.failure_count = 0
                self.last_failure_time = 0
        return False
    
    @resilient_service(max_retries=3, base_delay=2, max_delay=10, 
                      service_name="SMS Service", rate_limit_delay=2)
    def send_sms_resilient(self, phone, student_name, username, password, login_url):
        """Send SMS with retry logic and circuit breaker"""
        
        # Check circuit breaker
        if self.is_circuit_breaker_open():
            logger.warning(f"🔴 SMS service circuit breaker is OPEN - skipping {phone}")
            return {'success': False, 'error': 'Service temporarily unavailable'}
        
        try:
            result = self.original_send_sms(phone, student_name, username, password, login_url)
            
            if result.get('success', False):
                # Reset failure count on success
                self.failure_count = 0
                return result
            else:
                self.failure_count += 1
                self.last_failure_time = time.time()
                return result
                
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.error(f"❌ SMS service error: {e}")
            return {'success': False, 'error': str(e)}

def create_resilient_services():
    """Create resilient service instances"""
    from utils.email_service import send_email
    from utils.sms_service import send_student_credentials_sms
    
    return {
        'email': ResilientEmailService(send_email),
        'sms': ResilientSMSService(send_student_credentials_sms)
    }
