import os
import requests
import logging

# --- Configuration ---
BULKSMS_API_KEY = os.getenv('BULKSMS_API_KEY', "7c9c967a-4ce9-4748-9dc7-d2aaef847275")
BULKSMS_SENDER_ID = os.getenv('BULKSMS_SENDER_ID', "PYDAHK")
BULKSMS_ENGLISH_API_URL = os.getenv('BULKSMS_ENGLISH_API_URL', "https://www.bulksmsapps.com/api/apismsv2.aspx")

STUDENT_CREDENTIALS_TEMPLATE = (
    "Welcome to PYDAH HOSTEL. Your Account is created with UserID: {#var#} Password: {#var#} login with link: crt.pydahsoft.in -Pydah Hostel"
)

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SMS_Sender")

# --- Helper Functions ---
def is_valid_sms_response(response_text: str) -> bool:
    """Check if the BulkSMS API response indicates success."""
    return "OK" in response_text.upper()  # BulkSMS typically returns "OK" for success

def extract_message_id(response_text: str) -> str:
    """Extract message ID from response if available."""
    parts = response_text.split('|')
    return parts[1] if len(parts) > 1 else None

def send_sms_post(params: dict, is_unicode: bool = False):
    """Send SMS using BulkSMS API via POST."""
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    return requests.post(BULKSMS_ENGLISH_API_URL, data=params, headers=headers)

def send_student_credentials_sms(phone: str, username: str, password: str):
    """Send student credentials SMS manually."""
    try:
        logger.info(f"📱 Sending student credentials SMS to: {phone}")

        # Fill in the template
        message = STUDENT_CREDENTIALS_TEMPLATE.replace('{#var#}', username, 1) \
                                             .replace('{#var#}', password, 1)

        params = {
            'apikey': BULKSMS_API_KEY,
            'sender': BULKSMS_SENDER_ID,
            'number': phone,
            'message': message
        }

        logger.info(f"📤 Sending request to BulkSMS with params: {params}")
        response = send_sms_post(params, False)

        if is_valid_sms_response(response.text):
            message_id = extract_message_id(response.text)
            logger.info(f"✅ SMS sent successfully! MessageId: {message_id}")
            return True
        else:
            logger.error("❌ Failed to send SMS: " + response.text)
            return False

    except Exception as e:
        logger.error(f"⚠️ Error while sending SMS: {e}")
        return False


if __name__ == "__main__":
    print("\n=== Pydah Student Credentials SMS Sender ===")
    phone = input("Enter student's phone number: ").strip()
    username = input("Enter student's username: ").strip()
    password = input("Enter student's password: ").strip()

    success = send_student_credentials_sms(phone, username, password)
    if success:
        print("\n✅ SMS sent successfully!")
    else:
        print("\n❌ Failed to send SMS. Check logs above.")
