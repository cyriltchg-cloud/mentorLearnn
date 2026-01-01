# 🧠 MentorLearn

**De la confusion à la clarté**

MentorLearn est un SaaS pédagogique qui transforme la confusion en clarté grâce à l'IA.

---

## 🎯 Concept

MentorLearn propose **2 modes distincts** pour accompagner l'apprentissage et structurer la pensée :

### 🧩 Mode Prompt
Transforme une intention floue en prompt parfait, prêt à utiliser.

**Idéal pour :**
- Structurer une idée confuse
- Créer des prompts professionnels
- Gagner du temps dans la formulation

### 🎓 Mode Prof
Explique n'importe quel sujet de façon claire, adaptée et pédagogique.

**Idéal pour :**
- Comprendre un cours difficile
- Réviser un concept
- Apprendre à son rythme

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- Clés API : `ANTHROPIC_API_KEY` et `OPENAI_API_KEY`

### Installation

```bash
npm install
```

### Configuration

Créer un fichier `.env` à la racine :

```env
ANTHROPIC_API_KEY=votre_clé_anthropic
OPENAI_API_KEY=votre_clé_openai
PORT=5000
```

### Lancement

**Backend** (Terminal 1) :
```bash
node backend.js
```

**Frontend** (Terminal 2) :
```bash
npm start
```

L'application s'ouvre sur `http://localhost:3000`

---

## 🎨 Stack Technique

- **Frontend** : React 19
- **Backend** : Node.js + Express
- **IA** : Claude 3.5 Sonnet (Anthropic)
- **Design** : CSS moderne, épuré, accessible

---

## 🧱 Architecture

```
mentorLearn/
├── backend.js           # API Express + logique IA
├── src/
│   ├── App.js          # Interface React
│   ├── App.css         # Design system
│   └── index.js        # Point d'entrée React
├── .env                # Variables d'environnement
└── package.json        # Dépendances
```

---

## 📖 Utilisation

1. **Choisis ton mode** : Prompt ou Prof
2. **Écris ta demande** : intention floue ou question
3. **Reçois une réponse claire** : prompt structuré ou explication pédagogique
4. **Copie ou recommence** : selon tes besoins

---

## 🛡️ Éthique

MentorLearn aide à **comprendre**, pas à tricher.

Les demandes visant à contourner l'apprentissage (examens, devoirs) sont refusées avec proposition d'explication pédagogique.

---

## 📝 Licence

Projet privé © 2025 MentorLearn

---

**Construit avec ❤️ pour rendre l'apprentissage plus clair et accessible**
