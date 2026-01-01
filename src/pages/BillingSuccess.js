import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Billing.css';

const BillingSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Recharger les données utilisateur
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }, []);

  return (
    <div className="billing-page">
      <div className="billing-card">
        <div className="billing-icon success">✓</div>
        <h1>Bienvenue dans MentorLearn Pro !</h1>
        <p>Ton abonnement est activé. Tu as maintenant accès illimité.</p>
        <p className="billing-redirect">Redirection automatique...</p>
      </div>
    </div>
  );
};

export default BillingSuccess;



