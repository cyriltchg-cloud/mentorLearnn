import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validations
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (!token) {
        throw new Error('Token invalide ou expiré');
      }

      // Simuler un appel API (à implémenter avec un vrai backend)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Appel API réel
      // await fetch('/api/reset-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, password })
      // });

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-success-icon">✓</div>
          <h2>Mot de passe réinitialisé !</h2>
          <p>Tu vas être redirigé vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-header">
          <h2>Réinitialiser le mot de passe</h2>
          <p>Entre ton nouveau mot de passe</p>
        </div>

        <form className="reset-form" onSubmit={handleSubmit}>
          <div className="reset-field">
            <label>Nouveau mot de passe</label>
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
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <div className="reset-field">
            <label>Confirmer le mot de passe</label>
            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="reset-error">{error}</div>}

          <button type="submit" className="reset-submit" disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <div className="reset-back">
          <button onClick={() => navigate('/')} className="link-button">
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


