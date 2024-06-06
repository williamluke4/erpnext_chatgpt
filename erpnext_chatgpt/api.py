import frappe
from frappe import _
import openai
import json
from erpnext_chatgpt.tools import get_tools, available_functions

@frappe.whitelist()
def ask_openai_question(question):
    api_key = frappe.db.get_single_value("OpenAI Settings", "api_key")
    if not api_key:
        return {"error": "OpenAI API key is not set in OpenAI Settings."}

    openai.api_key = api_key

    client = openai.Client(api_key=api_key)

    try:
        # Step 1: Send the conversation and available functions to the model
        messages = [{"role": "user", "content": question}]
        tools = get_tools()
        response = client.chat.completions.create(
            model="gpt-4", messages=messages, tools=tools, tool_choice="auto"
        )

        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        # Step 2: Check if the model wanted to call a function
        if tool_calls:
            messages.append(response_message)

            # Step 4: Send the info for each function call and function response to the model
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_to_call = available_functions[function_name]
                function_args = json.loads(tool_call.function.arguments)
                function_response = function_to_call(**function_args)

                messages.append(
                    {
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response,
                    }
                )

            second_response = client.chat.completions.create(
                model="gpt-4", messages=messages
            )

            return second_response

        return {"error": "No function called"}
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Error")
        return {"error": str(e)}

@frappe.whitelist()
def test_openai_api_key(api_key):
    try:
        openai.api_key = api_key
        openai.Engine.list()  # Test API call
        return True
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Key Test Failed")
        return False
