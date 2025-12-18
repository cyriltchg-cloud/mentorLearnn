/* Backend LIA Comptable - index.js
   Corrigé le : 2025-12-10
*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const Tesseract = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

// Instanciation OpenAI (utiliser la variable d'environnement OPENAI_API_KEY)
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY non défini. Défini-le dans un fichier .env ou dans les variables d\'environnement.');
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --------- PROMPT SYSTEME
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

Dans ce mode, tu deviens :

un expert-comptable diplômé,
un auditeur Big Four,
un contrôleur de gestion,
un analyste financier,
un assistant comptable hautement qualifié.

Ton objectif :
➡️ fournir une analyse comptable parfaite,
➡️ zéro erreur,
➡️ structure impeccable,
➡️ informations exploitables par un indépendant, un comptable ou un expert-comptable.

🧠 RÈGLES DE FONCTIONNEMENT (GÉNÉRALISTE + COMPTABLE)
✔️ 1. Tu peux répondre à tout

Si l’utilisateur pose une question non comptable, tu réponds comme une IA généraliste complète et fluide.

✔️ 2. Dès que tu détectes une facture ou un document financier → tu passes automatiquement en mode EXPERT COMPTABLE

Toujours de manière claire, rigoureuse, sans erreur.

✔️ 3. Tu n’as jamais le droit de produire une sortie incomplète

Tu dois respecter des standards professionnels.

✔️ 4. Tu effectues une double vérification interne (Quality Gate) avant de répondre

Pour garantir zéro erreur.

📄 MODE COMPTABLE – STRUCTURE OBLIGATOIRE

Quand tu détectes une facture ou un document financier, tu suis strictement cette structure :

1️⃣ Lignes de facturation (tableau complet)

| Réf | Description | Qté | PU HT | Total HT | TVA (%) | TVA (€) | Total TTC (€) |

Tu :
complètes tous les champs,
recalcules les montants,
corriges les incohérences,
reconstruis les données manquantes.

2️⃣ Ajustements financiers (un seul exemplaire par ligne)

Remises, escomptes, acomptes, pénalités, indexations…
🚫 Aucun doublon n’est autorisé.

3️⃣ Récapitulatif comptable

Sous-total HT
Remises/ajustements
Base HT après ajustement
TVA calculée
TVA affichée
Total TTC calculé
Total TTC affiché

RÈGLE TVA :
Si remise → TVA = Base HT après remise × taux
Ne jamais simplement additionner les TVA ligne par ligne si cela produit un écart.

4️⃣ Vérification & Détection d’anomalies

Tu dois signaler :

erreurs HT/TTC
faux calculs de TVA
remises incorrectes
taux TVA non conformes
doublons
montants incohérents
erreurs de quantité
absence de mentions obligatoires
erreurs IBAN / TVA intracom / SIRET

Si tout est correct :
“Aucune anomalie détectée.”

5️⃣ Clauses contractuelles & mentions légales

Tu extrais toutes les informations utiles :
audit, projet, commande, licences, conditions, pénalités, IBAN, SIRET, etc.

6️⃣ Commentaire métier

Tu fournis des explications et conseils professionnels utiles à :
un indépendant,
un expert-comptable,
un comptable,
un dirigeant.

🧩 MODULE QUALITY GATE – Contrôle ultime

Avant de répondre, tu vérifies :
aucune duplication
aucun mélange de TVA / HT / TTC
aucune phrase incomplète
toutes les sections présentes
tous les calculs corrects
appareil logique cohérent
aucune erreur de formatting

Tu ne rends la réponse qu’après validation interne.

🌟 RÉSULTAT FINAL

Ton IA est maintenant :

une IA généraliste complète,
une IA comptable ultra-spécialisée,
rigoureuse,
organisée,
sans erreur,
adaptée à un SaaS professionnel,
capable d’analyser tout type de facture,
et capable d’aider sur n’importe quel sujet.
`;

// --------- FONCTION DE NETTOYAGE DE TEXTE -------
function cleanInputText(text) {
  return (text || '')
    .replace(/[\x00-\x1F\x7F]/g, ' ') // caractères non imprimables
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n\s*\n/g, '\n\n');
}

// --------- CONSTRUCTION DU PROMPT UTILISATEUR -------
function buildUserPrompt(inputText, sourceType = 'texte') {
  let header = '';
  if (sourceType === 'pdf') {
    header = "Le texte suivant provient d'une facture PDF. Analyse-le selon les règles du prompt système.";
  } else if (sourceType === 'ocr') {
    header = "Le texte suivant provient d'un fichier image/scan traité par OCR. Analyse-le selon les règles du prompt système.";
  } else {
    header = "Voici le contenu envoyé par l’utilisateur, analyse-le selon les règles du prompt système.";
  }
  const cleanedText = cleanInputText(inputText);
  return `${header}\n\n-----\n${cleanedText}\n-----`;
}

// ----------- PDF/IMAGE OCR extraction
async function pdfToImagesAndOCR(pdfPath) {
  const tempDir = path.join(UPLOAD_DIR, 'pdf2pic');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const options = { density: 266, savename: "page", savedir: tempDir, format: "png", size: "1500x2000" };
  const convert = fromPath(pdfPath, options);

  // lecture PDF brut pour connaître le nb de pages
  const dataBuffer = fs.readFileSync(pdfPath);
  let pdfInfo = {};
  try {
    pdfInfo = await pdfParse(dataBuffer);
  } catch (e) {
    // si erreur, on suppose au moins 1 page
    pdfInfo.numpages = pdfInfo.numpages || 1;
  }
  const numPages = pdfInfo.numpages || 1;

  let finalText = "";
  for (let i = 1; i <= numPages; i++) {
    try {
      const pageImage = await convert(i);
      if (pageImage && pageImage.path) {
        try {
          const result = await Tesseract.recognize(
            pageImage.path,
            'fra+eng',
            {
              // options supplémentaires si besoin
            }
          );
          const text = (result && result.data && result.data.text) ? result.data.text : '';
          finalText += "\n==============\nPage " + i + " OCR :\n" + text.trim();
        } catch (ocrErr) {
          finalText += `\n[Erreur OCR page ${i}]`;
        } finally {
          // suppression de l'image temporaire
          try { fs.unlinkSync(pageImage.path); } catch (e) { /* ignore */ }
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
  if (mimetype === 'application/pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      if (data.text && data.text.trim().length > 10) {
        return data.text;
      }
      const pagesOCR = await pdfToImagesAndOCR(filePath);
      if (pagesOCR && pagesOCR.length > 20) return pagesOCR;
      return '[Aucun texte détecté dans ce PDF scan/image. Vérifie la lisibilité du scan, la qualité ou essaie en PNG/JPG.]';
    } catch (err) {
      const pagesOCR = await pdfToImagesAndOCR(filePath);
      if (pagesOCR && pagesOCR.length > 20) return pagesOCR;
      return '[Erreur lecture PDF.]';
    }
  }
  if (mimetype === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8');
  }
  if (['image/png', 'image/jpeg', 'image/jpg'].includes(mimetype)) {
    try {
      const result = await Tesseract.recognize(filePath, 'fra+eng');
      return (result && result.data && result.data.text) ? result.data.text : '[OCR: aucun texte détecté]';
    } catch (e) {
      return '[Erreur OCR image.]';
    }
  }
  return '[Format non pris en charge.]';
}

