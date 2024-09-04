import frappe
from frappe import _
from openai import OpenAI
import json
from erpnext_chatgpt.erpnext_chatgpt.tools import get_tools, available_functions

PRE_PROMPT = f"You are an AI assistant integrated with ERPNext. Please provide accurate and helpful responses based on the following questions and data provided by the user. The current date is {frappe.utils.now()}."
MODEL = "gpt-4o"

def get_openai_client():
    """Get the OpenAI client with the API key from settings."""
    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        frappe.log_error(
            message="OpenAI API key is not set in OpenAI Settings.",
            title="OpenAI API Error",
        )
        raise ValueError("OpenAI API key is not set in OpenAI Settings.")
    return OpenAI(api_key=api_key)

def handle_tool_calls(tool_calls, conversation):
    """Handle the tool calls by executing the corresponding functions and appending the results to the conversation."""
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_to_call = available_functions.get(function_name)
        if not function_to_call:
            frappe.log_error(
                message=f"Function {function_name} not found.",
                title="OpenAI Tool Error",
            )
            return {"error": f"Function {function_name} not found."}

        function_args = json.loads(tool_call.function.arguments)
        try:
            function_response = function_to_call(**function_args)
        except Exception as e:
            frappe.log_error(
                message=f"Error calling function {function_name} with args {json.dumps(function_args)}: {str(e)}",
                title="OpenAI Tool Error",
            )
            return {"error": f"Error calling function {function_name}: {str(e)}"}

        conversation.append(
            {
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response),  # Ensure JSON serialization
            }
        )
    return conversation

@frappe.whitelist()
def ask_openai_question(conversation):
    """Ask a question to the OpenAI model and handle the response."""
    try:
        client = get_openai_client()
    except ValueError as e:
        return json.dumps({"error": str(e)})  # Return as JSON

    # Add the pre-prompt as the initial message
    if conversation and conversation[0].get("role") != "system":
        conversation.insert(0, {"role": "system", "content": PRE_PROMPT})
    frappe.log_error(message=json.dumps(conversation), title="OpenAI Question")

    try:
        tools = get_tools()
        response = client.chat.completions.create(
            model=MODEL, messages=conversation, tools=tools, tool_choice="auto"
        )

        response_message = response.choices[0].message
        if hasattr(response_message, "error"):
            frappe.log_error(message=str(response_message), title="OpenAI Error")
            return json.dumps({"error": response_message.error})  # Return as JSON

        frappe.log_error(message=str(response_message), title="OpenAI Response")

        tool_calls = getattr(response_message, "tool_calls", [])
        if tool_calls:
            conversation.append(response_message)
            conversation = handle_tool_calls(tool_calls, conversation)
            if isinstance(conversation, dict) and "error" in conversation:
                return json.dumps(conversation)  # Return as JSON

            second_response = client.chat.completions.create(
                model=MODEL, messages=conversation
            )
            return json.dumps(second_response.choices[0].message)  # Return as JSON

        return json.dumps(response_message)  # Return as JSON
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Error")
        return json.dumps({"error": str(e)})  # Return as JSON

@frappe.whitelist()
def test_openai_api_key(api_key):
    """Test if the provided OpenAI API key is valid."""
    client = OpenAI(api_key=api_key)
    try:
        client.models.list()  # Test API call
        return json.dumps(True)  # Return as JSON
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Key Test Failed")
        return json.dumps(False)  # Return as JSON

@frappe.whitelist()
def check_openai_key_and_role():
    """Check if the user is a System Manager and if the OpenAI API key is set and valid."""
    user = frappe.session.user
    if "System Manager" not in frappe.get_roles(user):
        return json.dumps({"show_button": False, "reason": "Only System Managers can access."})  # Return as JSON

    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        return json.dumps({"show_button": False, "reason": "OpenAI API key is not set in OpenAI Settings."})  # Return as JSON

    try:
        client = OpenAI(api_key=api_key)
        client.models.list()  # Test API call
        return json.dumps({"show_button": True})  # Return as JSON
    except Exception as e:
        return json.dumps({"show_button": False, "reason": str(e)})  # Return as JSON
