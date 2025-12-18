import React, { useState, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api/explain-document';

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const inputFileRef = useRef();

  // Drag & Drop logic
  const [isDropActive, setIsDropActive] = useState(false);

  const handleDrop = e => {
    e.preventDefault();
    setIsDropActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = e => {
    e.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setIsDropActive(false);
  };

  const handleFileChange = e => {
    setFile(e.target.files[0]);
  };

  const handleTextChange = e => setText(e.target.value);

  const handleChooseFile = () => {
    if (inputFileRef.current) inputFileRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (text.trim()) formData.append('text', text);

    try {
      const resp = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await resp.json();
      setResult(data.explication || data.error || "Erreur inconnue.");
    } catch {
      setResult("Erreur réseau ou serveur.");
    }
    setLoading(false);
  };

  return (
    <div className="main-bg">
      <div className="container-mentor">
        <header>
          <h1>Mentor IA Comptabilité</h1>
          <p className="subtitle">
            Analyse intelligente de factures, documents ou textes.<br />
            Déposez votre PDF, photo, ou texte brut pour une analyse comptable ultra-fiable.
          </p>
        </header>
        <form className="mentor-form" onSubmit={handleSubmit} autoComplete="off">
          <div
            className={`dropzone ${isDropActive ? 'dropzone-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleChooseFile}
          >
            <span className="dropzone-icon" role="img" aria-label="doc">🧾</span>
            <span>
              {file
                ? <b>Fichier sélectionné&nbsp;: {file.name}</b>
                : <>Glissez-déposez votre fichier ici<br />ou<br /><button type="button" className="btn-upload" onClick={handleChooseFile}>
                    Importer un fichier
                </button></>
              }
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: 'none' }}
              ref={inputFileRef}
              onChange={handleFileChange}
            />
          </div>
          <label className="mentor-label" htmlFor="text">
            ...ou collez le texte brut de votre facture :
          </label>
          <textarea
            id="text"
            name="text"
            className="mentor-textarea"
            rows={6}
            placeholder="Insérez ici le texte brut à analyser..."
            value={text}
            onChange={handleTextChange}
            autoComplete="off"
          />
          <button
            type="submit"
            className={`mentor-btn ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {loading
              ? <span className="loader-bar"><span className="loader-inner"/></span>
              : <>🔎&nbsp;Envoyer pour analyse</>
            }
          </button>
        </form>
        {result && (
          <div className="mentor-result-card">
            <div className="mentor-result-header">
              <span className="icon-analyse" role="img" aria-label="analyse">📊</span>
              <span className="result-title">Analyse de la facture</span>
            </div>
            <div className="mentor-result">
              {result}
            </div>
          </div>
        )}
        <footer className="mentor-footer">
          © {new Date().getFullYear()} Mentor IA Comptabilité &mdash; Interface premium & ultra-fiable
        </footer>
      </div>
    </div>
  );
}

export default App;