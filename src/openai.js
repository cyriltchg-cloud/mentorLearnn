export async function askGPT(question) {
  const response = await fetch('http://localhost:5001/api/chat', {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();
  return data.result || "Erreur lors de la réponse IA";
}