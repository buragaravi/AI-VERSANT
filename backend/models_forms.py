from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Any, Optional

class FormField:
    def __init__(self, field_id: str, label: str, field_type: str, required: bool = False, 
                 options: List[str] = None, placeholder: str = "", validation: Dict = None):
        self.field_id = field_id
        self.label = label
        self.field_type = field_type  # text, email, number, dropdown, radio, checkbox, textarea, date
        self.required = required
        self.options = options or []
        self.placeholder = placeholder
        self.validation = validation or {}

    def to_dict(self):
        return {
            "field_id": self.field_id,
            "label": self.label,
            "type": self.field_type,
            "required": self.required,
            "options": self.options,
            "placeholder": self.placeholder,
            "validation": self.validation
        }

class FormSettings:
    def __init__(self, is_active: bool = True, submission_deadline: datetime = None, 
                 allow_multiple_submissions: bool = False, show_progress: bool = True):
        self.is_active = is_active
        self.submission_deadline = submission_deadline
        self.allow_multiple_submissions = allow_multiple_submissions
        self.show_progress = show_progress

    def to_dict(self):
        return {
            "isActive": self.is_active,
            "submissionDeadline": self.submission_deadline,
            "allowMultipleSubmissions": self.allow_multiple_submissions,
            "showProgress": self.show_progress
        }

