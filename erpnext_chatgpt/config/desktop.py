from frappe import _

def get_data():
    return [
        {
            "module_name": "OpenAI Integration",
            "color": "grey",
            "icon": "octicon octicon-file-directory",
            "type": "module",
            "label": _("OpenAI Integration"),
            "items": [
                {
                    "type": "doctype",
                    "name": "OpenAI Settings",
                    "label": _("OpenAI Settings"),
                    "description": _("Settings for OpenAI Integration")
                }
            ]
        }
    ]
