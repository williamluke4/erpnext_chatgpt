import frappe
import json
from datetime import datetime, date, timedelta
from decimal import Decimal

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, timedelta):
        return str(obj)
    frappe.log_error(
        title="Not serializable", message=f"Type {type(obj)} not serializable"
    )
    try:
        return str(obj)
    except Exception:
        return ""

def get_sales_invoices(start_date=None, end_date=None):
    query = "SELECT * FROM `tabSales Invoice`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True),
        default=json_serial,
    )

def get_sales_invoice(invoice_number):
    query = "SELECT * FROM `tabSales Invoice` WHERE name=%s"
    return json.dumps(
        frappe.db.sql(query, (invoice_number,), as_dict=True), default=json_serial
    )

def get_employees(department=None, designation=None):
    query = "SELECT * FROM `tabEmployee`"
    filters = []
    values = []

    if department:
        filters.append("department = %s")
        values.append(department)
    if designation:
        filters.append("designation = %s")
        values.append(designation)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True),
        default=json_serial,
    )

def get_purchase_orders(start_date=None, end_date=None, supplier=None):
    query = "SELECT * FROM `tabPurchase Order`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("transaction_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if supplier:
        filters.append("supplier = %s")
        values.append(supplier)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True),
        default=json_serial,
    )

def get_customers(customer_group=None):
    query = "SELECT * FROM `tabCustomer`"
    values = []

    if customer_group:
        query += " WHERE customer_group = %s"
        values.append(customer_group)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_stock_levels(item_code=None):
    query = "SELECT item_code, warehouse, actual_qty FROM `tabBin`"
    values = []

    if item_code:
        query += " WHERE item_code = %s"
        values.append(item_code)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_general_ledger_entries(start_date=None, end_date=None, account=None):
    query = "SELECT * FROM `tabGL Entry`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])

    if account:
        filters.append("account = %s")
        values.append(account)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_balance_sheet(start_date, end_date):
    query = """
        SELECT
            account, 
            sum(debit) - sum(credit) as balance
        FROM `tabGL Entry`
        WHERE posting_date BETWEEN %s AND %s
        GROUP BY account
    """
    return json.dumps(
        frappe.db.sql(query, (start_date, end_date), as_dict=True), default=json_serial
    )

def get_profit_and_loss_statement(
    period_start_date=None, period_end_date=None, periodicity=None
):
    if not period_start_date or not period_end_date or not periodicity:
        return json.dumps(
            {
                "error": "period_start_date, periodicity and period_end_date are required"
            },
            default=json_serial,
        )

    report = frappe.get_doc("Report", "Profit and Loss Statement")
    filters = {
        "period_start_date": period_start_date,
        "period_end_date": period_end_date,
        "periodicity": periodicity,
        "company": frappe.defaults.get_user_default("company"),
    }
    result = report.get_data(filters=filters)
    return json.dumps(result, default=json_serial)

def get_outstanding_invoices(customer=None):
    query = "SELECT * FROM `tabSales Invoice` WHERE outstanding_amount > 0"
    values = []

    if customer:
        query += " AND customer = %s"
        values.append(customer)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_sales_orders(start_date=None, end_date=None, customer=None):
    query = "SELECT * FROM `tabSales Order`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("transaction_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if customer:
        filters.append("customer = %s")
        values.append(customer)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True),
        default=json_serial,
    )

def get_purchase_invoices(start_date=None, end_date=None, supplier=None):
    query = "SELECT * FROM `tabPurchase Invoice`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if supplier:
        filters.append("supplier = %s")
        values.append(supplier)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_journal_entries(start_date=None, end_date=None):
    query = "SELECT * FROM `tabJournal Entry`"
    values = []

    if start_date and end_date:
        query += " WHERE posting_date BETWEEN %s AND %s"
        values.extend([start_date, end_date])

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial,
    )

def get_payments(start_date=None, end_date=None, payment_type=None):
    query = "SELECT * FROM `tabPayment Entry`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if payment_type:
        filters.append("payment_type = %s")
        values.append(payment_type)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial,
    )

# Re-added functions:

def get_deliveries(start_date=None, end_date=None, customer=None):
    query = "SELECT * FROM `tabDelivery Note`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if customer:
        filters.append("customer = %s")
        values.append(customer)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial,
    )

def get_stock_entries(start_date=None, end_date=None, purpose=None):
    query = "SELECT * FROM `tabStock Entry`"
    filters = []
    values = []

    if start_date and end_date:
        filters.append("posting_date BETWEEN %s AND %s")
        values.extend([start_date, end_date])
    if purpose:
        filters.append("purpose = %s")
        values.append(purpose)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial,
    )

def get_projected_stock(item_code=None, warehouse=None):
    query = "SELECT item_code, warehouse, projected_qty FROM `tabBin`"
    filters = []
    values = []

    if item_code:
        filters.append("item_code = %s")
        values.append(item_code)
    if warehouse:
        filters.append("warehouse = %s")
        values.append(warehouse)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_pricing_rules(item_code=None, price_list=None):
    query = "SELECT * FROM `tabPricing Rule`"
    filters = []
    values = []

    if item_code:
        filters.append("item_code = %s")
        values.append(item_code)
    if price_list:
        filters.append("price_list = %s")
        values.append(price_list)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

def get_items(item_code=None, item_group=None, brand=None):
    query = "SELECT * FROM `tabItem`"
    filters = []
    values = []

    if item_code:
        filters.append("name = %s")
        values.append(item_code)
    if item_group:
        filters.append("item_group = %s")
        values.append(item_group)
    if brand:
        filters.append("brand = %s")
        values.append(brand)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    return json.dumps(
        frappe.db.sql(query, tuple(values), as_dict=True), default=json_serial
    )

# Mapping available functions:

available_functions = {
    "get_sales_invoices": get_sales_invoices,
    "get_sales_invoice": get_sales_invoice,
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
    "get_journal_entries": get_journal_entries,
    "get_payments": get_payments,
    "get_deliveries": get_deliveries,
    "get_stock_entries": get_stock_entries,
    "get_projected_stock": get_projected_stock,
    "get_pricing_rules": get_pricing_rules,
    "get_items": get_items,
}
