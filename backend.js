/* Backend LIA Comptable + MentorLearn
   Mis à jour le : 2026-01-01
   ✅ MentorLearn basculé sur OpenAI Responses API (agentic loop)
*/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");
const Tesseract = require("tesseract.js");
const { fromPath } = require("pdf2pic");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

// Stripe - only initialize if key exists
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_YOUR_SECRET_KEY_HERE") {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const app = express();
const PORT = process.env.PORT || 5001;

/**
 * ⚠️ IMPORTANT: Stripe webhook a besoin du raw body.
 * On exclut /api/stripe/webhook du express.json global.
 */
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") return next();
  express.json({ limit: "50mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: ["http://localhost:5000", "http://localhost:5001", "http://localhost:5002", "http://localhost:3000"],
    credentials: true,
  })
);

// ===== Uploads =====
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// ======================
// OpenAI
// ======================
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY non défini. Défini-le dans .env puis redémarre.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ======================
// Anthropic (MentorLearn) - (gardé si tu l’utilises ailleurs)
// ======================
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠️  ANTHROPIC_API_KEY non défini. Défini-le dans .env si nécessaire.");
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ======================
// Agent MentorLearn
// ======================
const { runMentorLearnAgent } = require("./agent/mentorlearnAgent");

// ======================
// ROUTES DEBUG
// ======================
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    mentorLearnModel: process.env.OPENAI_MODEL_MENTORLEARN || "gpt-5.2",
    webSearchEnabled: (process.env.MENTORLEARN_ENABLE_WEB_SEARCH || "false").toLowerCase() === "true",
  });
});

app.get("/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).map((x) => x.toUpperCase());
      routes.push({ path: m.route.path, methods });
    }
  });
  res.json({ routes });
});

// ======================
// MentorLearn prompts
// ======================

const SYSTEM_PROF_MODE = require("./prompts/systemProfMode");

const SYSTEM_PROMPT_MODE = `Tu es MentorLearn en MODE PROMPT.

TU ES UN CLARIFICATEUR D'INTENTION.
TON OBJECTIF : Transformer une intention floue en prompt clair, stable et réutilisable.

RÈGLES ABSOLUES :

1) PAS DE PROMPT IMMÉDIAT
- Tu ne génères JAMAIS un prompt dès la première phrase
- Tu clarifies D'ABORD l'intention réelle de l'utilisateur

2) CLARIFICATION STRUCTURÉE
- Tu poses uniquement des questions utiles
- Tu identifies ce qui est implicite, vague ou incohérent
- Tu élimines toute ambiguïté

3) REFORMULATION DE L'INTENTION
- Tu reformules l'intention en une phrase claire
- Tu demandes une validation implicite avant de continuer

4) CONSTRUCTION DU PROMPT
Une fois l'intention claire, tu construis le prompt avec :

━━━ CONTEXTE
[Situation, domaine, besoin]

━━━ OBJECTIF
[Ce qui doit être accompli précisément]

━━━ CONTRAINTES
[Limites, format, ton, longueur]

━━━ RÉSULTAT ATTENDU
[Format de sortie, structure]

━━━ RÔLE ET TON DE L'IA
[Comment l'IA doit se comporter]

5) QUALITÉ DU PROMPT
- Le prompt doit être clair, stable et réutilisable
- Il doit produire des résultats cohérents
- Pas de blabla inutile

RÈGLE COMMUNE : Cherche toujours la clarté avant la quantité.`;

// Mode Mission supprimé - Tout est intégré dans le Mode Prof
const SYSTEM_MENTORLEARN = SYSTEM_PROF_MODE;

// Détection basique de demande de triche
function looksLikeCheatingRequest(text) {
  const t = (text || "").toLowerCase();
  const patterns = [
    "réponds à ma place",
    "donne les réponses",
    "corrigé du contrôle",
    "corrige l'examen",
    "sujet + correction",
    "dm corrigé",
    "triche",
    "antisèche",
    "anti seche",
    "anti-sèche",
    "réponse exacte",
    "sans expliquer",
    "pendant l'examen",
    "pendant le partiel",
    "pendant le contrôle",
    "j'ai un examen",
  ];
  return patterns.some((p) => t.includes(p));
}

