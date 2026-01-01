import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ConversationsProvider, useConversations } from "./contexts/ConversationsContext";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import UpgradeModal from "./components/UpgradeModal";
import SpeechPlayer from "./components/SpeechPlayer";
import ModesHelp from "./components/ModesHelp";
import ValidationButtons from "./components/ValidationButtons";
import ImageUpload from "./components/ImageUpload";

const ChatInterface = () => {
  const { user, canAskQuestion, getRemainingQuestions, incrementQuestions, addValidatedConcept, getValidatedConcepts } = useAuth();
  const {
    currentConversation,
    createConversation,
    addMessage,
    getCurrentConversation,
    updateConversationSettings,
    switchToMode,
  } = useConversations();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mode, setMode] = useState("prof");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const conversation = getCurrentConversation();
  const messages = conversation?.messages || [];

  useEffect(() => {
    if (!currentConversation) {
      createConversation(null, "prof");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation) {
      setMode(conversation.mode || "prof");
    }
  }, [conversation]);

  const handleModeChange = (newMode) => {
    if (newMode === mode) return; // Pas de changement si déjà dans ce mode
    
    setMode(newMode);
    // Basculer vers la conversation du mode sélectionné (ou en créer une nouvelle)
    switchToMode(newMode);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || loading) return;

    if (!canAskQuestion()) {
      if (!user) {
        setShowAuth(true);
      } else {
        setShowUpgrade(true);
      }
      return;
    }

    if (!currentConversation) {
      createConversation(selectedImage ? "Photo envoyée" : trimmed, mode);
    }

    // Vérifier que la conversation actuelle est bien du bon mode
    const currentConv = getCurrentConversation();
    if (currentConv && currentConv.mode !== mode) {
      // Si on est dans la mauvaise conversation, basculer vers le bon mode
      switchToMode(mode);
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed || (selectedImage ? "📷 Photo envoyée" : ""),
      image: selectedImage,
      timestamp: new Date().toISOString(),
    };

    addMessage(currentConversation, userMessage);
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setImageFile(null);
    setLoading(true);

    try {
      // Il n'y a plus que 2 modes : prof et prompt
      // Récupérer l'historique complet pour le contexte
      const currentMessages = getCurrentConversation()?.messages || [];
      const conversationHistory = [
        ...currentMessages,
        { 
          role: "user", 
          content: trimmed || (imageToSend ? "Photo envoyée" : ""),
          image: imageToSend
        }
      ];
      
      const resp = await fetch('http://localhost:5001/api/mentorlearn', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode,
          message: trimmed || (imageToSend ? "Photo envoyée" : ""),
          image: imageToSend,
          history: conversationHistory,
        }),
      });

      const data = await resp.json();

      if (data?.result) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.result,
          timestamp: new Date().toISOString(),
        };

        addMessage(currentConversation, aiMessage);
        incrementQuestions();
      } else if (data?.error) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Erreur : ${data.error}`,
          timestamp: new Date().toISOString(),
        };
        addMessage(currentConversation, errorMessage);
      }
    } catch (err) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Erreur réseau. Le serveur est-il démarré ?",
        timestamp: new Date().toISOString(),
      };
      addMessage(currentConversation, errorMessage);
    }

    setLoading(false);
  };

  const handleValidationClick = async (action) => {
    let message = "";
    if (action === "understood") {
      message = "J'ai compris";
      
      // Extraire le sujet principal de la conversation pour le sauvegarder
      const conversation = getCurrentConversation();
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const firstUserMessage = conversation.messages.find(m => m.role === "user");
        if (firstUserMessage) {
          // Extraire le sujet (mots clés) de la première question
          const subject = extractSubjectFromQuestion(firstUserMessage.content);
          if (subject) {
            addValidatedConcept(subject);
          }
        }
      }
    } else if (action === "explain-differently") {
      message = "Explique autrement";
    } else if (action === "continue") {
      message = "Continue";
    }

    if (!message) return;

    // Créer un événement simulé pour réutiliser onSubmit
    setInput(message);
    
    // Attendre que l'input soit mis à jour, puis soumettre
    setTimeout(() => {
      const event = { preventDefault: () => {} };
      onSubmit(event);
    }, 0);
  };

  // Fonction pour extraire le sujet d'une question
  const extractSubjectFromQuestion = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    // Patterns de questions courantes
    const patterns = [
      /(?:c'est quoi|qu'est-ce que|explique|comprendre|apprendre)\s+(?:le|la|les|l'|l')\s*([^?.\n]+)/i,
      /(?:c'est quoi|qu'est-ce que)\s+([^?.\n]+)/i,
      /explique(?:-moi)?\s+([^?.\n]+)/i,
      /comment\s+(?:fonctionne|marche|ça marche)\s+([^?.\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Si aucun pattern ne correspond, retourner les 3-5 premiers mots significatifs
    const words = question.split(' ').filter(w => w.length > 3);
    if (words.length > 0) {
      return words.slice(0, Math.min(3, words.length)).join(' ');
    }
    
    return null;
  };

  const handleImageSelect = (imageData, file) => {
    setSelectedImage(imageData);
    setImageFile(file);
  };

  const remaining = getRemainingQuestions();
  const showQuotaWarning = !canAskQuestion();

  const getModeTheme = () => {
    if (mode === "prof") {
      return "theme-prof";
    }
    return "theme-prompt";
  };

  return (
    <div className="app-container">
      <Sidebar
        onUpgradeClick={() => setShowUpgrade(true)}
        onAuthClick={() => setShowAuth(true)}
        currentMode={mode}
      />

      <div className={`chat-container ${getModeTheme()}`}>
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-header-left">
              <div className="mode-selector-main">
                <button
                  className={mode === "prof" ? "active" : ""}
                  onClick={() => handleModeChange("prof")}
                >
                  🎓 Prof
                </button>
                <button
                  className={mode === "prompt" ? "active" : ""}
                  onClick={() => handleModeChange("prompt")}
                >
                  🧩 Prompt
                </button>
              </div>
              <ModesHelp />
              {user && user.plan === 'pro' && (
                <span className="chat-pro-badge">⚡ Pro</span>
              )}
            </div>
            
            <div className="current-mode-indicator">
              {mode === "prof" ? (
                <span className="mode-indicator mode-prof">
                  🎓 Mode Prof
                </span>
              ) : (
                <span className="mode-indicator mode-prompt">
                  🧩 Mode Prompt
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="empty-icon">
                {mode === "prof" ? "🎓" : "🧩"}
              </div>
              <h2>
                {mode === "prof" ? "Ton prof particulier en pilotage automatique" : "Transformons ton idée en prompt"}
              </h2>
              <p>
                {mode === "prof" 
                  ? "Dis-moi juste ce que tu veux améliorer ou comprendre. Je m'occupe du reste."
                  : "Partage ton idée, même floue. Je vais clarifier ton intention et créer un prompt structuré et réutilisable."}
              </p>
              <div className="mode-examples">
                {mode === "prof" ? (
                  <>
                    <div className="example-tag">N'importe quel sujet</div>
                    <div className="example-item">« Je veux comprendre les fractions »</div>
                    <div className="example-item">« C'est quoi la blockchain ? »</div>
                    <div className="example-item">« Comment fonctionne un moteur ? »</div>
                  </>
                ) : (
                  <>
                    <div className="example-tag">Exemples</div>
                    <div className="example-item">« Script TikTok sur les maths »</div>
                    <div className="example-item">« Post LinkedIn professionnel »</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isLastAssistantMessage = 
                msg.role === "assistant" && 
                index === messages.length - 1;

              return (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === "user" ? (
                      user?.name?.charAt(0)?.toUpperCase() || "U"
                    ) : (
                      mode === "prof" ? "🎓" : "🧩"
                    )}
                  </div>
                  <div className="message-content">
                    {msg.image && (
                      <img src={msg.image} alt="Uploaded" className="message-image" />
                    )}
                    <pre>{msg.content}</pre>
                    {msg.role === "assistant" && (
                      <>
                        <SpeechPlayer text={msg.content} mode="prof" />
                        {mode === "prof" && isLastAssistantMessage && !loading && (
                          <ValidationButtons
                            onContinue={() => handleValidationClick("continue")}
                            onExplainDifferently={() => handleValidationClick("explain-differently")}
                            onUnderstood={() => handleValidationClick("understood")}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="message message-assistant">
              <div className="message-avatar">{mode === "prof" ? "🎓" : "🧩"}</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          {showQuotaWarning && (
            <div className="quota-warning">
              {!user ? (
                <>
                  ⚠️ Limite atteinte.{" "}
                  <button onClick={() => setShowAuth(true)}>
                    Connecte-toi
                  </button>{" "}
                  pour continuer
                </>
              ) : (
                <>
                  ⚠️ Quota quotidien atteint.{" "}
                  <button onClick={() => setShowUpgrade(true)}>
                    Passe à Pro
                  </button>{" "}
                  pour accès illimité
                </>
              )}
            </div>
          )}

          {!showQuotaWarning && remaining !== Infinity && remaining <= 3 && (
            <div className="quota-info">
              {remaining} question{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} aujourd'hui
            </div>
          )}

          <form className="chat-input-form" onSubmit={onSubmit}>
            <ImageUpload 
              onImageSelect={handleImageSelect}
              disabled={loading || showQuotaWarning}
            />
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder={
                showQuotaWarning
                  ? "Limite atteinte..."
                  : mode === "prof"
                  ? "Pose ta question ou envoie une photo..."
                  : "Partage ton idée..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || showQuotaWarning}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className="chat-submit"
              disabled={loading || (!input.trim() && !selectedImage) || showQuotaWarning}
            >
              {loading ? "⏳" : "→"}
            </button>
          </form>
        </div>
      </div>

      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ConversationsProvider>
        <ChatInterface />
      </ConversationsProvider>
    </AuthProvider>
  );
}

export default App;
