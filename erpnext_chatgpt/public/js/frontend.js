async function askQuestion(question) {
  try {
      const response = await fetch(
          "/api/method/erpnext_chatgpt.api.ask_openai_question",
          {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({ question }),
          }
      );

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
          document.getElementById("answer").innerText = `Error: ${data.error}`;
      } else {
          document.getElementById("answer").innerText = JSON.stringify(
              data.message.result,
              null,
              2
          );
      }
  } catch (error) {
      document.getElementById("answer").innerText = `Error: ${error.message}`;
  }
}

document.getElementById("askButton").addEventListener("click", () => {
  const question = document.getElementById("question").value;
  askQuestion(question);
});
