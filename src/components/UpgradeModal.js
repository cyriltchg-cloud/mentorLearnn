import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UpgradeModal.css';

const UpgradeModal = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'guest',
          email: user?.email || '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur HTTP:', response.status, errorText);
        alert(`Erreur ${response.status}: ${errorText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erreur: Aucune URL de paiement reçue');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur Stripe:', err);
      alert(`Erreur de connexion: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-close" onClick={onClose}>✕</button>
        
        <div className="upgrade-header">
          <div className="upgrade-icon-large">⚡</div>
          <h2>Passer à MentorLearn Pro</h2>
          <p className="upgrade-subtitle">Apprends sans limites</p>
        </div>

        <div className="upgrade-plans">
          <div className="plan-card plan-free">
            <div className="plan-name">Gratuit</div>
            <div className="plan-price">0€</div>
            <ul className="plan-features">
              <li>✓ 5 questions / jour</li>
              <li>✓ Mode Prof</li>
              <li>✓ Synthèse vocale</li>
              <li>✗ Questions illimitées</li>
              <li>✗ Historique complet</li>
            </ul>
          </div>

          <div className="plan-card plan-pro">
            <div className="plan-badge">Recommandé</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              19,99€<span>/mois</span>
            </div>
            <ul className="plan-features">
              <li>✓ Questions illimitées</li>
              <li>✓ Mode Prof avancé</li>
              <li>✓ Synthèse vocale premium</li>
              <li>✓ Historique complet</li>
              <li>✓ Priorité support</li>
            </ul>
            <button className="btn-subscribe" onClick={handleUpgrade} disabled={loading}>
              {loading ? 'Redirection...' : 'Passer à Pro maintenant'}
            </button>
          </div>
        </div>

        <div className="upgrade-footer">
          <p>💳 Paiement sécurisé · ❌ Annulation à tout moment</p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;