// ================================
// ROUTE MENTORLEARN (AGENT)
// ================================
app.post("/api/mentorlearn", async (req, res) => {
  try {
    const { mode, message, history, image, userId } = req.body || {};
    const userText = (message || "").toString().trim();
    const hasImage = !!image;

    // Validation basique
    if (!userText && !hasImage) {
      return res.status(400).json({ error: "Message ou image requis." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY manquante. Mets la clé dans .env puis redémarre node backend.js",
      });
    }

    // Anti-triche: uniquement si pas d'image (les images sont des exercices légitimes)
    if (!hasImage && looksLikeCheatingRequest(userText)) {
      return res.json({
        result:
          "Je ne peux pas t'aider à tricher ou donner des réponses d'examen. En revanche, je peux t'expliquer le cours clairement et te faire t'entraîner avec des exercices corrigés.\n\nDis-moi le chapitre/thème, et on le travaille proprement.",
        needsClarification: false,
        refusedCheating: true,
      });
    }

    // Sélection du system prompt
    const selectedMode = mode === "prof" ? "prof" : "prompt";
    const systemPrompt = selectedMode === "prompt" ? SYSTEM_PROMPT_MODE : SYSTEM_PROF_MODE;

    // Appel à l'agent
    const agentResult = await runMentorLearnAgent(
      {
        mode: selectedMode,
        message: userText,
        history,
        image: hasImage ? image : null,
        userId: userId || null,
        systemPrompt,
      },
      openai
    );

    return res.json({ result: agentResult.result, meta: agentResult.meta, needsClarification: false });
  } catch (err) {
    console.error("❌ Erreur /api/mentorlearn:", err);
    return res.status(500).json({ error: "Erreur serveur MentorLearn." });
  }
});

// ======================
// ✅ PROMPT COMPTA ENTIER (inchangé)
// ======================
const PROMPT_LIA_COMPTABLE = `
Tu es Mentor IA, une intelligence artificielle généraliste avancée, capable de répondre à n’importe quelle question comme ChatGPT :
explications,
rédaction,
aide informatique,
traduction,
éducation,
analyse,
conversation,
conseil professionnel,
créativité,
support technique,
tout autre sujet non comptable.

Tu peux parler naturellement, expliquer clairement, et aider l’utilisateur sur tous les sujets du quotidien ou professionnels, sans restriction.

Mais tu as aussi une seconde compétence, encore plus puissante :

🧠 MODE SPÉCIALISÉ : EXPERT-COMPTABLE / AUDITEUR / IA FINANCIÈRE

Lorsque le document fourni par l’utilisateur contient une facture, un devis, un document financier, un reçu, une note de frais, une analyse comptable ou un texte lié à la comptabilité, tu actives automatiquement ton Mode Comptable Expert.

[...] (inchangé)
`;

