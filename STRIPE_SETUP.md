# Configuration Stripe pour MentorLearn

## 1. Créer un compte Stripe
- Va sur https://dashboard.stripe.com/register
- Crée ton compte
- Active le **mode test** (switch en haut à droite)

## 2. Récupérer les clés API
1. Va dans **Développeurs > Clés API**
2. Copie :
   - **Clé publiable** (commence par `pk_test_`)
   - **Clé secrète** (commence par `sk_test_`)

## 3. Créer un produit Pro
1. Va dans **Produits > Ajouter un produit**
2. Nom : `MentorLearn Pro`
3. Prix : `19,99 EUR` / mois (récurrent)
4. Clique sur **Enregistrer le produit**
5. Copie l'**ID du prix** (commence par `price_`)

## 4. Créer le webhook
1. Va dans **Développeurs > Webhooks**
2. Clique sur **Ajouter un endpoint**
3. URL du endpoint : `http://localhost:5001/api/stripe/webhook`
4. Sélectionne les événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Clique sur **Ajouter un endpoint**
6. Copie le **Secret de signature** (commence par `whsec_`)

## 5. Mettre à jour le fichier .env
Ouvre `.env` et remplace :
```env
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIABLE
STRIPE_PRICE_PRO=price_VOTRE_ID_PRIX
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK
APP_URL=http://localhost:5002
```

## 6. Redémarrer le backend
```bash
# Arrêter le backend actuel (Ctrl+C dans le terminal)
node backend.js
```

## 7. Tester le paiement
1. Va sur http://localhost:5002
2. Clique sur **Passer à Pro**
3. Utilise une **carte de test Stripe** :
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future
   - CVC : n'importe quel code à 3 chiffres
   - Code postal : n'importe lequel

4. Valide le paiement

## 8. Vérifier le webhook (local)
Pour tester les webhooks en local, utilise **Stripe CLI** :

```bash
# Installer Stripe CLI
# Windows: télécharge depuis https://github.com/stripe/stripe-cli/releases

# Connecter Stripe CLI
stripe login

# Écouter les webhooks
stripe listen --forward-to localhost:5001/api/stripe/webhook
```

Le CLI te donnera un nouveau `whsec_` à mettre dans `.env`.

## 9. Tester le Customer Portal
1. Une fois Pro, clique sur **Gérer mon abonnement** dans la sidebar
2. Tu accèdes au portail Stripe pour gérer/annuler

## 10. Passer en production
Quand tu es prêt :
1. Désactive le **mode test** dans Stripe
2. Récupère les **vraies clés** (commencent par `pk_live_` et `sk_live_`)
3. Met à jour `.env` avec les clés live
4. Change `APP_URL` vers ton domaine de production
5. Mets à jour l'URL du webhook dans Stripe

---

## Commandes rapides

### Redémarrer le backend
```bash
cd C:\Users\cyril\OneDrive\Desktop\mentorLearn
node backend.js
```

### Vérifier les logs Stripe
Les webhooks apparaissent dans la console du backend.

### Carte de test Stripe
- ✅ Succès : `4242 4242 4242 4242`
- ❌ Déclinée : `4000 0000 0000 0002`
- 🔐 3D Secure : `4000 0025 0000 3155`




