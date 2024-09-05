import frappe
from frappe import _
from openai import OpenAI
import json
from erpnext_chatgpt.erpnext_chatgpt.tools import get_tools, available_functions

# Define a pre-prompt to set the context or provide specific instructions
PRE_PROMPT = f"You are an AI assistant integrated with ERPNext. Please provide accurate and helpful responses based on the following questions and data provided by the user. The current date is {frappe.utils.now()}."
MODEL = "gpt-4o-mini"

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
                "content": str(function_response),
            }
        )
    return conversation


def estimate_token_count(messages):
    """
    Estimate the token count for a list of messages.
    This is a rough estimation; OpenAI provides more accurate token counting in their own libraries.
    """
    tokens_per_message = 4  # Average tokens per message (considering metadata)
    tokens_per_word = 1.5   # Average tokens per word (this may vary)

    token_count = 0
    for message in messages:
        token_count += tokens_per_message
        content = message.get("content", "")
        if content is not None:
            token_count += int(len(str(content).split()) * tokens_per_word)

    return token_count

def trim_conversation_to_token_limit(conversation, token_limit=195000):
    """
    Trim the conversation so that its total token count does not exceed the specified limit.
    Keeps the most recent messages and trims older ones.
    """
    while estimate_token_count(conversation) > token_limit:
        # Remove the oldest non-system message
        for i in range(len(conversation)):
            if conversation[i].get("role") != "system":
                del conversation[i]
                break
    return conversation

@frappe.whitelist()
def ask_openai_question(conversation):
    """
    Ask a question to the OpenAI model and handle the response.

    :param conversation: List of conversation messages.
    :return: The response from OpenAI or an error message.
    """
    try:
        client = get_openai_client()
    except ValueError as e:
        return {"error": str(e)}

    # Add the pre-prompt as the initial message
    if conversation and conversation[0].get("role") != "system":
        conversation.insert(0, {"role": "system", "content": PRE_PROMPT})

    # Trim conversation to stay within the token limit
    conversation = trim_conversation_to_token_limit(conversation)

    frappe.log_error(message=json.dumps(conversation), title="OpenAI Question")

    try:
        tools = get_tools()
        response = client.chat.completions.create(
            model=MODEL, messages=conversation, tools=tools, tool_choice="auto"
        )

        response_message = response.choices[0].message

        if hasattr(response_message, "error"):
            frappe.log_error(message=str(response_message), title="OpenAI Error")
            return {"error": response_message.error}

        frappe.log_error(message=str(response_message), title="OpenAI Response")

        tool_calls = response_message.tool_calls
        if tool_calls:
            conversation.append(response_message.model_dump())
            conversation = handle_tool_calls(tool_calls, conversation)
            if isinstance(conversation, dict) and "error" in conversation:
                return conversation

            # Trim again if needed after tool calls
            conversation = trim_conversation_to_token_limit(conversation)

            second_response = client.chat.completions.create(
                model=MODEL, messages=conversation
            )
            return second_response.choices[0].message.model_dump()

        return response_message.model_dump()
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Error")
        return {"error": str(e)}


@frappe.whitelist()
def test_openai_api_key(api_key):
    """
    Test if the provided OpenAI API key is valid.

    :param api_key: The OpenAI API key to test.
    :return: True if the API key is valid, False otherwise.
    """
    client = OpenAI(api_key=api_key)
    try:
        client.models.list()  # Test API call
        return True
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Key Test Failed")
        return False


@frappe.whitelist()
def check_openai_key_and_role():
    """
    Check if the user is a System Manager and if the OpenAI API key is set and valid.

    :return: Dictionary indicating whether to show the button and the reason if not.
    """
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
