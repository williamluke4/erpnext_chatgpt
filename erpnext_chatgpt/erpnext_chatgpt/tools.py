import frappe
import json
from datetime import datetime, date
from decimal import Decimal


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    frappe.log_error(
        title="Not serializable", message=f"Type {type(obj)} not serializable"
    )
    return ""


def get_sales_invoices(start_date=None, end_date=None):
    query = "SELECT * FROM `tabSales Invoice`"
    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        return json.dumps(
            frappe.db.sql(query, (start_date, end_date), as_dict=True),
            default=json_serial,
        )
    return json.dumps(frappe.db.sql(query, as_dict=True), default=json_serial)


get_sales_invoices_tool = {
    "type": "function",
    "function": {
        "name": "get_sales_invoices",
        "description": "Get sales invoices from the last month",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["start_date", "end_date"],
        },
    },
}


def get_employees():
    return json.dumps(
        frappe.db.sql("SELECT * FROM `tabEmployee`", as_dict=True), default=json_serial
    )


get_employees_tool = {
    "type": "function",
    "function": {
        "name": "get_employees",
        "description": "Get a list of employees",
        "parameters": {},
    },
}


def get_purchase_orders(start_date=None, end_date=None):
    query = "SELECT * FROM `tabPurchase Order`"
    if start_date and end_date:
        query += " WHERE transaction_date BETWEEN %s AND %s"
        return json.dumps(
            frappe.db.sql(query, (start_date, end_date), as_dict=True),
            default=json_serial,
        )
    return json.dumps(frappe.db.sql(query, as_dict=True), default=json_serial)


get_purchase_orders_tool = {
    "type": "function",
    "function": {
        "name": "get_purchase_orders",
        "description": "Get purchase orders from the last month",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["start_date", "end_date"],
        },
    },
}


def get_customers():
    return json.dumps(
        frappe.db.sql("SELECT * FROM `tabCustomer`", as_dict=True), default=json_serial
    )


get_customers_tool = {
    "type": "function",
    "function": {
        "name": "get_customers",
        "description": "Get a list of customers",
        "parameters": {},
    },
}


def get_stock_levels():
    return json.dumps(
        frappe.db.sql(
            "SELECT item_code, warehouse, actual_qty FROM `tabBin`", as_dict=True
        ),
        default=json_serial,
    )


get_stock_levels_tool = {
    "type": "function",
    "function": {
        "name": "get_stock_levels",
        "description": "Get current stock levels",
        "parameters": {},
    },
}


def get_general_ledger_entries(start_date=None, end_date=None):
    query = "SELECT * FROM `tabGL Entry`"
    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        return json.dumps(
            frappe.db.sql(query, (start_date, end_date), as_dict=True),
            default=json_serial,
        )
    return json.dumps(frappe.db.sql(query, as_dict=True), default=json_serial)


get_general_ledger_entries_tool = {
    "type": "function",
    "function": {
        "name": "get_general_ledger_entries",
        "description": "Get general ledger entries from the last month",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["start_date", "end_date"],
        },
    },
}


def get_balance_sheet():
    return json.dumps(frappe.get_all("Balance Sheet"), default=json_serial)


get_balance_sheet_tool = {
    "type": "function",
    "function": {
        "name": "get_balance_sheet",
        "description": "Get the balance sheet report",
        "parameters": {},
    },
}


def get_profit_and_loss_statement():
    return json.dumps(frappe.get_all("Profit and Loss Statement"), default=json_serial)


get_profit_and_loss_statement_tool = {
    "type": "function",
    "function": {
        "name": "get_profit_and_loss_statement",
        "description": "Get the profit and loss statement report",
        "parameters": {},
    },
}


def get_outstanding_invoices():
    return json.dumps(
        frappe.db.sql(
            "SELECT * FROM `tabSales Invoice` WHERE outstanding_amount > 0",
            as_dict=True,
        ),
        default=json_serial,
    )


get_outstanding_invoices_tool = {
    "type": "function",
    "function": {
        "name": "get_outstanding_invoices",
        "description": "Get the list of outstanding invoices",
        "parameters": {},
    },
}


def get_sales_orders(start_date=None, end_date=None):
    query = "SELECT * FROM `tabSales Order`"
    if start_date and end_date:
        query += " WHERE transaction_date BETWEEN %s AND %s"
        return json.dumps(
            frappe.db.sql(query, (start_date, end_date), as_dict=True),
            default=json_serial,
        )
    return json.dumps(frappe.db.sql(query, as_dict=True), default=json_serial)


get_sales_orders_tool = {
    "type": "function",
    "function": {
        "name": "get_sales_orders",
        "description": "Get sales orders from the last month",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["start_date", "end_date"],
        },
    },
}


def get_purchase_invoices(start_date=None, end_date=None):
    query = "SELECT * FROM `tabPurchase Invoice`"
    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        return json.dumps(
            frappe.db.sql(query, (start_date, end_date), as_dict=True),
            default=json_serial,
        )
    return json.dumps(frappe.db.sql(query, as_dict=True), default=json_serial)


get_purchase_invoices_tool = {
    "type": "function",
    "function": {
        "name": "get_purchase_invoices",
        "description": "Get purchase invoices from the last month",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["start_date", "end_date"],
        },
    },
}


def get_tools():
    return [
        get_sales_invoices_tool,
        get_employees_tool,
        get_purchase_orders_tool,
        get_customers_tool,
        get_stock_levels_tool,
        get_general_ledger_entries_tool,
        get_balance_sheet_tool,
        get_profit_and_loss_statement_tool,
        get_outstanding_invoices_tool,
        get_sales_orders_tool,
        get_purchase_invoices_tool,
    ]


available_functions = {
    "get_sales_invoices": get_sales_invoices,
    "get_employees": get_employees,
    "get_purchase_orders": get_purchase_orders,
    "get_customers": get_customers,
    "get_stock_levels": get_stock_levels,
    "get_general_ledger_entries": get_general_ledger_entries,
    "get_balance_sheet": get_balance_sheet,
    "get_profit_and_loss_statement": get_profit_and_loss_statement,
    "get_outstanding_invoices": get_outstanding_invoices,
    "get_sales_orders": get_sales_orders,
    "get_purchase_invoices": get_purchase_invoices,
}