// --------- FONCTION DE NETTOYAGE DE TEXTE -------
function cleanInputText(text) {
  return (text || "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n\s*\n/g, "\n\n");
}

// --------- CONSTRUCTION DU PROMPT UTILISATEUR -------
function buildUserPrompt(inputText, sourceType = "texte") {
  let header = "";
  if (sourceType === "pdf") {
    header = "Le texte suivant provient d'une facture PDF. Analyse-le selon les règles du prompt système.";
  } else if (sourceType === "ocr") {
    header = "Le texte suivant provient d'un fichier image/scan traité par OCR. Analyse-le selon les règles du prompt système.";
  } else {
    header = "Voici le contenu envoyé par l’utilisateur, analyse-le selon les règles du prompt système.";
  }
  const cleanedText = cleanInputText(inputText);
  return `${header}\n\n-----\n${cleanedText}\n-----`;
}

// ----------- PDF/IMAGE OCR extraction
async function pdfToImagesAndOCR(pdfPath) {
  const tempDir = path.join(UPLOAD_DIR, "pdf2pic");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const options = {
    density: 266,
    savename: "page",
    savedir: tempDir,
    format: "png",
    size: "1500x2000",
  };
  const convert = fromPath(pdfPath, options);

  const dataBuffer = fs.readFileSync(pdfPath);
  let pdfInfo = {};
  try {
    pdfInfo = await pdfParse(dataBuffer);
  } catch (e) {
    pdfInfo.numpages = pdfInfo.numpages || 1;
  }
  const numPages = pdfInfo.numpages || 1;

  let finalText = "";
  for (let i = 1; i <= numPages; i++) {
    try {
      const pageImage = await convert(i);
      if (pageImage && pageImage.path) {
        try {
          const result = await Tesseract.recognize(pageImage.path, "fra+eng");
          const text = result?.data?.text ? result.data.text : "";
          finalText += "\n==============\nPage " + i + " OCR :\n" + text.trim();
        } catch (ocrErr) {
          finalText += `\n[Erreur OCR page ${i}]`;
        } finally {
          try {
            fs.unlinkSync(pageImage.path);
          } catch (e) {}
        }
      } else {
        finalText += `\n[Pas d'image générée pour la page ${i}]`;
      }
    } catch (err) {
      finalText += `\n[Erreur conversion page ${i}]`;
    }
  }
  return finalText.trim();
}

async function extractTextFromFile(filePath, mimetype) {
  if (mimetype === "application/pdf") {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      if (data.text && data.text.trim().length > 10) {
        return data.text;
      }
      const pagesOCR = await pdfToImagesAndOCR(filePath);
      if (pagesOCR && pagesOCR.length > 20) return pagesOCR;
      return "[Aucun texte détecté dans ce PDF scan/image. Vérifie la lisibilité du scan.]";
    } catch (err) {
      const pagesOCR = await pdfToImagesAndOCR(filePath);
      if (pagesOCR && pagesOCR.length > 20) return pagesOCR;
      return "[Erreur lecture PDF.]";
    }
  }
  if (mimetype === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  }
  if (["image/png", "image/jpeg", "image/jpg"].includes(mimetype)) {
    try {
      const result = await Tesseract.recognize(filePath, "fra+eng");
      return result?.data?.text ? result.data.text : "[OCR: aucun texte détecté]";
    } catch (e) {
      return "[Erreur OCR image.]";
    }
  }
  return "[Format non pris en charge.]";
}

// ================================
// ✅ AGENT HELPER (MentorLearn)
// ================================
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

function buildMentorLearnInput({ processedText, image, history }) {
  const input = [];

  const h = normalizeHistory(history);

  // Historique (sauf le dernier message si ton front le duplique déjà)
  // Ici: on garde tout, mais tu peux changer facilement si nécessaire.
  for (const msg of h) {
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
    const textToSend = processedText || "Analyse cette image et réponds.";
    input.push({
      role: "user",
      content: [
        { type: "input_text", text: textToSend },
        { type: "input_image", image_url: image },
      ],
    });
  } else {
    input.push({ role: "user", content: processedText });
  }

  return input;
}

// ================================
// 1) Route MentorLearn (AGENT = Responses API)
// ================================
app.post("/api/mentorlearn", async (req, res) => {
  try {
    const { mode, message, history, image } = req.body || {};
    const userText = (message || "").toString().trim();
    const hasImage = !!image;

    if (!userText && !hasImage) {
      return res.status(400).json({ error: "Message ou image requis." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY manquante. Mets la clé dans .env puis redémarre node backend.js",
      });
    }

    // Anti-triche: uniquement si pas d'image (comme tu avais déjà)
    if (!hasImage && looksLikeCheatingRequest(userText)) {
      return res.json({
        result:
          "Je ne peux pas t'aider à tricher ou donner des réponses d'examen. En revanche, je peux t'expliquer le cours clairement et te faire t'entraîner avec des exercices corrigés.\n\nDis-moi le chapitre/thème, et on le travaille proprement.",
        needsClarification: false,
        refusedCheating: true,
      });
    }

    // 2 modes uniquement
    const selectedMode = mode === "prof" ? "prof" : "prompt";
    const systemPrompt = selectedMode === "prompt" ? SYSTEM_PROMPT_MODE : SYSTEM_PROF_MODE;

    // Prétraitement intentions simples (tu avais déjà)
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

    const model = process.env.OPENAI_MODEL_MENTORLEARN || "gpt-5.2";
    const effort = process.env.OPENAI_REASONING_EFFORT || "low";
    const enableWebSearch = (process.env.MENTORLEARN_ENABLE_WEB_SEARCH || "false").toLowerCase() === "true";

    const input = buildMentorLearnInput({
      processedText: processedText || "Réponds.",
      image: hasImage ? image : null,
      history,
    });

    const tools = [];
    if (enableWebSearch) tools.push({ type: "web_search" });

    const response = await openai.responses.create({
      model,
      instructions: systemPrompt,
      input,
      reasoning: { effort }, // gpt-5 only :contentReference[oaicite:1]{index=1}
      max_output_tokens: 1200,
      temperature: 0.3,
      tools: tools.length ? tools : undefined,
      // include: ["web_search_call.action.sources"], // si tu veux récupérer les sources quand web_search est ON
    });

    const text = (response && response.output_text ? response.output_text : "").trim() || "Aucune réponse.";
    return res.json({ result: text, needsClarification: false });
  } catch (err) {
    console.error("Erreur MentorLearn:", err);
    return res.status(500).json({ error: "Erreur serveur MentorLearn." });
  }
});

