async function askQuestion(question) {
  const response = await fetch('/api/method/openai_integration.api.ask_openai_question', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
  });
  const data = await response.json();
  document.getElementById('answer').innerText = JSON.stringify(data.message, null, 2);
}

document.getElementById('askButton').addEventListener('click', () => {
  const question = document.getElementById('question').value;
  askQuestion(question);
});
