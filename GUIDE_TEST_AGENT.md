# GUIDE TEST - AGENT MENTORLEARN AUTOPILOT

## Pré-requis
1. Backend tournant sur `http://localhost:5001`
2. Frontend tournant sur `http://localhost:5002` ou `http://localhost:3000`
3. Rafraîchir le navigateur avec `Ctrl + Shift + R`

---

## TEST 1 : Mode Prof - Texte simple

**Action :**
```
Tape dans le chat : "C'est quoi la blockchain ?"
```

**Résultat attendu :**
- L'IA démarre immédiatement l'explication (pas de questions de clarification)
- Explication progressive en 3-4 lignes
- Continue automatiquement si tu réponds "oui" ou "ok"

---

## TEST 2 : Mode Prof - Continuation automatique

**Action :**
```
Après la première réponse, tape : "ok"
```

**Résultat attendu :**
- L'IA continue automatiquement à l'étape suivante
- Ne demande PAS "As-tu compris ?"
- Ne demande PAS "Veux-tu continuer ?"

---

## TEST 3 : Mode Prof - Photo/Exercice (PRIORITÉ)

**Action :**
```
1. Clique sur le bouton 📎
2. Upload une photo d'exercice (ex: équation mathématique)
3. Envoie sans texte ou avec "résous cet exercice"
```

**Résultat attendu :**
```
La réponse est : [réponse complète et correcte]

Tu veux que je t'explique comment on arrive à ce résultat ?
```

---

## TEST 4 : Mode Prof - Demande d'explication après photo

**Action :**
```
Après la réponse à la photo, tape : "oui explique"
```

**Résultat attendu :**
- L'IA explique étape par étape le raisonnement
- Explication claire et structurée

---

## TEST 5 : Mode Prompt - Clarification d'intention

**Action :**
```
1. Sélectionne "Mode Prompt"
2. Tape : "Je veux un truc pour améliorer ma productivité"
```

**Résultat attendu :**
- L'IA clarifie l'intention
- Reformule en phrase claire
- Propose un prompt structuré (Contexte / Objectif / Contraintes / Résultat / Ton)

---

## TEST 6 : Mémoire / Reprise automatique

**Action :**
```
1. Pose une question en Mode Prof : "Apprends-moi les fractions"
2. Recharge la page (ou ferme et rouvre)
3. Retourne dans la même conversation
```

**Résultat attendu :**
- L'IA dit : "La dernière fois, on avait vu les fractions. On continue."
- Reprend automatiquement là où tu t'es arrêté

---

## TEST 7 : Action interne - Rappel

**Action :**
```
Tape : "Rappelle-moi dans 30 minutes de réviser"
```

**Résultat attendu :**
```
✅ Rappel créé. Je te le rappellerai dans 30 minutes.
```

---

## TEST 8 : Action interne - Rapport de progression

**Action :**
```
Tape : "Génère mon rapport de progression"
```

**Résultat attendu :**
```
✅ Rapport de progression généré. Tu as progressé de 15% cette semaine. Continue comme ça !
```

---

## TEST 9 : Gestion d'erreur

**Action :**
```
(Simule une erreur en éteignant temporairement le backend)
Envoie un message
```

**Résultat attendu :**
```
❌ Une erreur est survenue. Réessaie dans 10 secondes.
```
(Pas d'erreur brute, message propre)

---

## LOGS À VÉRIFIER (Côté serveur)

Dans le terminal backend, tu devrais voir :
```
🤖 Agent démarré - Mode: prof, User: anonymous, Image: false
🔄 Appel OpenAI - Modèle: gpt-4o, Policy: prof
✅ Agent réponse OK - 345 chars
```

---

## POINTS DE VALIDATION CRITIQUE

✅ **Mode Prof :** Pas de questions de clarification  
✅ **Photo/Scan :** Réponse immédiate + proposition d'explication  
✅ **Continuation :** "ok" / "oui" → continue automatiquement  
✅ **Mémoire :** Reprend automatiquement où on s'était arrêté  
✅ **Actions :** Rappel, email, rapport fonctionnent  
✅ **Erreurs :** Messages propres (pas d'erreur brute)  
✅ **Design UI :** Aucun changement visible (interface identique)


