// Wait for the DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", initializeChat);

let currentSessionIndex = null;

async function initializeChat() {
  await loadMarkedJs();
  await loadDompurify();
  const erpNextRenderer = new ERPNextRenderer();
  marked.setOptions({
    renderer: erpNextRenderer,
  });

  checkUserPermissionsAndShowButton();
}

async function checkUserPermissionsAndShowButton() {
  try {
    const response = await frappe.call({
      method: "erpnext_chatgpt.erpnext_chatgpt.api.check_openai_key_and_role",
    });
    if (response?.message?.show_button) {
      showChatButton();
    }
  } catch (error) {
    console.error("Error checking permissions:", error);
  }
}

function showChatButton() {
  const chatButton = createChatButton();
  document.body.appendChild(chatButton);
  chatButton.addEventListener("click", openChatDialog);
}

function createChatButton() {
  const button = document.createElement("button");
  Object.assign(button, {
    id: "chatButton",
    className: "btn btn-primary btn-circle",
    innerText: "+",
    title: "Open AI Chat",
  });
  Object.assign(button.style, {
    position: "fixed",
    zIndex: "1000",
    bottom: "20px",
    right: "20px",
  });
  return button;
}

function openChatDialog() {
  const dialog = createChatDialog();
  document.body.appendChild(dialog);
  $(dialog).modal("show");
  loadSessions();
}

function createChatDialog() {
  const dialog = document.createElement("div");
  dialog.id = "chatDialog";
  dialog.className = "modal fade";
  dialog.setAttribute("tabindex", "-1");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-labelledby", "chatDialogTitle");
  dialog.innerHTML = `
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="chatDialogTitle">Ask OpenAI</h5>
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
          <input type="text" id="question" class="form-control mr-2" placeholder="Ask a question..." aria-label="Ask a question">
          <button type="button" class="btn btn-primary" id="askButton">Ask</button>
        </div>
      </div>
    </div>
  `;

  const askButton = dialog.querySelector("#askButton");
  askButton.addEventListener("click", handleAskButtonClick);

  const questionInput = dialog.querySelector("#question");
  questionInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAskButtonClick();
    }
  });

  return dialog;
}

function handleAskButtonClick() {
  const input = document.getElementById("question");
  const question = input.value.trim();
  if (!question) return;

  input.value = "Loading...";
  askQuestion(question).finally(() => (input.value = ""));
}

function loadSessions() {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  const sessionsList = document.getElementById("sessions-list");

  sessionsList.innerHTML = "";
  sessions.forEach((session, index) => {
    const sessionItem = createSessionListItem(session, index);
    sessionsList.appendChild(sessionItem);
  });
}

function createSessionListItem(session, index) {
  const sessionItem = document.createElement("li");
  sessionItem.className =
    "list-group-item d-flex justify-content-between align-items-center";
  sessionItem.onclick = () => loadSession(index);
  sessionItem.innerHTML = `
    <span style="cursor: pointer;">${session.name}</span>
    <button class="btn btn-danger btn-sm" onclick="deleteSession(event, ${index})">Delete</button>
  `;
  return sessionItem;
}

function deleteSession(event, index) {
  event.stopPropagation();
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.splice(index, 1);
  localStorage.setItem("sessions", JSON.stringify(sessions));
  loadSessions();
  if (index === currentSessionIndex) {
    currentSessionIndex = null;
    document.getElementById("answer").innerHTML = "";
  }
}

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

async function askQuestion(question) {
  if (currentSessionIndex === null) {
    alert("Please select or create a session first.");
    return;
  }

  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  let conversation = sessions[currentSessionIndex].conversation;
  conversation.push({ role: "user", content: question });

  try {
    const response = await fetch(
      "/api/method/erpnext_chatgpt.erpnext_chatgpt.api.ask_openai_question",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": frappe.csrf_token,
        },
        body: JSON.stringify({ conversation }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API response:", data);

    const messageContent = parseResponseMessage(data);
    conversation.push({ role: "assistant", content: messageContent });
    sessions[currentSessionIndex].conversation = conversation;
    localStorage.setItem("sessions", JSON.stringify(sessions));
    displayConversation(conversation);
  } catch (error) {
    console.error("Error in askQuestion:", error);
    document.getElementById("answer").innerHTML = `
      <div class="alert alert-danger" role="alert">
        Error: ${error.message}. Please try again later.
      </div>
    `;
  }
}

function parseResponseMessage(response) {
  // If the response is null or undefined, return an error message
  if (response == null) {
    return "No response received.";
  }

  // If the response is an object with a message property, use that
  const message = response.message ?? response;

  // If the message is a string, return it directly
  if (typeof message === "string") {
    return message;
  }

  // If the message is an object with a content property, return that
  if (message && typeof message === "object" && "content" in message) {
    return message.content;
  }

  // If the message is an array, try to find a content item
  if (Array.isArray(message)) {
    const contentItem = message.find(
      (item) =>
        (Array.isArray(item) && item[0] === "content") ||
        (item && typeof item === "object" && "content" in item)
    );
    if (contentItem) {
      return Array.isArray(contentItem) ? contentItem[1] : contentItem.content;
    }
  }

  // If we can't parse the message in any known format, return the stringified version
  return JSON.stringify(message, null, 2);
}

function displayConversation(conversation) {
  const conversationContainer = document.getElementById("answer");
  conversationContainer.innerHTML = "";

  conversation.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.className =
      message.role === "user" ? "alert alert-info" : "alert alert-secondary";
    messageElement.innerHTML = renderMessageContent(message.content);
    conversationContainer.appendChild(messageElement);
  });
}

