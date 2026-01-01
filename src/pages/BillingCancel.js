import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Billing.css';

const BillingCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="billing-page">
      <div className="billing-card">
        <div className="billing-icon cancel">✕</div>
        <h1>Paiement annulé</h1>
        <p>Aucun souci, tu peux toujours passer Pro plus tard.</p>
        <button className="billing-btn" onClick={() => navigate('/')}>
          Retour à MentorLearn
        </button>
      </div>
    </div>
  );
};

export default BillingCancel;



