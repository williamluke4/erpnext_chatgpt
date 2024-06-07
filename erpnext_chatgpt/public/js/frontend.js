document.addEventListener("DOMContentLoaded", () => {
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
    $(dialog).modal("show");
    loadSessions(); // Ensure sessions are loaded after the dialog is created
  });
}

function createChatButton() {
  const chatButton = document.createElement("button");
  chatButton.id = "chatButton";
  chatButton.className = "btn btn-primary btn-sm";
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
  dialog.className = "modal fade";
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
          <div id="sessions-container" class="mb-3">
            <button class="btn btn-success" onclick="createSession()">New Session</button>
            <ul id="sessions-list" class="list-group mt-2"></ul>
          </div>
          <div id="answer" class="p-3" style="background: #f4f4f4; margin-top: 10px;"></div>
        </div>
        <div class="modal-footer">
          <input type="text" id="question" class="form-control" placeholder="Ask a question...">
          <button type="button" class="btn btn-primary" id="askButton">Ask</button>
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

function loadSessions() {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  const sessionsList = document.getElementById("sessions-list");
  if (sessionsList) {
    sessionsList.innerHTML = "";

    sessions.forEach((session, index) => {
      const sessionItem = document.createElement("li");
      sessionItem.className =
        "list-group-item d-flex justify-content-between align-items-center";
      sessionItem.onclick = () => loadSession(index);
      sessionItem.innerHTML = `
        <span>${session.name}</span>
        <button class="btn btn-danger btn-sm" onclick="deleteSession(${index})">Delete</button>
      `;
      sessionsList.appendChild(sessionItem);
    });
  }
}

function createSession() {
  const sessionName = prompt("Enter session name:");
  if (sessionName) {
    const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
    sessions.push({ name: sessionName, conversation: [] });
    localStorage.setItem("sessions", JSON.stringify(sessions));
    loadSessions();
  }
}

function deleteSession(index) {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.splice(index, 1);
  localStorage.setItem("sessions", JSON.stringify(sessions));
  loadSessions();
}

function loadSession(index) {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessionStorage.setItem(
    "conversation",
    JSON.stringify(sessions[index].conversation)
  );
  displayConversation(sessions[index].conversation);
}

async function askQuestion(question) {
  let conversation = JSON.parse(sessionStorage.getItem("conversation")) || [];
  conversation.push({ role: "user", content: question });

  try {
    const csrfToken = frappe.csrf_token;

    const response = await fetch(
      "/api/method/erpnext_chatgpt.erpnext_chatgpt.api.ask_openai_question",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
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
      conversation.push({ role: "assistant", content: data.message.content });
      sessionStorage.setItem("conversation", JSON.stringify(conversation));
      displayConversation(conversation);
      saveCurrentSession(conversation);
    }
  } catch (error) {
    document.getElementById("answer").innerText = `Error: ${error.message}`;
  }
}

function saveCurrentSession(conversation) {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  const sessionName = prompt("Enter session name to save:", "New Session");
  if (sessionName) {
    const sessionIndex = sessions.findIndex(
      (session) => session.name === sessionName
    );
    if (sessionIndex !== -1) {
      sessions[sessionIndex].conversation = conversation;
    } else {
      sessions.push({ name: sessionName, conversation });
    }
    localStorage.setItem("sessions", JSON.stringify(sessions));
    loadSessions();
  }
}

function displayConversation(conversation) {
  const conversationContainer = document.getElementById("answer");
  conversationContainer.innerHTML = "";
  conversation.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.className =
      message.role === "user" ? "alert alert-info" : "alert alert-secondary";
    messageElement.innerHTML = renderMessageContent(message);
    conversationContainer.appendChild(messageElement);
  });
}

function renderMessageContent(message) {
  if (message.role === "assistant") {
    return marked.parse(message.content || "", {
      renderer: getBootstrapRenderer(),
    });
  }
  return `<strong>${message.role}:</strong> ${marked.parse(
    message.content || "",
    { renderer: getBootstrapRenderer() }
  )}`;
}

function getBootstrapRenderer() {
  const renderer = new marked.Renderer();

  renderer.heading = (text, level) => {
    const sizes = ["h1", "h2", "h3", "h4", "h5", "h6"];
    return `<${sizes[level - 1]} class="mt-3 mb-3">${text}</${
      sizes[level - 1]
    }>`;
  };

  renderer.paragraph = (text) => {
    return `<p class="mb-2">${text}</p>`;
  };

  renderer.list = (body, ordered) => {
    const type = ordered ? "ol" : "ul";
    return `<${type} class="list-group mb-2">${body}</${type}>`;
  };

  renderer.listitem = (text) => {
    return `<li class="list-group-item">${text}</li>`;
  };

  renderer.table = (header, body) => {
    return `
      <table class="table table-striped">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  return renderer;
}

// Load marked.js for markdown parsing
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
script.onload = () => {
  console.log("marked.js loaded successfully.");
};
script.onerror = () => {
  console.error("Error loading marked.js.");
};
document.head.appendChild(script);
