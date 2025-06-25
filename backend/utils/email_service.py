import os
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Try to import brevo_python, but make it optional
try:
    import brevo_python
    from brevo_python.rest import ApiException
    BREVO_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: brevo_python module not found. Email functionality will be disabled.")
    BREVO_AVAILABLE = False

def configure_brevo():
    """Configure Brevo email service"""
    if not BREVO_AVAILABLE:
        print("❌ Brevo not available - email service disabled")
        return None
    
    try:
        configuration = brevo_python.Configuration()
        configuration.api_key['api-key'] = os.getenv('BREVO_API_KEY')
        return configuration
    except Exception as e:
        print(f"❌ Error configuring Brevo: {e}")
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
        return template.render(params=context)
    except Exception as e:
        print(f"❌ Error rendering template {template_name}: {e}")
        return f"<p>Error rendering template: {e}</p>"

def send_email(to_email, to_name, subject, html_content):
    """Send email using Brevo service"""
    if not BREVO_AVAILABLE:
        print(f"⚠️ Email service disabled. Would send to {to_email}: {subject}")
        return False
    
    try:
        configuration = configure_brevo()
        if not configuration:
            print("❌ Brevo configuration failed")
            return False
            
        api_instance = brevo_python.TransactionalEmailsApi(brevo_python.ApiClient(configuration))
        
        sender_email = os.getenv('SENDER_EMAIL')
        if not sender_email:
            print("SENDER_EMAIL environment variable not set. Cannot send email.")
            return False
            
        sender_name = "VERSANT System"

        send_smtp_email = brevo_python.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            subject=subject,
            html_content=html_content,
            sender={"name": sender_name, "email": sender_email}
        )

        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"Email sent successfully. Response: {api_response.to_dict()}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return False 