/**
 * Agent MentorLearn Autopilot
 * Cerveau central qui pilote automatiquement tous les modes
 */

const { getUserState, updateUserState } = require("./userState");
const actions = require("./actions");

/**
 * Normalise l'historique conversationnel
 */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : String(m.content || ""),
      image: m.image || null,
    }));
}

/**
 * Construit l'input pour OpenAI Responses API
 */
function buildAgentInput({ processedText, image, history, systemPrompt, userState }) {
  const input = [];
  const h = normalizeHistory(history);

  // Si on a un état utilisateur, ajouter un contexte de reprise
  let contextPrefix = "";
  if (userState && userState.lastTopic) {
    contextPrefix = `[Contexte: La dernière fois, l'élève travaillait sur "${userState.lastTopic}". Étape: ${userState.lastStep || "début"}. Reprends automatiquement.]\\n\\n`;
  }

  // Ajouter l'historique (sauf le dernier message qui sera ajouté après)
  for (let i = 0; i < h.length - 1; i++) {
    const msg = h[i];
    if (msg.role === "user" && msg.image) {
      input.push({
        role: "user",
        content: [
          { type: "input_text", text: msg.content || "Analyse cette image." },
          { type: "input_image", image_url: msg.image },
        ],
      });
    } else {
      input.push({ role: msg.role, content: msg.content });
    }
  }

  // Message actuel
  if (image) {
    const textToSend = contextPrefix + (processedText || "Analyse cette image et réponds.");
    input.push({
      role: "user",
      content: [
        { type: "input_text", text: textToSend },
        { type: "input_image", image_url: image },
      ],
    });
  } else {
    input.push({ role: "user", content: contextPrefix + processedText });
  }

  return input;
}

/**
 * Détermine la "policy" de l'agent selon le mode et le contexte
 */
function determinePolicy(mode, hasImage, userText) {
  if (hasImage) return "photo"; // Photo/scan: réponse immédiate
  if (mode === "prompt") return "prompt"; // Mode clarification
  return "prof"; // Mode prof par défaut
}

/**
 * Prétraite le texte utilisateur pour détecter les intentions simples
 */
function preprocessUserText(userText) {
  let processedText = userText;
  const lowerText = userText.toLowerCase().trim();

  const continuationWords = ["oui", "ok", "continue", "vas-y", "vas y", "d'accord", "daccord", "ouais", "yep", "yes", "go"];
  if (continuationWords.includes(lowerText)) {
    processedText = "Oui, continue à l'étape suivante de ton explication.";
  }

  const understoodWords = ["j'ai compris", "jai compris", "compris", "c'est bon", "cest bon", "ok j'ai compris", "parfait"];
  if (understoodWords.some((w) => lowerText.includes(w))) {
    processedText = "J'ai compris cette notion, termine proprement et passe à la suite logique.";
  }

  const reformulateWords = ["explique autrement", "autrement", "je n'ai pas compris", "je nai pas compris", "je suis perdu"];
  if (reformulateWords.some((w) => lowerText.includes(w))) {
    processedText = "Je n'ai pas compris cette étape. Explique autrement avec une nouvelle analogie, puis continue.";
  }

  const changeAxisWords = ["change d'axe", "change daxe", "autre parcours", "autre approche", "autre chose"];
  if (changeAxisWords.some((w) => lowerText.includes(w)) && !reformulateWords.some((w) => lowerText.includes(w))) {
    processedText = "Change d'approche: propose une autre méthode plus simple, puis continue.";
  }

  return processedText;
}

/**
 * Détecte si l'utilisateur demande une action interne (email, rappel, etc.)
 */
function detectActionRequest(userText) {
  const lower = userText.toLowerCase();
  
  if (lower.includes("email quotidien") || lower.includes("email chaque jour")) {
    return { action: "scheduleDailyEmail", content: "Rappel quotidien MentorLearn" };
  }
  
  if (lower.includes("rapport de progression") || lower.includes("mon progrès")) {
    return { action: "generateProgressReport" };
  }
  
  if (lower.includes("rappelle-moi") || lower.includes("rappel")) {
    const match = lower.match(/(\\d+)\\s*(minute|heure)/);
    const delayMinutes = match ? (match[2] === "heure" ? parseInt(match[1]) * 60 : parseInt(match[1])) : 60;
    return { action: "reminder", text: "Rappel MentorLearn", delayMinutes };
  }
  
  return null;
}

/**
 * Exécute une action interne
 */
function executeAction(actionRequest, userId) {
  if (!actionRequest) return null;
  
  const { action, content, text, delayMinutes } = actionRequest;
  
  try {
    switch (action) {
      case "scheduleDailyEmail":
        return actions.scheduleDailyEmail(userId, content);
      case "generateProgressReport":
        return actions.generateProgressReport(userId);
      case "reminder":
        return actions.reminder(userId, text, delayMinutes);
      default:
        return null;
    }
  } catch (err) {
    console.error(`❌ Erreur action ${action}:`, err.message);
    return null;
  }
}

