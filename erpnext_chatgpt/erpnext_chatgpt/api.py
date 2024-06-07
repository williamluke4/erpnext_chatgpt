import frappe
from frappe import _
from openai import OpenAI

import json
from erpnext_chatgpt.erpnext_chatgpt.tools import get_tools, available_functions

# Define a pre-prompt to set the context or provide specific instructions
PRE_PROMPT = "You are an AI assistant integrated with ERPNext. Please provide accurate and helpful responses based on the following questions and data provided by the user."
MODEL = "gpt-4o"


@frappe.whitelist()
def ask_openai_question(conversation):
    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        frappe.log_error(
            "OpenAI API key is not set in OpenAI Settings.", title="OpenAI API Error"
        )
        return {"error": "OpenAI API key is not set in OpenAI Settings."}

    client = OpenAI(api_key=api_key)

    frappe.log_error(message=json.dumps(conversation), title="OpenAI Question")

    # Add the pre-prompt as the initial message
    conversation.insert(0, {"role": "system", "content": PRE_PROMPT})

    try:
        tools = get_tools()
        response = client.chat.completions.create(
            model=MODEL, messages=conversation, tools=tools, tool_choice="auto"
        )

        response_message = response.choices[0].message
        frappe.log_error(message=json.dumps(response_message), title="OpenAI Response")

        tool_calls = response_message.get("tool_calls", [])

        if tool_calls:
            conversation.append(response_message)

            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_to_call = available_functions[function_name]
                function_args = json.loads(tool_call.function.arguments)
                function_response = function_to_call(**function_args)
                if function_response:
                    conversation.append(
                        {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": function_response,
                        }
                    )

            second_response = client.chat.completions.create(
                model=MODEL, messages=conversation
            )

            return second_response.choices[0].message

        return response_message
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Error")
        return {"error": str(e)}


@frappe.whitelist()
def test_openai_api_key(api_key):
    client = OpenAI(api_key=api_key)
    try:
        client.models.list()  # Test API call
        return True
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Key Test Failed")
        return False


@frappe.whitelist()
def check_openai_key_and_role():
    user = frappe.session.user
    if "System Manager" not in frappe.get_roles(user):
        return {"show_button": False, "reason": "Only System Managers can access."}

    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        return {
            "show_button": False,
            "reason": "OpenAI API key is not set in OpenAI Settings.",
        }

    try:
        client = OpenAI(api_key=api_key)
        client.models.list()  # Test API call
        return {"show_button": True}
    except Exception as e:
        return {"show_button": False, "reason": str(e)}
