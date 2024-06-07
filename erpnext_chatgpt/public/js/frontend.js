document.addEventListener("DOMContentLoaded", function () {
  checkUserPermissionsAndShowButton();
});

function checkUserPermissionsAndShowButton() {
  frappe.call({
    method: "erpnext_chatgpt.erpnext_chatgpt.api.check_openai_key_and_role",
    callback: function (response) {
      if (response.message.show_button) {
        showChatButton();
      }
    },
  });
}

function showChatButton() {
  const chatButton = createChatButton();
  document.body.appendChild(chatButton);

  chatButton.addEventListener("click", function () {
    const dialog = createChatDialog();
    document.body.appendChild(dialog);
    $(dialog).modal("show"); // Use jQuery to show the modal
  });
}

function createChatButton() {
  const chatButton = document.createElement("button");
  chatButton.id = "chatButton";
  chatButton.className = "btn btn-primary btn-sm"; // ERPNext button styles
  chatButton.style.position = "fixed";
  chatButton.style.zIndex = "10";
  chatButton.style.bottom = "20px";
  chatButton.style.right = "20px";
  chatButton.innerText = "O";
  return chatButton;
}

function createChatDialog() {
  const dialog = document.createElement("div");
  dialog.id = "chatDialog";
  dialog.className = "modal fade"; // ERPNext modal styles
  dialog.setAttribute("tabindex", "-1");
  dialog.setAttribute("role", "dialog");
  dialog.innerHTML = `
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Ask OpenAI</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <input type="text" id="question" class="form-control" placeholder="Ask a question...">
          </div>
          <pre id="answer" style="white-space: pre-wrap; word-wrap: break-word; padding: 10px; background: #f4f4f4; margin-top: 10px;"></pre>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="askButton">Ask</button>
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;

  dialog.querySelector("#askButton").addEventListener("click", () => {
    const question = document.getElementById("question").value;
    askQuestion(question);
  });

  return dialog;
}

async function askQuestion(question) {
  let conversation = sessionStorage.getItem("conversation");
  if (!conversation) {
    conversation = [];
  } else {
    conversation = JSON.parse(conversation);
  }

  conversation.push({ role: "user", content: question });

  try {
    const csrfToken = frappe.csrf_token; // Get CSRF token

    const response = await fetch(
      "/api/method/erpnext_chatgpt.erpnext_chatgpt.api.ask_openai_question",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken, // Include CSRF token
        },
        body: JSON.stringify({ conversation }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      document.getElementById("answer").innerText = `Error: ${data.error}`;
    } else {
      conversation.push({ role: "assistant", content: data.message });
      sessionStorage.setItem("conversation", JSON.stringify(conversation));
      displayConversation(conversation);
    }
  } catch (error) {
    document.getElementById("answer").innerText = `Error: ${error.message}`;
  }
}

function displayConversation(conversation) {
  const conversationContainer = document.getElementById("answer");
  conversationContainer.innerHTML = "";
  conversation.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.innerText = `${message.role}: ${message.content}`;
    conversationContainer.appendChild(messageElement);
  });
}