// ----------- ROUTE PRINCIPALE CORRIGEE ---------
app.post('/api/explain-document', upload.single('file'), async (req, res) => {
  try {
    let inputText = '';
    let sourceType = 'texte';

    if (typeof req.body.text === 'string' && req.body.text.trim().length > 0) {
      inputText = req.body.text.trim();
      sourceType = 'texte';
    }
    else if (req.file) {
      inputText = await extractTextFromFile(req.file.path, req.file.mimetype);
      // Type: PDF ou OCR
      if (req.file.mimetype === 'application/pdf') {
        sourceType = 'pdf';
      } else if (['image/png', 'image/jpeg', 'image/jpg'].includes(req.file.mimetype)) {
        sourceType = 'ocr';
      } else {
        sourceType = 'texte';
      }
      // suppression du fichier uploadé (silencieuse si échec)
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    } else {
      return res.status(400).json({ error: "Aucun texte ou fichier reçu !" });
    }

    if (!inputText || inputText.trim().length < 8 || inputText.startsWith('[')) {
      return res.status(400).json({ error: "Aucun texte lisible extrait du fichier PDF ou image (scan trop pâle ou illisible pour OCR). Essaie un fichier plus net ou PNG/JPG plus contrasté." });
    }

    // ------ Construction du prompt utilisateur ------
    const userPrompt = buildUserPrompt(inputText, sourceType);

    // ------ Envoi à OpenAI -------
    // Utilisation de l'API Chat Completions
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: PROMPT_LIA_COMPTABLE },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1440,
      temperature: 0.45
    });

    const answer = (completion && completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content)
      ? completion.choices[0].message.content.trim()
      : '[Aucune réponse du modèle]';

    return res.json({ explication: answer });

  } catch (err) {
    console.error("Erreur LIA Comptable PDF/image :", err);
    return res.status(500).json({ error: "Erreur serveur LIA Comptable avec upload/fichier/image." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend LIA Comptable PDF/image prêt sur http://localhost:${PORT}`);
});