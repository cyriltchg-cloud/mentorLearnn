import React from 'react';
import './ValidationButtons.css';

const ValidationButtons = ({ onUnderstood, onExplainDifferently, onContinue }) => {
  return (
    <div className="validation-buttons">
      <button 
        className="validation-btn continue"
        onClick={onContinue}
        title="Continuer à l'étape suivante"
      >
        ➡️ Continuer
      </button>
      <button 
        className="validation-btn explain-differently"
        onClick={onExplainDifferently}
        title="Réexpliquer autrement"
      >
        🔁 Explique autrement
      </button>
      <button 
        className="validation-btn understood"
        onClick={onUnderstood}
        title="Terminer - j'ai compris"
      >
        ✅ J'ai compris
      </button>
    </div>
  );
};

export default ValidationButtons;

