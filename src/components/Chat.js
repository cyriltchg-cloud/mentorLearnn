import React, { useState } from "react";
import "../components/Chat.css";
import { askGPT } from "../openai";

function Chat() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  // Nouveau state pour le nom du fichier uploadé
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Fonction text-to-speech améliorée pour voix masculine et plus naturelle
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      let voices = synth.getVoices();

      if (!voices.length) {
        synth.onvoiceschanged = () => speak(text);
        return;
      }

      const preferredNames = ['Google français', 'Paul', 'Thomas', 'Hugo'];
      let chosenVoice =
        voices.find(v => v.lang === 'fr-FR' && preferredNames.some(name => v.name.includes(name))) ||
        voices.find(v => v.lang === 'fr-FR' && (v.gender === 'male' || v.name.toLowerCase().includes('homme'))) ||
        voices.find(v => v.lang === 'fr-FR');

      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      if (chosenVoice) utterance.voice = chosenVoice;

      synth.cancel();
      synth.speak(utterance);
    }
  };

  // Handler pour l'upload de fichier (à compléter plus tard pour extraction)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      // Extraction/traitement du fichier à ajouter ici
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse("Patiente...");
    try {
      const rep = await askGPT(question);
      setResponse(rep);
      speak(rep);
    } catch (err) {
      setResponse("Erreur lors de la réponse IA : " + err.message);
      speak("Une erreur est survenue avec l'intelligence artificielle.");
    }
  };

  return (
    <div className="chat-container">
      <div className="logo-box">
        <img
          src="/mentor-logo.png"
          alt="Mentor IA Logo"
          className="mentor-logo"
        />
      </div>
      <div className="chat-title">Mentor IA&nbsp;–&nbsp;Chat</div>

      {/* Input pour envoyer un document */}
      <input
        type="file"
        accept=".pdf,.txt,.doc,.docx,.png,.jpg"
        onChange={handleFileUpload}
        style={{ marginBottom: 18 }}
      />

      {/* Affichage du nom du fichier uploadé */}
      {uploadedFileName && (
        <div style={{ marginBottom: 12, fontSize: "0.95rem", color: "#005A9E" }}>
          Document envoyé : {uploadedFileName}
        </div>
      )}

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pose ta question à Mentor IA..."
        />
        <button type="submit" className="send-btn">Envoyer</button>
      </form>
      <div className="chat-response">{response}</div>
      <button
        type="button"
        className="send-btn"
        style={{ marginTop: 18, fontSize: "1rem", padding: "6px 16px" }}
        onClick={() => speak(response)}
      >
        Écouter la réponse
      </button>
    </div>
  );
}

export default Chat;