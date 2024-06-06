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
      "/api/method/erpnext_chatgpt.api.ask_openai_question",
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

document.getElementById("askButton").addEventListener("click", () => {
  const question = document.getElementById("question").value;
  askQuestion(question);
});
