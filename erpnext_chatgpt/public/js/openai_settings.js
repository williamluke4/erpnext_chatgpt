frappe.ui.form.on('OpenAI Settings', {
    refresh: function(frm) {
        // Add custom button if needed
        frm.add_custom_button(__('Test API Key'), function() {
            frappe.call({
                method: "openai_integration.api.test_openai_api_key",
                args: {
                    api_key: frm.doc.api_key
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.msgprint(__('API Key is valid'));
                    } else {
                        frappe.msgprint(__('Invalid API Key'));
                    }
                }
            });
        });
    }
});
