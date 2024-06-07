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
  chatButton.style.width = "30px";
  chatButton.style.height = "30px";
  chatButton.innerText = "O";
  return chatButton;
}

function createChatDialog() {
  const dialog = document.createElement("div");
  dialog.id = "chatDialog";
  dialog.className = "modal";
  dialog.style.position = "fixed";
  dialog.style.top = "50%";
  dialog.style.left = "50%";
  dialog.style.transform = "translate(-50%, -50%)";
  dialog.style.width = "80%";
  dialog.style.height = "80%";
  dialog.style.backgroundColor = "#fff";
  dialog.style.border = "1px solid #ccc";
  dialog.style.borderRadius = "5px";
  dialog.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  dialog.style.zIndex = "1000";
  dialog.style.padding = "20px";
  dialog.style.overflowY = "auto";

  const closeButton = createCloseButton(dialog);
  dialog.appendChild(closeButton);

  const dialogContent = createDialogContent();
  dialog.appendChild(dialogContent);

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });

  return dialog;
}

function createCloseButton(dialog) {
  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.className = "btn btn-danger btn-sm"; // ERPNext button styles
  closeButton.style.position = "absolute";
  closeButton.style.top = "10px";
  closeButton.style.right = "10px";

  closeButton.addEventListener("click", () => {
    document.body.removeChild(dialog);
  });

  return closeButton;
}

function createDialogContent() {
  const dialogContent = document.createElement("div");
  dialogContent.innerHTML = `
    <div>
      <h3>Ask OpenAI</h3>
      <div class="form-group">
        <input type="text" id="question" class="form-control" placeholder="Ask a question..." style="margin-bottom: 10px;">
      </div>
      <button id="askButton" class="btn btn-primary">Ask</button>
      <pre id="answer" style="white-space: pre-wrap; word-wrap: break-word; padding: 10px; background: #f4f4f4; margin-top: 10px;"></pre>
    </div>
  `;

  dialogContent.querySelector("#askButton").addEventListener("click", () => {
    const question = document.getElementById("question").value;
    askQuestion(question);
  });

  return dialogContent;
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
      conversation.push({ role: "assistant", content: data.message.result });
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
