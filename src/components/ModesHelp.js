import React, { useState, useEffect, useRef } from 'react';
import './ModesHelp.css';

const ModesHelp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="modes-help-wrapper">
      <button
        className="modes-help-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Aide sur les modes"
        title="En savoir plus sur les modes"
      >
        ⓘ
      </button>

      {isOpen && (
        <div className="modes-help-panel" ref={panelRef}>
          <button
            className="modes-help-close"
            onClick={() => setIsOpen(false)}
            aria-label="Fermer"
          >
            ✕
          </button>

          <h3 className="modes-help-title">2 modes pour t'aider</h3>

          <div className="modes-help-content">
            <div className="mode-help-item">
              <div className="mode-help-icon">🎓</div>
              <div className="mode-help-text">
                <strong>Mode Prof</strong>
                <p>Ton prof particulier en pilotage automatique.</p>
                <p>Tu dis ce que tu veux apprendre, je m'occupe du reste : explication, exercices, progression. Tu n'as rien à organiser.</p>
                <p className="mode-help-ideal">Idéal pour apprendre n'importe quel sujet de A à Z.</p>
              </div>
            </div>

            <div className="mode-help-item">
              <div className="mode-help-icon">✍️</div>
              <div className="mode-help-text">
                <strong>Mode Prompt</strong>
                <p>Pour transformer une idée floue en prompt clair et efficace.</p>
                <p>Je t'aide à formuler exactement ce que tu veux demander à une IA.</p>
                <p className="mode-help-ideal">Idéal pour créer des prompts précis et réutilisables.</p>
              </div>
            </div>
          </div>

          <p className="modes-help-footer">Le Mode Prof pilote automatiquement ta progression.</p>
        </div>
      )}
    </div>
  );
};

export default ModesHelp;


