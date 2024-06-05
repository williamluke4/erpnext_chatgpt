import frappe
from frappe import _
import openai

@frappe.whitelist()
def ask_openai_question(question):
    # Fetch the API key from OpenAI Settings
    api_key = frappe.db.get_single_value('OpenAI Settings', 'api_key')
    if not api_key:
        return {"error": "OpenAI API key is not set in OpenAI Settings."}

    openai.api_key = api_key

    functions = [
        {
            "name": "get_sales_invoices",
            "description": "Get sales invoices from the last month",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format"},
                    "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format"}
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_employees",
            "description": "Get a list of employees",
            "parameters": {}
        },
        {
            "name": "get_purchase_orders",
            "description": "Get purchase orders from the last month",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format"},
                    "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format"}
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_customers",
            "description": "Get a list of customers",
            "parameters": {}
        },
        {
            "name": "get_stock_levels",
            "description": "Get current stock levels",
            "parameters": {}
        },
        {
            "name": "get_general_ledger_entries",
            "description": "Get general ledger entries from the last month",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format"},
                    "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format"}
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_balance_sheet",
            "description": "Get the balance sheet report",
            "parameters": {}
        },
        {
            "name": "get_profit_and_loss_statement",
            "description": "Get the profit and loss statement report",
            "parameters": {}
        },
        {
            "name": "get_outstanding_invoices",
            "description": "Get the list of outstanding invoices",
            "parameters": {}
        }
    ]

    response = openai.ChatCompletion.create(
        model="gpt-4-0613",
        messages=[
            {"role": "system", "content": "You are an assistant that helps with querying ERPNext data."},
            {"role": "user", "content": question}
        ],
        functions=functions
    )

    function_call = response['choices'][0]['message'].get('function_call')
    if function_call:
        function_name = function_call['name']
        params = function_call.get('parameters', {})
        data = frappe.call(f"openai_integration.api.{function_name}", **params)
    else:
        data = {"error": "No function called"}

    return data

def get_sales_invoices(start_date=None, end_date=None):
    query = "SELECT * FROM `tabSales Invoice`"
    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        return frappe.db.sql(query, (start_date, end_date), as_dict=True)
    return frappe.db.sql(query, as_dict=True)

def get_employees():
    return frappe.db.sql("SELECT * FROM `tabEmployee`", as_dict=True)

def get_purchase_orders(start_date=None, end_date=None):
    query = "SELECT * FROM `tabPurchase Order`"
    if start_date and end_date:
        query += " WHERE transaction_date BETWEEN %s AND %s"
        return frappe.db.sql(query, (start_date, end_date), as_dict=True)
    return frappe.db.sql(query, as_dict=True)

def get_customers():
    return frappe.db.sql("SELECT * FROM `tabCustomer`", as_dict=True)

def get_stock_levels():
    return frappe.db.sql("SELECT item_code, warehouse, actual_qty FROM `tabBin`", as_dict=True)

def get_general_ledger_entries(start_date=None, end_date=None):
    query = "SELECT * FROM `tabGL Entry`"
    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        return frappe.db.sql(query, (start_date, end_date), as_dict=True)
    return frappe.db.sql(query, as_dict=True)

def get_balance_sheet():
    return frappe.get_all('Balance Sheet')

def get_profit_and_loss_statement():
    return frappe.get_all('Profit and Loss Statement')

def get_outstanding_invoices():
    return frappe.db.sql("SELECT * FROM `tabSales Invoice` WHERE outstanding_amount > 0", as_dict=True)

@frappe.whitelist()
def test_openai_api_key(api_key):
    try:
        openai.api_key = api_key
        openai.Engine.list()  # Test API call
        return True
    except Exception as e:
        frappe.log_error(message=str(e), title="OpenAI API Key Test Failed")
        return False
