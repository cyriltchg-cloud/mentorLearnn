import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SpeechPlayer.css';

const SpeechPlayer = ({ text, mode = 'prompt' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(mode === 'prof' ? 0.95 : 1.0);
  const [volume, setVolume] = useState(0.98);
  const [progress, setProgress] = useState(0);
  
  const utteranceRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const textChunksRef = useRef([]);
  const currentChunkRef = useRef(0);

  // Nettoyer et optimiser pour lecture experte fluide
  const cleanTextForSpeech = (text) => {
    return text
      // Enlever éléments visuels
      .replace(/[🎭🎯🧠⚙️📦✅🌱📚▶️⏸⏹⏪⏩🔁🔊🎚️]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/#+\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      
      // Optimiser ponctuation pour fluidité
      .replace(/\s*:\s*/g, ' : ')
      .replace(/\s*;\s*/g, ' ; ')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s*\/\s*/g, ' ou ')
      
      // Gérer numérotation et listes
      .replace(/(\d+)\)\s*/g, '$1. ')
      .replace(/•\s*/g, '')
      
      // Normaliser espaces et ponctuation
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*/g, '$1 ')
      .replace(/,\s*/g, ', ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\.{2,}/g, '.')
      
      // Améliorer lisibilité nombres et abréviations
      .replace(/\b(\d+)x\b/g, '$1 fois')
      .replace(/\bex\b/g, 'exemple')
      .replace(/\bc'est-à-dire\b/g, "c'est à dire")
      
      .trim();
  };

  // Découper le texte en groupes de respiration naturels (lecture experte)
  const splitTextIntoChunks = (text) => {
    const cleanedText = cleanTextForSpeech(text);
    
    // Découper par phrases complètes
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    
    const chunks = [];
    let currentChunk = '';
    
    sentences.forEach((sentence) => {
      const trimmedSentence = sentence.trim();
      const combinedLength = currentChunk.length + trimmedSentence.length;
      
      // Grouper 2-3 phrases courtes ensemble pour fluidité
      // Ou garder phrases longues seules
      if (combinedLength < 180 && trimmedSentence.length < 100) {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedSentence;
      }
    });
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(c => c.length > 3);
  };

  // Obtenir la voix française la plus naturelle
  const getFrenchVoice = () => {
    const voices = synthRef.current.getVoices();
    const frenchVoices = voices.filter(v => 
      v.lang.startsWith('fr') || 
      v.lang === 'fr-FR' || 
      v.lang === 'fr_FR'
    );
    
    // Priorité absolue aux voix premium/naturelles
    const naturalKeywords = [
      'Google français',
      'Google French',
      'Premium',
      'Enhanced',
      'Natural',
      'Neural',
      'Wavenet',
      'Amélie',
      'Thomas',
      'Microsoft',
      'Hortense',
      'Julie',
      'Paul'
    ];
    
    for (const keyword of naturalKeywords) {
      const match = frenchVoices.find(v => 
        v.name.includes(keyword) && 
        !v.name.includes('Compact') &&
        v.localService === false // Voix cloud généralement meilleures
      );
      if (match) return match;
    }
    
    // Sinon prendre voix locale la plus récente
    const localFrench = frenchVoices.filter(v => v.localService);
    if (localFrench.length > 0) return localFrench[localFrench.length - 1];
    
    return frenchVoices[0] || voices[0];
  };

  // Arrêter proprement
  const stopSpeech = () => {
    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    currentChunkRef.current = 0;
  };

  // Lecture experte avec prosodie naturelle
  const speakChunk = (chunkIndex) => {
    if (!textChunksRef.current[chunkIndex]) {
      stopSpeech();
      return;
    }

    const chunk = textChunksRef.current[chunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    const voice = getFrenchVoice();
    utterance.voice = voice;
    
    // Paramètres lecture experte fluide
    utterance.rate = rate;
    utterance.volume = volume;
    
    // Pitch stable et neutre pour lecture professionnelle
    utterance.pitch = mode === 'prof' ? 0.98 : 1.0;
    
    utterance.lang = 'fr-FR';

    utterance.onend = () => {
      currentChunkRef.current++;
      
      // Respiration naturelle entre groupes (comme un lecteur expert)
      const isLastChunk = currentChunkRef.current >= textChunksRef.current.length;
      const nextChunk = textChunksRef.current[currentChunkRef.current];
      
      // Pause adaptative selon le contexte
      let pauseDuration = 250; // Pause courte par défaut
      
      if (chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')) {
        pauseDuration = 400; // Pause normale après phrase complète
      }
      
      if (nextChunk && (nextChunk.startsWith('1)') || nextChunk.match(/^[A-Z]{2,}/))) {
        pauseDuration = 600; // Pause longue avant nouveau paragraphe/section
      }
      
      if (mode === 'prof') {
        pauseDuration *= 1.2; // Pauses légèrement plus longues en mode prof
      }
      
      if (isLastChunk) {
        stopSpeech();
        return;
      }
      
      setTimeout(() => {
        if (currentChunkRef.current < textChunksRef.current.length) {
          speakChunk(currentChunkRef.current);
        }
      }, pauseDuration);
    };

    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      stopSpeech();
    };

    utterance.onboundary = (e) => {
      const totalLength = textChunksRef.current.join(' ').length;
      const currentPosition = textChunksRef.current
        .slice(0, currentChunkRef.current)
        .join(' ').length + e.charIndex;
      setProgress((currentPosition / totalLength) * 100);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  // Démarrer lecture
  const handlePlay = () => {
    if (!text) return;

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    textChunksRef.current = splitTextIntoChunks(text);
    currentChunkRef.current = 0;
    setIsPlaying(true);
    setIsPaused(false);
    speakChunk(0);
  };

  // Pause
  const handlePause = useCallback(() => {
    if (isPlaying) {
      synthRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Reculer
  const handleRewind = () => {
    if (currentChunkRef.current > 0) {
      synthRef.current.cancel();
      currentChunkRef.current = Math.max(0, currentChunkRef.current - 1);
      speakChunk(currentChunkRef.current);
    }
  };

  // Avancer
  const handleForward = () => {
    if (currentChunkRef.current < textChunksRef.current.length - 1) {
      synthRef.current.cancel();
      currentChunkRef.current++;
      speakChunk(currentChunkRef.current);
    }
  };

  // Changer vitesse
  const handleRateChange = (newRate) => {
    setRate(newRate);
    if (isPlaying || isPaused) {
      const wasPlaying = isPlaying;
      synthRef.current.cancel();
      setTimeout(() => {
        if (wasPlaying) speakChunk(currentChunkRef.current);
      }, 50);
    }
  };

  // Changer volume
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (utteranceRef.current) {
      utteranceRef.current.volume = newVolume;
    }
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        handlePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, handlePause]);

  // Charger les voix
  useEffect(() => {
    const loadVoices = () => {
      synthRef.current.getVoices();
    };
    
    loadVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  return (
    <div className="speech-player">
      <div className="speech-controls">
        {!isPlaying && !isPaused && (
          <button
            className="speech-btn speech-btn-play"
            onClick={handlePlay}
            aria-label="Lire à voix haute"
            title="Lire à voix haute"
          >
            ▶️
          </button>
        )}
        
        {isPlaying && (
          <button
            className="speech-btn speech-btn-pause"
            onClick={handlePause}
            aria-label="Pause"
            title="Pause"
          >
            ⏸
          </button>
        )}
        
        {isPaused && (
          <button
            className="speech-btn speech-btn-resume"
            onClick={handlePlay}
            aria-label="Reprendre"
            title="Reprendre"
          >
            ▶️
          </button>
        )}
        
        {(isPlaying || isPaused) && (
          <>
            <button
              className="speech-btn speech-btn-stop"
              onClick={stopSpeech}
              aria-label="Stop"
              title="Arrêter"
            >
              ⏹
            </button>
            
            <button
              className="speech-btn speech-btn-rewind"
              onClick={handleRewind}
              aria-label="Reculer"
              title="Reculer"
              disabled={currentChunkRef.current === 0}
            >
              ⏪
            </button>
            
            <button
              className="speech-btn speech-btn-forward"
              onClick={handleForward}
              aria-label="Avancer"
              title="Avancer"
              disabled={currentChunkRef.current >= textChunksRef.current.length - 1}
            >
              ⏩
            </button>
          </>
        )}
      </div>

      {(isPlaying || isPaused) && (
        <div className="speech-settings">
          <div className="speech-setting">
            <label>Vitesse</label>
            <div className="speech-rate-buttons">
              <button
                className={rate === 0.85 ? 'active' : ''}
                onClick={() => handleRateChange(0.85)}
              >
                Lent
              </button>
              <button
                className={rate === 0.95 || rate === 1.0 ? 'active' : ''}
                onClick={() => handleRateChange(mode === 'prof' ? 0.95 : 1.0)}
              >
                Fluide
              </button>
              <button
                className={rate === 1.15 ? 'active' : ''}
                onClick={() => handleRateChange(1.15)}
              >
                Rapide
              </button>
            </div>
          </div>

          <div className="speech-setting">
            <label>Volume 🔊</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
            />
          </div>
        </div>
      )}

      {(isPlaying || isPaused) && progress > 0 && (
        <div className="speech-progress">
          <div className="speech-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default SpeechPlayer;

