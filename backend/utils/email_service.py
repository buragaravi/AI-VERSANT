import os
import brevo_python
from brevo_python.rest import ApiException
from jinja2 import Environment, FileSystemLoader, select_autoescape

def configure_brevo():
    configuration = brevo_python.Configuration()
    configuration.api_key['api-key'] = os.getenv('BREVO_API_KEY')
    return configuration

def render_template(template_name, **context):
    template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'emails')
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(['html'])
    )
    template = env.get_template(template_name)
    return template.render(params=context)

def send_email(to_email, to_name, subject, html_content):
    configuration = configure_brevo()
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

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"Email sent successfully. Response: {api_response.to_dict()}")
        return True
    except ApiException as e:
        print(f"Exception when calling TransactionalEmailsApi->send_transac_email: {e}")
        return False 