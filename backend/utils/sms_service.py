import os
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_sms(to_number, message):
    """Send SMS using a third-party service (e.g., Twilio, TextLocal, etc.)"""
    try:
        # For now, we'll use a simple implementation
        # You can integrate with services like:
        # - Twilio
        # - TextLocal
        # - Fast2SMS
        # - MSG91
        
        # Check if SMS service is configured
        sms_api_key = os.getenv('SMS_API_KEY')
        sms_sender_id = os.getenv('SMS_SENDER_ID', 'STUDYEDGE')
        
        if not sms_api_key:
            logger.warning("⚠️ SMS service not configured. SMS_API_KEY not set.")
            return False
        
        # Example implementation for Fast2SMS (you can change this to your preferred service)
        url = "https://www.fast2sms.com/dev/bulkV2"
        
        payload = {
            "message": message,
            "language": "english",
            "route": "q",
            "numbers": to_number
        }
        
        headers = {
            "authorization": sms_api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        response = requests.post(url, data=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('return'):
                logger.info(f"✅ SMS sent successfully to {to_number}")
                return True
            else:
                logger.error(f"❌ SMS failed to {to_number}: {result.get('message', 'Unknown error')}")
                return False
        else:
            logger.error(f"❌ SMS API error: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error sending SMS to {to_number}: {e}")
        return False

def check_sms_configuration():
    """Check if SMS service is properly configured"""
    issues = []
    
    if not os.getenv('SMS_API_KEY'):
        issues.append("SMS_API_KEY environment variable not set")
    
    if issues:
        logger.error("❌ SMS service configuration issues:")
        for issue in issues:
            logger.error(f"   - {issue}")
        return {'properly_configured': False, 'issues': issues}
    
    logger.info("✅ SMS service is properly configured")
    return {'properly_configured': True, 'issues': []}

def get_sms_status():
    """Get the current status of SMS service"""
    config_status = check_sms_configuration()
    
    return {
        'properly_configured': config_status['properly_configured'],
        'issues': config_status['issues'],
        'api_key_set': bool(os.getenv('SMS_API_KEY')),
        'sender_id_set': bool(os.getenv('SMS_SENDER_ID'))
    }