class Form:
    def __init__(self, title: str, description: str, template_type: str, 
                 fields: List[FormField], settings: FormSettings, created_by: ObjectId, is_required: bool = False):
        self.form_id = ObjectId()
        self.title = title
        self.description = description
        self.template_type = template_type
        self.fields = fields
        self.settings = settings
        self.created_by = created_by
        self.is_required = is_required
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        return {
            "form_id": str(self.form_id),
            "title": self.title,
            "description": self.description,
            "template_type": self.template_type,
            "fields": [field.to_dict() for field in self.fields],
            "settings": self.settings.to_dict(),
            "created_by": str(self.created_by),
            "is_required": self.is_required,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class FormResponse:
    def __init__(self, field_id: str, value: Any, submitted_at: datetime = None):
        self.field_id = field_id
        self.value = value
        self.submitted_at = submitted_at or datetime.utcnow()

    def to_dict(self):
        return {
            "field_id": self.field_id,
            "value": self.value,
            "submitted_at": self.submitted_at
        }

class FormSubmission:
    def __init__(self, form_id: ObjectId, student_id: ObjectId, student_roll_number: str, responses: List[FormResponse], 
                 status: str = "draft", ip_address: str = "", is_released_to_student: bool = False):
        self.submission_id = ObjectId()
        self.form_id = form_id
        self.student_id = student_id
        self.student_roll_number = student_roll_number  # Primary identifier
        self.responses = responses
        self.status = status  # draft, submitted
        self.submitted_at = datetime.utcnow() if status == "submitted" else None
        self.ip_address = ip_address
        self.is_released_to_student = is_released_to_student

    def to_dict(self):
        return {
            "submission_id": str(self.submission_id),
            "form_id": str(self.form_id),
            "student_id": str(self.student_id),
            "student_roll_number": self.student_roll_number,  # Primary identifier
            "responses": [response.to_dict() for response in self.responses],
            "status": self.status,
            "submitted_at": self.submitted_at,
            "ip_address": self.ip_address,
            "is_released_to_student": self.is_released_to_student
        }

# Collection names
FORMS_COLLECTION = "forms"
FORM_SUBMISSIONS_COLLECTION = "form_submissions"

# Pre-built Form Templates
FORM_TEMPLATES = {
    "student_info": {
        "title": "Student Information Form",
        "description": "Basic student details and contact information",
        "fields": [
            {"field_id": "full_name", "label": "Full Name", "type": "text", "required": True, "placeholder": "Enter your full name"},
            {"field_id": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "Enter your email"},
            {"field_id": "phone", "label": "Phone Number", "type": "text", "required": True, "placeholder": "Enter your phone number"},
            {"field_id": "course", "label": "Course", "type": "dropdown", "required": True, "options": ["Computer Science", "Engineering", "Business", "Arts", "Science"]},
            {"field_id": "year", "label": "Academic Year", "type": "dropdown", "required": True, "options": ["1st Year", "2nd Year", "3rd Year", "4th Year"]},
            {"field_id": "address", "label": "Address", "type": "textarea", "required": False, "placeholder": "Enter your address"}
        ]
    },
    "feedback": {
        "title": "Course Feedback Form",
        "description": "Share your feedback about the course and teaching",
        "fields": [
            {"field_id": "course_name", "label": "Course Name", "type": "text", "required": True, "placeholder": "Enter course name"},
            {"field_id": "instructor", "label": "Instructor Name", "type": "text", "required": True, "placeholder": "Enter instructor name"},
            {"field_id": "rating", "label": "Overall Rating", "type": "radio", "required": True, "options": ["Excellent", "Good", "Average", "Poor", "Very Poor"]},
            {"field_id": "content_quality", "label": "Content Quality", "type": "radio", "required": True, "options": ["Excellent", "Good", "Average", "Poor"]},
            {"field_id": "teaching_method", "label": "Teaching Method", "type": "radio", "required": True, "options": ["Excellent", "Good", "Average", "Poor"]},
            {"field_id": "suggestions", "label": "Suggestions for Improvement", "type": "textarea", "required": False, "placeholder": "Share your suggestions"},
            {"field_id": "recommend", "label": "Would you recommend this course?", "type": "radio", "required": True, "options": ["Yes", "No", "Maybe"]}
        ]
    },
    "survey": {
        "title": "General Survey",
        "description": "Help us improve our services",
        "fields": [
            {"field_id": "satisfaction", "label": "How satisfied are you with our services?", "type": "radio", "required": True, "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]},
            {"field_id": "improvement_areas", "label": "What areas need improvement?", "type": "checkbox", "required": False, "options": ["Website", "Mobile App", "Customer Support", "Pricing", "Features", "Documentation"]},
            {"field_id": "frequency", "label": "How often do you use our services?", "type": "radio", "required": True, "options": ["Daily", "Weekly", "Monthly", "Rarely", "Never"]},
            {"field_id": "comments", "label": "Additional Comments", "type": "textarea", "required": False, "placeholder": "Share any additional thoughts"}
        ]
    },
    "registration": {
        "title": "Event Registration Form",
        "description": "Register for upcoming events and workshops",
        "fields": [
            {"field_id": "event_name", "label": "Event Name", "type": "text", "required": True, "placeholder": "Enter event name"},
            {"field_id": "event_date", "label": "Preferred Date", "type": "date", "required": True},
            {"field_id": "dietary_requirements", "label": "Dietary Requirements", "type": "text", "required": False, "placeholder": "Any dietary restrictions?"},
            {"field_id": "accommodation", "label": "Need Accommodation?", "type": "radio", "required": True, "options": ["Yes", "No"]},
            {"field_id": "emergency_contact", "label": "Emergency Contact", "type": "text", "required": True, "placeholder": "Emergency contact number"},
            {"field_id": "special_requests", "label": "Special Requests", "type": "textarea", "required": False, "placeholder": "Any special requests or notes"}
        ]
    },
    "contact": {
        "title": "Contact Us Form",
        "description": "Get in touch with us",
        "fields": [
            {"field_id": "name", "label": "Your Name", "type": "text", "required": True, "placeholder": "Enter your name"},
            {"field_id": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "Enter your email"},
            {"field_id": "subject", "label": "Subject", "type": "text", "required": True, "placeholder": "Enter subject"},
            {"field_id": "message", "label": "Message", "type": "textarea", "required": True, "placeholder": "Enter your message"},
            {"field_id": "priority", "label": "Priority", "type": "dropdown", "required": True, "options": ["Low", "Medium", "High", "Urgent"]}
        ]
    }
}

# Field type validation rules
FIELD_VALIDATION_RULES = {
    "text": {"minLength": 1, "maxLength": 255},
    "email": {"pattern": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"},
    "number": {"min": 0, "max": 999999},
    "textarea": {"minLength": 1, "maxLength": 1000},
    "date": {"format": "YYYY-MM-DD"}
}
