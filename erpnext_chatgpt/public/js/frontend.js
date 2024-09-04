document.addEventListener("DOMContentLoaded", () => {
  checkUserPermissionsAndShowButton();
});

let currentSessionIndex = null; // Track the current session index

// Check permissions and show the chat button if allowed
function checkUserPermissionsAndShowButton() {
  frappe.call({
    method: "erpnext_chatgpt.erpnext_chatgpt.api.check_openai_key_and_role",
    callback: (response) => {
      if (response?.message?.show_button) {
        showChatButton();
      }
    },
  });
}

// Create and display chat button
function showChatButton() {
  const chatButton = createChatButton();
  document.body.appendChild(chatButton);

  chatButton.addEventListener("click", () => {
    const dialog = createChatDialog();
    document.body.appendChild(dialog);
    $(dialog).modal("show");
    loadSessions();
  });
}

// Create chat button with fixed positioning
function createChatButton() {
  const chatButton = document.createElement("button");
  chatButton.id = "chatButton";
  chatButton.className = "btn btn-primary btn-circle";
  chatButton.style.position = "fixed";
  chatButton.style.zIndex = "10";
  chatButton.style.bottom = "20px";
  chatButton.style.right = "20px";
  chatButton.innerText = "+";
  chatButton.title = "Open AI Chat";
  return chatButton;
}

// Create chat dialog modal
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
          <div id="answer" class="p-3" style="background: #f4f4f4; margin-top: 10px; max-height: 300px; overflow-y: auto;"></div>
        </div>
        <div class="modal-footer d-flex align-items-center" style="flex-wrap:nowrap;">
          <input type="text" id="question" class="form-control mr-2" placeholder="Ask a question...">
          <button type="button" class="btn btn-primary" id="askButton">Ask</button>
        </div>
      </div>
    </div>
  `;

  dialog.querySelector("#askButton").addEventListener("click", () => {
    const input = document.getElementById("question");
    const question = input.value.trim();
    if (!question) return;
    
    input.value = "Loading...";
    askQuestion(question).finally(() => (input.value = ""));
  });

  return dialog;
}

// Load sessions from localStorage
function loadSessions() {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  const sessionsList = document.getElementById("sessions-list");

  sessionsList.innerHTML = ""; // Clear existing items
  sessions.forEach((session, index) => {
    const sessionItem = createSessionListItem(session, index);
    sessionsList.appendChild(sessionItem);
  });
}

// Helper function to create a session list item
function createSessionListItem(session, index) {
  const sessionItem = document.createElement("li");
  sessionItem.className = "list-group-item d-flex justify-content-between align-items-center";
  sessionItem.onclick = () => loadSession(index);
  sessionItem.innerHTML = `
    <span style="cursor: pointer;">${session.name}</span>
    <button class="btn btn-danger btn-sm" onclick="deleteSession(event, ${index})">Delete</button>
  `;
  return sessionItem;
}

// Delete a session and handle UI refresh
function deleteSession(event, index) {
  event.stopPropagation(); // Prevent the session from loading when deleting
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.splice(index, 1);
  localStorage.setItem("sessions", JSON.stringify(sessions));
  loadSessions();
  if (index === currentSessionIndex) {
    currentSessionIndex = null;
    document.getElementById("answer").innerHTML = "";
  }
}

// Create a new session
function createSession() {
  const sessionName = prompt("Enter session name:");
  if (sessionName) {
    const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
    sessions.push({ name: sessionName, conversation: [] });
    localStorage.setItem("sessions", JSON.stringify(sessions));
    loadSessions();
    currentSessionIndex = sessions.length - 1;
  }
}

// Ask OpenAI a question and handle the response
async function askQuestion(question) {
  if (currentSessionIndex === null) {
    alert("Please select or create a session first.");
    return;
  }

  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  let conversation = sessions[currentSessionIndex].conversation;
  conversation.push({ role: "user", content: question });

  try {
    const csrfToken = frappe.csrf_token;
    const response = await fetch("/api/method/erpnext_chatgpt.erpnext_chatgpt.api.ask_openai_question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    console.log("API response:", data); // Debugging

    const messageContent = parseResponseMessage(data);
    conversation.push({ role: "assistant", content: messageContent });
    sessions[currentSessionIndex].conversation = conversation;
    localStorage.setItem("sessions", JSON.stringify(sessions));
    displayConversation(conversation);

  } catch (error) {
    document.getElementById("answer").innerText = `Error: ${error.message}`;
  }
}

// Parse the response and extract content intelligently
function parseResponseMessage(response) {
  const message = response?.message;

  // Handle both arrays and objects in a unified way
  if (Array.isArray(message)) {
    const contentItem = message.find((item) => item[0] === "content");
    return contentItem?.[1] || "No content available.";
  }

  return typeof message === "string" ? message : "Unexpected response format.";
}

// Render the conversation between the user and assistant
function displayConversation(conversation) {
  const conversationContainer = document.getElementById("answer");
  conversationContainer.innerHTML = "";

  conversation.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.className = message.role === "user" ? "alert alert-info" : "alert alert-secondary";

    messageElement.innerHTML = renderMessageContent(message.content);
    conversationContainer.appendChild(messageElement);
  });
}

function renderMessageContent(content) {
  try {
    // Debugging output to see what content is being passed
    console.log('Rendering content:', content);

    // Null check
    if (content === null) {
      return "<em>null</em>";
    }

    // Boolean check
    if (typeof content === "boolean") {
      return `<strong>${content ? "true" : "false"}</strong>`;
    }

    // Number check
    if (typeof content === "number") {
      return `<span>${content}</span>`;
    }

    // String check (apply markdown if needed)
    if (typeof content === "string") {
      // Use marked.js to parse markdown, if necessary
      if (isMarkdown(content)) {
        return marked.parse(content, {
          renderer: getBootstrapRenderer(),
        });
      } else {
        return `<p>${escapeHTML(content)}</p>`; // Simple HTML escape for safety
      }
    }

    // Array check (recursively render each item)
    if (Array.isArray(content)) {
      return `<ul class="list-group">${content.map(item => `<li class="list-group-item">${renderMessageContent(item)}</li>`).join('')}</ul>`;
    }

    // Object check (render JSON to avoid [object Object] and use collapsible format)
    if (typeof content === "object") {
      return renderCollapsibleObject(content);
    }

    // Unsupported type fallback
    return `<em>Unsupported type</em>`;
  } catch (error) {
    console.error("Error rendering content:", error);
    return `<em>Error rendering content: ${error.message}</em>`;
  }
}

// Helper function to render a collapsible view for objects
function renderCollapsibleObject(object) {
  const objectEntries = Object.entries(object)
    .map(([key, value]) => `<div><strong>${key}:</strong> ${renderMessageContent(value)}</div>`)
    .join('');
  return `
    <div class="collapsible-object">
      <button class="btn btn-sm btn-secondary" onclick="toggleCollapse(this)">Toggle Object</button>
      <div class="object-content" style="display: none; padding-left: 15px;">
        ${objectEntries}
      </div>
    </div>
  `;
}

// Helper function to toggle collapsibility of object content
function toggleCollapse(button) {
  const content = button.nextElementSibling;
  content.style.display = content.style.display === "none" ? "block" : "none";
}

// Markdown checker (to determine if string needs markdown parsing)
function isMarkdown(content) {
  return /[#*_~`]/.test(content); // Simple regex for markdown characters
}