// =========================================
// 2) Route Compta legacy (OpenAI + OCR/PDF) - inchangée
// =========================================
app.post("/api/explain-document", upload.single("file"), async (req, res) => {
  try {
    let inputText = "";
    let sourceType = "texte";

    if (typeof req.body.text === "string" && req.body.text.trim().length > 0) {
      inputText = req.body.text.trim();
      sourceType = "texte";
    } else if (req.file) {
      inputText = await extractTextFromFile(req.file.path, req.file.mimetype);

      if (req.file.mimetype === "application/pdf") sourceType = "pdf";
      else if (["image/png", "image/jpeg", "image/jpg"].includes(req.file.mimetype)) sourceType = "ocr";
      else sourceType = "texte";

      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    } else {
      return res.status(400).json({ error: "Aucun texte ou fichier reçu !" });
    }

    if (!inputText || inputText.trim().length < 8 || inputText.startsWith("[")) {
      return res.status(400).json({
        error:
          "Aucun texte lisible extrait du fichier PDF ou image (scan trop pâle ou illisible pour OCR). Essaie un fichier plus net ou PNG/JPG plus contrasté.",
      });
    }

    const userPrompt = buildUserPrompt(inputText, sourceType);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: PROMPT_LIA_COMPTABLE },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1440,
      temperature: 0.45,
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim() || "[Aucune réponse du modèle]";
    return res.json({ explication: answer });
  } catch (err) {
    console.error("Erreur LIA Comptable PDF/image :", err);
    return res.status(500).json({ error: "Erreur serveur LIA Comptable avec upload/fichier/image." });
  }
});

// ======================
// STRIPE ENDPOINTS
// ======================

// Create Checkout Session
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe non configuré. Configure STRIPE_SECRET_KEY dans .env" });
    }

    const { userId, email } = req.body;

    if (!email) return res.status(400).json({ error: "Email requis" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
      success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`,
      customer_email: email,
      metadata: { userId: userId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Checkout:", err);
    res.status(500).json({ error: "Erreur création session Stripe" });
  }
});

// Create Customer Portal Session
app.post("/api/stripe/create-portal-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe non configuré. Configure STRIPE_SECRET_KEY dans .env" });
    }

    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId requis" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Portal:", err);
    res.status(500).json({ error: "Erreur création portal Stripe" });
  }
});

// Stripe Webhook (raw)
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe non configuré" });

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const email = session.customer_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        console.log(`✅ Checkout completed: ${email}, customerId: ${customerId}, sub: ${subscriptionId}`);
        console.log(`User ${userId} upgraded to Pro`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log(`✅ Subscription ${subscription.id} status: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object;
        console.log(`❌ Subscription ${deletedSub.id} cancelled`);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Get current user status (pour vérifier le plan côté serveur)
app.get("/api/me", (req, res) => {
  res.json({ plan: "free", proActive: false });
});

app.listen(PORT, () => {
  console.log(`Backend prêt sur http://localhost:${PORT}`);
  console.log(`✅ Health:  http://localhost:${PORT}/health`);
  console.log(`✅ Routes:  http://localhost:${PORT}/routes`);
});
