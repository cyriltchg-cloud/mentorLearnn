import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth = ({ onClose }) => {
  const auth = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Nom requis');
        if (password.length < 6) throw new Error('Mot de passe trop court (min 6 caractères)');
      }

      if (mode === 'login') {
        auth.login(email, password);
      } else {
        auth.signup(email, password, name);
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetMessage('');

    try {
      // Simuler un envoi d'email (à implémenter avec un vrai backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Message neutre pour la sécurité (ne révèle pas si l'email existe)
      setResetMessage('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
      setResetEmail('');
    } catch (err) {
      setError('Une erreur est survenue. Réessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (showForgotPassword) {
    return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-close" onClick={onClose}>✕</button>
          
          <div className="auth-header">
            <h2>Mot de passe oublié ?</h2>
            <p className="auth-subtitle">
              Entre ton email pour recevoir un lien de réinitialisation
            </p>
          </div>

          <form className="auth-form" onSubmit={handleForgotPassword}>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="ton@email.com"
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {resetMessage && <div className="auth-success">{resetMessage}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>

          <div className="auth-switch">
            <button onClick={() => { setShowForgotPassword(false); setResetMessage(''); }}>
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>
        
        <div className="auth-header">
          <h2>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
          <p className="auth-subtitle">
            {mode === 'login' 
              ? 'Bon retour sur MentorLearn' 
              : 'Rejoins MentorLearn'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton nom"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
            />
          </div>

          <div className="auth-field">
            <label>Mot de passe</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="forgot-password-link">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="link-button"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <button onClick={() => setMode('signup')}>S'inscrire</button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button onClick={() => setMode('login')}>Se connecter</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