/**
 * Point d'entrée principal de l'agent
 * @param {Object} params - { mode, message, history, image, userId, systemPrompt }
 * @param {Object} openai - Instance OpenAI
 * @returns {Promise<Object>} - { result, meta }
 */
async function runMentorLearnAgent(params, openai) {
  const { mode, message, history, image, userId, systemPrompt } = params;
  
  console.log(`🤖 Agent démarré - Mode: ${mode}, User: ${userId || "anonymous"}, Image: ${!!image}`);
  
  try {
    const userText = (message || "").toString().trim();
    const hasImage = !!image;
    
    // Validation basique
    if (!userText && !hasImage) {
      throw new Error("Message ou image requis.");
    }
    
    // Récupérer l'état utilisateur
    const userState = getUserState(userId);
    
    // Détecter les demandes d'actions internes
    const actionRequest = detectActionRequest(userText);
    if (actionRequest) {
      const actionResult = executeAction(actionRequest, userId);
      if (actionResult) {
        return {
          result: actionResult,
          meta: { action: actionRequest.action, userId },
        };
      }
    }
    
    // Déterminer la policy
    const policy = determinePolicy(mode, hasImage, userText);
    
    // Prétraiter le texte
    const processedText = preprocessUserText(userText);
    
    // Construire l'input
    const input = buildAgentInput({
      processedText: processedText || "Réponds.",
      image: hasImage ? image : null,
      history,
      systemPrompt,
      userState,
    });
    
    // Configuration du modèle
    const model = process.env.OPENAI_MODEL_MENTORLEARN || "gpt-4o";
    const effort = process.env.OPENAI_REASONING_EFFORT || "low";
    const enableWebSearch = (process.env.MENTORLEARN_ENABLE_WEB_SEARCH || "false").toLowerCase() === "true";
    
    const tools = [];
    if (enableWebSearch) tools.push({ type: "web_search" });
    
    // Appel à l'API OpenAI Responses
    console.log(`🔄 Appel OpenAI - Modèle: ${model}, Policy: ${policy}`);
    
    const response = await openai.responses.create({
      model,
      instructions: systemPrompt,
      input,
      reasoning: { effort },
      max_output_tokens: 1200,
      tools: tools.length ? tools : undefined,
    });
    
    const text = (response && response.output_text ? response.output_text : "").trim() || "Aucune réponse.";
    
    console.log(`✅ Agent réponse OK - ${text.length} chars`);
    
    // Extraire le topic pour la mémoire (simple heuristique)
    const topic = extractTopic(processedText, text);
    
    // Mettre à jour l'état utilisateur
    if (userId && mode === "prof") {
      updateUserState(userId, {
        lastTopic: topic || userState?.lastTopic || "Notion en cours",
        lastStep: "Cours en cours",
        lastMode: mode,
        lastSummary: text.slice(0, 100),
      });
    }
    
    return {
      result: text,
      meta: {
        policy,
        userId,
        topic,
        model,
      },
    };
    
  } catch (err) {
    console.error("❌ Erreur Agent MentorLearn:", err.message);
    
    // Erreur propre pour le client
    if (err.message?.includes("rate_limit")) {
      return {
        result: "⏳ Trop de demandes. Réessaie dans 10 secondes.",
        meta: { error: "rate_limit" },
      };
    }
    
    if (err.message?.includes("timeout")) {
      return {
        result: "⏳ Le serveur met trop de temps à répondre. Réessaie dans quelques instants.",
        meta: { error: "timeout" },
      };
    }
    
    return {
      result: "❌ Une erreur est survenue. Réessaie dans 10 secondes.",
      meta: { error: err.message },
    };
  }
}

/**
 * Extrait le topic principal du message (simple heuristique)
 */
function extractTopic(userText, aiResponse) {
  const lower = userText.toLowerCase();
  
  // Patterns simples
  const patterns = [
    /(?:comprendre|apprendre|expliquer|explique)\\s+(?:le|la|les|l')?\\s*([\\w\\s]{3,30})/i,
    /(?:c'est quoi|qu'est-ce que)\\s+(?:le|la|les|l')?\\s*([\\w\\s]{3,30})/i,
    /(?:comment)\\s+(?:fonctionne|marche|ça marche)\\s+([\\w\\s]{3,30})/i,
  ];
  
  for (const pattern of patterns) {
    const match = userText.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 50);
    }
  }
  
  // Fallback: premiers mots significatifs
  const words = userText.split(" ").filter((w) => w.length > 3).slice(0, 3);
  if (words.length > 0) {
    return words.join(" ").slice(0, 50);
  }
  
  return "Notion en cours";
}

module.exports = {
  runMentorLearnAgent,
};

