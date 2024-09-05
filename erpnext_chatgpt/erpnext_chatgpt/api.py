import frappe
from frappe import _
from openai import OpenAI
import json
from typing import List, Dict, Any
from erpnext_chatgpt.erpnext_chatgpt.tools import get_tools, available_functions

# Define a pre-prompt to set the context or provide specific instructions
PRE_PROMPT = f"You are an AI assistant integrated with ERPNext. Please provide accurate and helpful responses based on the following questions and data provided by the user. The current date is {frappe.utils.now()}."
MODEL = "gpt-4o-mini"  # Updated to the latest GPT-4 model
MAX_TOKENS = 8000  # Set a maximum token limit

def get_openai_client() -> OpenAI:
    """Get the OpenAI client with the API key from settings."""
    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        frappe.throw(_("OpenAI API key is not set in OpenAI Settings."))
    return OpenAI(api_key=api_key)

def handle_tool_calls(tool_calls: List[Any], conversation: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Handle the tool calls by executing the corresponding functions and appending the results to the conversation."""
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_to_call = available_functions.get(function_name)
        if not function_to_call:
            frappe.log_error(f"Function {function_name} not found.", "OpenAI Tool Error")
            raise ValueError(f"Function {function_name} not found.")

        function_args = json.loads(tool_call.function.arguments)
        try:
            function_response = function_to_call(**function_args)
        except Exception as e:
            frappe.log_error(f"Error calling function {function_name} with args {json.dumps(function_args)}: {str(e)}", "OpenAI Tool Error")
            raise

        conversation.append({
            "tool_call_id": tool_call.id,
            "role": "tool",
            "name": function_name,
            "content": str(function_response),
        })
    return conversation

def estimate_token_count(messages: List[Dict[str, Any]]) -> int:
    """
    Estimate the token count for a list of messages.
    This is a rough estimation; OpenAI provides more accurate token counting in their own libraries.
    """
    tokens_per_message = 4  # Average tokens per message (considering metadata)
    tokens_per_word = 1.5   # Average tokens per word (this may vary)

    return sum(tokens_per_message + int(len(str(message.get("content", "")).split()) * tokens_per_word)
               for message in messages if message.get("content") is not None)

def trim_conversation_to_token_limit(conversation: List[Dict[str, Any]], token_limit: int = MAX_TOKENS) -> List[Dict[str, Any]]:
    """
    Trim the conversation so that its total token count does not exceed the specified limit.
    Keeps the most recent messages and trims older ones.
    """
    while estimate_token_count(conversation) > token_limit and len(conversation) > 1:
        # Remove the oldest non-system message
        for i, message in enumerate(conversation):
            if message.get("role") != "system":
                del conversation[i]
                break
    return conversation

@frappe.whitelist()
def ask_openai_question(conversation: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Ask a question to the OpenAI model and handle the response.

    :param conversation: List of conversation messages.
    :return: The response from OpenAI or an error message.
    """
    try:
        client = get_openai_client()

        # Add the pre-prompt as the initial message if not present
        if not conversation or conversation[0].get("role") != "system":
            conversation.insert(0, {"role": "system", "content": PRE_PROMPT})

        # Trim conversation to stay within the token limit
        conversation = trim_conversation_to_token_limit(conversation)

        frappe.logger("OpenAI").debug(f"Conversation: {json.dumps(conversation)}")

        tools = get_tools()
        response = client.chat.completions.create(
            model=MODEL,
            messages=conversation,
            tools=tools,
            tool_choice="auto"
        )

        response_message = response.choices[0].message

        frappe.logger("OpenAI").debug(f"OpenAI Response: {response_message}")

        tool_calls = response_message.tool_calls
        if tool_calls:
            conversation.append(response_message.model_dump())
            conversation = handle_tool_calls(tool_calls, conversation)

            # Trim again if needed after tool calls
            conversation = trim_conversation_to_token_limit(conversation)

            second_response = client.chat.completions.create(
                model=MODEL,
                messages=conversation
            )
            return second_response.choices[0].message.model_dump()

        return response_message.model_dump()
    except Exception as e:
        frappe.log_error(str(e), "OpenAI API Error")
        return {"error": str(e)}

@frappe.whitelist()
def test_openai_api_key(api_key: str) -> bool:
    """
    Test if the provided OpenAI API key is valid.

    :param api_key: The OpenAI API key to test.
    :return: True if the API key is valid, False otherwise.
    """
    client = OpenAI(api_key=api_key)
    try:
        client.models.list()
        return True
    except Exception as e:
        frappe.log_error(str(e), "OpenAI API Key Test Failed")
        return False

@frappe.whitelist()
def check_openai_key_and_role() -> Dict[str, Any]:
    """
    Check if the user is a System Manager and if the OpenAI API key is set and valid.

    :return: Dictionary indicating whether to show the button and the reason if not.
    """
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        return {"show_button": False, "reason": "Only System Managers can access."}

    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        return {"show_button": False, "reason": "OpenAI API key is not set in OpenAI Settings."}

    try:
        client = OpenAI(api_key=api_key)
        client.models.list()
        return {"show_button": True}
    except Exception as e:
        return {"show_button": False, "reason": str(e)}