// Basic HTML escaping to prevent XSS
function escapeHTML(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

// Helper function to render objects with collapsible view
function renderObjectContent(object) {
  // Convert object to key-value pair HTML
  const objectEntries = Object.entries(object)
    .map(([key, value]) => `<div><strong>${key}:</strong> ${renderMessageContent(value)}</div>`)
    .join('');

  // Return HTML for collapsible object
  return `
    <div class="collapsible-object">
      <button class="btn btn-sm btn-secondary" onclick="toggleCollapse(this)">Toggle Object</button>
      <div class="object-content" style="display: none; padding-left: 15px;">
        ${objectEntries}
      </div>
    </div>
  `;
}

// Helper function to create Bootstrap-compatible markdown renderer
function getBootstrapRenderer() {
  const renderer = new marked.Renderer();

  renderer.heading = (text, level) => `<h${level} class="mt-3 mb-3">${text}</h${level}>`;
  renderer.paragraph = (text) => `<p class="mb-2">${text}</p>`;
  renderer.list = (body, ordered) => `<${ordered ? "ol" : "ul"} class="list-group mb-2">${body}</${ordered ? "ol" : "ul"}>`;
  renderer.listitem = (text) => `<li class="list-group-item">${text}</li>`;
  renderer.table = (header, body) => `<table class="table table-striped"><thead>${header}</thead><tbody>${body}</tbody></table>`;

  return renderer;
}

// Load marked.js for markdown parsing
(function loadMarkedJs() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
  script.onload = () => console.log("marked.js loaded successfully.");
  script.onerror = () => console.error("Error loading marked.js.");
  document.head.appendChild(script);
})();
