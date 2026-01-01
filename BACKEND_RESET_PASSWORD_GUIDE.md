# GUIDE D'IMPLÉMENTATION - MOT DE PASSE OUBLIÉ (BACKEND)

## ⚠️ IMPORTANT
Le frontend est prêt. Il manque uniquement l'implémentation backend pour :
1. Envoyer l'email de réinitialisation
2. Valider le token
3. Mettre à jour le mot de passe

---

## ÉTAPES BACKEND À IMPLÉMENTER

### 1. Créer l'endpoint `/api/forgot-password`

**Fichier :** `backend.js`

```javascript
// Endpoint: Demande de réinitialisation
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    // TODO: Vérifier si l'utilisateur existe (DB)
    // const user = await User.findOne({ email });
    
    // Générer un token unique et sécurisé
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes

    // TODO: Stocker le token en DB
    // await User.updateOne(
    //   { email },
    //   { resetToken, resetTokenExpiry }
    // );

    // TODO: Envoyer l'email
    // const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    // await sendEmail({
    //   to: email,
    //   subject: 'Réinitialisation de mot de passe - MentorLearn',
    //   html: `
    //     <p>Tu as demandé à réinitialiser ton mot de passe.</p>
    //     <p>Clique sur ce lien (valide 30 minutes) :</p>
    //     <a href="${resetUrl}">${resetUrl}</a>
    //   `
    // });

    // Message neutre pour la sécurité
    res.json({ 
      message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." 
    });

  } catch (err) {
    console.error("Erreur forgot-password:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
```

---

### 2. Créer l'endpoint `/api/reset-password`

```javascript
// Endpoint: Réinitialisation du mot de passe
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token et mot de passe requis" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });
    }

    // TODO: Vérifier le token en DB
    // const user = await User.findOne({
    //   resetToken: token,
    //   resetTokenExpiry: { $gt: Date.now() }
    // });

    // if (!user) {
    //   return res.status(400).json({ error: "Token invalide ou expiré" });
    // }

    // Hasher le nouveau mot de passe
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Mettre à jour le mot de passe et invalider le token
    // await User.updateOne(
    //   { _id: user._id },
    //   {
    //     password: hashedPassword,
    //     resetToken: null,
    //     resetTokenExpiry: null
    //   }
    // );

    res.json({ message: "Mot de passe réinitialisé avec succès" });

  } catch (err) {
    console.error("Erreur reset-password:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
```

---

### 3. Configurer l'envoi d'emails

**Installation :**
```bash
npm install nodemailer
```

**Configuration :**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: '"MentorLearn" <noreply@mentorlearn.com>',
    to,
    subject,
    html
  });
}
```

**Variables `.env` à ajouter :**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=ton-email@gmail.com
SMTP_PASS=ton-mot-de-passe-app
APP_URL=http://localhost:5002
```

---

### 4. Schéma utilisateur (exemple MongoDB)

```javascript
const userSchema = {
  email: String,
  password: String, // hashé avec bcrypt
  name: String,
  resetToken: String,
  resetTokenExpiry: Date,
  // ... autres champs
};
```

---

## SÉCURITÉ (OBLIGATOIRE)

✅ Token à usage unique  
✅ Token expiré après 30 minutes  
✅ Hash du mot de passe avec bcrypt (10 rounds minimum)  
✅ Message neutre si email inexistant  
✅ Invalidation du token après utilisation  
✅ HTTPS obligatoire en production

---

## TESTS À EFFECTUER

1. **Email inexistant** → Message neutre (ne révèle rien)
2. **Email existant** → Email envoyé avec lien
3. **Token expiré** → Erreur "Token invalide ou expiré"
4. **Token déjà utilisé** → Erreur "Token invalide ou expiré"
5. **Token valide** → Mot de passe mis à jour, redirection vers login

---

## RESSOURCES

- **Nodemailer** : https://nodemailer.com/
- **bcrypt** : https://www.npmjs.com/package/bcrypt
- **crypto (Node.js)** : Intégré, pas d'installation nécessaire

