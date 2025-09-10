import os
import logging
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import brevo_python, but make it optional
try:
    import brevo_python
    from brevo_python.rest import ApiException
    BREVO_AVAILABLE = True
    logger.info("✅ Brevo email service is available")
except ImportError:
    logger.warning("⚠️ Warning: brevo_python module not found. Email functionality will be disabled.")
    BREVO_AVAILABLE = False

def configure_brevo():
    """Configure Brevo email service"""
    if not BREVO_AVAILABLE:
        logger.error("❌ Brevo not available - email service disabled")
        return None
    
    try:
        configuration = brevo_python.Configuration()
        api_key = os.getenv('BREVO_API_KEY')
        
        if not api_key:
            logger.error("❌ BREVO_API_KEY environment variable not set")
            logger.info("💡 Please set BREVO_API_KEY in your environment variables")
            return None
            
        configuration.api_key['api-key'] = api_key
        logger.info("✅ Brevo configuration successful")
        return configuration
    except Exception as e:
        logger.error(f"❌ Error configuring Brevo: {e}")
        return None

def render_template(template_name, **context):
    """Render email template"""
    try:
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'emails')
        env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html'])
        )
        template = env.get_template(template_name)
        return template.render(**context)
    except Exception as e:
        logger.error(f"❌ Error rendering template {template_name}: {e}")
        return f"<p>Error rendering template: {e}</p>"

def send_email(to_email, to_name, subject, html_content):
    """Send email using Brevo service"""
    if not BREVO_AVAILABLE:
        logger.warning(f"⚠️ Email service disabled. Would send to {to_email}: {subject}")
        return False
    
    try:
        configuration = configure_brevo()
        if not configuration:
            logger.error("❌ Brevo configuration failed")
            return False
            
        api_instance = brevo_python.TransactionalEmailsApi(brevo_python.ApiClient(configuration))
        
        sender_email = os.getenv('SENDER_EMAIL')
        if not sender_email:
            logger.error("❌ SENDER_EMAIL environment variable not set. Cannot send email.")
            logger.info("💡 Please set SENDER_EMAIL in your environment variables")
            return False
            
        sender_name = os.getenv('SENDER_NAME', 'VERSANT System')

        send_smtp_email = brevo_python.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            subject=subject,
            html_content=html_content,
            sender={"name": sender_name, "email": sender_email}
        )

        api_response = api_instance.send_transac_email(send_smtp_email)
        logger.info(f"✅ Email sent successfully to {to_email}. Response: {api_response.to_dict()}")
        return True
        
    except ApiException as e:
        logger.error(f"❌ Brevo API error sending email to {to_email}: {e}")
        logger.error(f"   Status: {e.status}, Reason: {e.reason}")
        return False
    except Exception as e:
        logger.error(f"❌ Error sending email to {to_email}: {e}")
        return False

def check_email_configuration():
    """Check if email service is properly configured"""
    issues = []
    
    if not BREVO_AVAILABLE:
        issues.append("Brevo Python SDK not installed")
    
    if not os.getenv('BREVO_API_KEY'):
        issues.append("BREVO_API_KEY environment variable not set")
    
    if not os.getenv('SENDER_EMAIL'):
        issues.append("SENDER_EMAIL environment variable not set")
    
    if issues:
        logger.error("❌ Email service configuration issues:")
        for issue in issues:
            logger.error(f"   - {issue}")
        return False
    
    logger.info("✅ Email service is properly configured")
    return True

def send_test_notification_email(student_email, student_name, test_name, test_type, login_url):
    """Send test notification email to student"""
    try:
        subject = f"New Test Assigned: {test_name}"
        
        # Create HTML content for test notification
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    New Test Assignment
                </h2>
                
                <p>Dear {student_name},</p>
                
                <p>A new test has been assigned to you:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Test Details</h3>
                    <p><strong>Test Name:</strong> {test_name}</p>
                    <p><strong>Test Type:</strong> {test_type}</p>
                </div>
                
                <p>Please log in to your account to attempt the test:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}" 
                       style="background-color: #3498db; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Attempt Test Now
                    </a>
                </div>
                
                <p>If you have any questions, please contact your instructor.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    This is an automated message from Study Edge Apex. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        return send_email(
            to_email=student_email,
            to_name=student_name,
            subject=subject,
            html_content=html_content
        )
        
    except Exception as e:
        logger.error(f"Error sending test notification email to {student_email}: {e}")
        return False

def get_email_status():
    """Get the current status of email service"""
    return {
        'brevo_available': BREVO_AVAILABLE,
        'brevo_api_key_set': bool(os.getenv('BREVO_API_KEY')),
        'sender_email_set': bool(os.getenv('SENDER_EMAIL')),
        'sender_name_set': bool(os.getenv('SENDER_NAME')),
        'properly_configured': check_email_configuration()
    } 