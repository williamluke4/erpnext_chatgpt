import frappe
from frappe.model.document import Document


class OpenAISettings(Document):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
