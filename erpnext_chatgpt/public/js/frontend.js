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
  const chatButton = document.createElement("button");
  chatButton.id = "chatButton";
  chatButton.style.position = "fixed";
  chatButton.style.bottom = "20px";
  chatButton.style.left = "20px";
  chatButton.style.padding = "10px 20px";
  chatButton.style.backgroundColor = "#007bff";
  chatButton.style.color = "#fff";
  chatButton.style.border = "none";
  chatButton.style.borderRadius = "5px";
  chatButton.innerText = "Open Chat";

  document.body.appendChild(chatButton);

  chatButton.addEventListener("click", function () {
    const dialog = document.createElement("div");
    dialog.id = "chatDialog";
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

    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.padding = "5px 10px";
    closeButton.style.backgroundColor = "#dc3545";
    closeButton.style.color = "#fff";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "5px";

    closeButton.addEventListener("click", () => {
      document.body.removeChild(dialog);
    });

    const dialogContent = document.createElement("div");
    dialogContent.innerHTML = `
      <div>
        <h3>Ask OpenAI</h3>
        <input type="text" id="question" placeholder="Ask a question..." style="width: 100%; padding: 10px; margin-bottom: 10px;">
        <button id="askButton" style="padding: 10px 20px;">Ask</button>
        <pre id="answer" style="white-space: pre-wrap; word-wrap: break-word; padding: 10px; background: #f4f4f4; margin-top: 10px;"></pre>
      </div>
    `;

    dialog.appendChild(closeButton);
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    document.getElementById("askButton").addEventListener("click", () => {
      const question = document.getElementById("question").value;
      askQuestion(question);
    });

    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  });
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
    const response = await fetch(
      "/api/method/erpnext_chatgpt.erpnext_chatgpt.api.ask_openai_question",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