function renderMessageContent(content) {
  console.log("Rendering content:", content);

  if (content === null) return "<em>null</em>";
  if (typeof content === "boolean") return `<strong>${content}</strong>`;
  if (typeof content === "number") return `<span>${content}</span>`;
  if (typeof content === "string") {
    const parsed = DOMPurify.sanitize(marked.parse(content));
    console.log(parsed);
    return parsed;
  }
  if (Array.isArray(content)) {
    return `<ul class="list-group">${content
      .map(
        (item) =>
          `<li class="list-group-item">${renderMessageContent(item)}</li>`
      )
      .join("")}</ul>`;
  }
  if (typeof content === "object") return renderCollapsibleObject(content);

  return `<em>Unsupported type: ${typeof content}</em>`;
}

function renderCollapsibleObject(object) {
  const objectEntries = Object.entries(object)
    .map(
      ([key, value]) =>
        `<div><strong>${key}:</strong> ${renderMessageContent(value)}</div>`
    )
    .join("");
  return `
    <div class="collapsible-object">
      <button class="btn btn-sm btn-secondary" onclick="toggleCollapse(this)">Toggle Object</button>
      <div class="object-content" style="display: none; padding-left: 15px;">
        ${objectEntries}
      </div>
    </div>
  `;
}

function toggleCollapse(button) {
  const content = button.nextElementSibling;
  content.style.display = content.style.display === "none" ? "block" : "none";
}

function isMarkdown(content) {
  return /[#*_~`]/.test(content);
}

function escapeHTML(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function loadMarkedJs() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load marked.js"));
    document.head.appendChild(script);
  });
}

async function loadDompurify() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load dompurify"));
    document.head.appendChild(script);
  });
}

class ERPNextRenderer {
  // Block-level renderer methods
  heading(token) {
    const escapedText = token.text.toLowerCase().replace(/[^\w]+/g, "-");
    return `
      <h${token.depth} class="erpnext-heading" id="${escapedText}">
        ${token.text}
        <a href="#${escapedText}" class="anchor-link">
          <i class="fa fa-link" aria-hidden="true"></i>
        </a>
      </h${token.depth}>
    `;
  }

  code(token) {
    const lang = token.lang || "plaintext";
    return `<pre><code class="hljs language-${lang}">${
      this.options.highlight
        ? this.options.highlight(token.text, lang)
        : token.text
    }</code></pre>`;
  }

  table(token) {
    let header = "";
    let body = "";

    // Generate table header
    header =
      "<thead><tr>" +
      token.header.map((cell) => this.tablecell(cell)).join("") +
      "</tr></thead>";

    // Generate table body
    body =
      "<tbody>" +
      token.rows
        .map((row) => {
          return (
            "<tr>" + row.map((cell) => this.tablecell(cell)).join("") + "</tr>"
          );
        })
        .join("") +
      "</tbody>";

    return `
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          ${header}
          ${body}
        </table>
      </div>
    `;
  }

  tablecell(token) {
    const type = token.header ? "th" : "td";
    const classes = token.align ? `class="text-${token.align}"` : "";
    return `<${type} ${classes}>${this.parseInline(token.tokens)}</${type}>`;
  }

  list(token) {
    const type = token.ordered ? "ol" : "ul";
    const start = token.start === "" ? "" : ` start="${token.start}"`;
    return `<${type}${start}>\n${token.items
      .map((item) => this.listitem(item))
      .join("")}</${type}>\n`;
  }

  listitem(token) {
    const checkbox = token.task ? this.checkbox(token.checked) : "";
    const content = this.parseInline(token.tokens);
    return `<li>${checkbox}${content}</li>\n`;
  }

  checkbox(checked) {
    return `<input type="checkbox" ${checked ? "checked" : ""} disabled> `;
  }

  // Inline-level renderer methods
  link(token) {
    const href = this.cleanUrl(token.href);
    if (href === null) {
      return token.text;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${
      token.title || ""
    }">${token.text}</a>`;
  }

  image(token) {
    const src = this.cleanUrl(token.href);
    if (src === null) {
      return token.text;
    }
    return `<img src="${src}" alt="${token.text}" title="${
      token.title || ""
    }" class="img-fluid rounded">`;
  }

  // Helper method to parse inline tokens
  parseInline(tokens) {
    return tokens
      .map((token) => {
        switch (token.type) {
          case "text":
          case "escape":
          case "tag":
            return this.text(token);
          case "link":
            return this.link(token);
          case "image":
            return this.image(token);
          case "strong":
            return this.strong(token);
          case "em":
            return this.em(token);
          case "codespan":
            return this.codespan(token);
          case "br":
            return this.br(token);
          case "del":
            return this.del(token);
          default:
            return "";
        }
      })
      .join("");
  }
}
