# [WIP] ERPNext OpenAI Integration

ERPNext app for integrating OpenAI functionality.


## Adding the HTML Page to ERPNext
Add the HTML page to ERPNext to make it accessible.

Go to ERPNext's Desk > Website > Web Page.
Create a new Web Page:
Title: OpenAI Interface
Route: openai-interface
Content: <div>{% include "erpnext_chatgpt/templates/pages/openai_interface.html" %}</div>
Save the Web Page.