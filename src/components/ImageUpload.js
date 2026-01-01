import React, { useRef, useState } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ onImageSelect, disabled }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onImageSelect(reader.result, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      {preview ? (
        <div className="image-preview-container">
          <img src={preview} alt="Preview" className="image-preview" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="image-remove-btn"
            title="Supprimer l'image"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="image-upload-btn"
          disabled={disabled}
          title="Ajouter une image"
        >
          📎
        </button>
      )}
    </div>
  );
};

export default ImageUpload;


