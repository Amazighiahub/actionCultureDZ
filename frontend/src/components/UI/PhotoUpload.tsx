// components/UI/PhotoUpload.tsx - Composant d'upload de photo de profil

import React, { useState, useRef, useCallback } from 'react';
import { 
  HiOutlineCamera as Camera,
  HiOutlineUser as User,
  HiXMark as X,
  HiOutlinePhoto as Photo
} from 'react-icons/hi2';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (file: File | null) => void;
  onPhotoRemove?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRemoveButton?: boolean;
  acceptedFormats?: string[];
  maxSize?: number; // en MB
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  onPhotoChange,
  onPhotoRemove,
  disabled = false,
  size = 'md',
  className = '',
  showRemoveButton = true,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxSize = 5 // 5MB par défaut
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tailles selon la prop size
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  // Validation du fichier
  const validateFile = (file: File): string | null => {
    // Vérifier le type
    if (!acceptedFormats.includes(file.type)) {
      return `Format non accepté. Formats autorisés : ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    // Vérifier la taille
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      return `Fichier trop volumineux. Taille maximale : ${maxSize}MB`;
    }

    return null;
  };

  // Gérer la sélection de fichier
  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Créer l'aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onPhotoChange(file);
  }, [onPhotoChange, maxSize, acceptedFormats]);

  // Gérer l'input file
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Gérer le drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Supprimer la photo
  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onPhotoChange(null);
    if (onPhotoRemove) {
      onPhotoRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Ouvrir le sélecteur de fichier
  const openFileSelector = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Déterminer quelle image afficher
  const displayImage = preview || currentPhotoUrl;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Zone d'upload */}
      <div
        className={`
          relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 transition-all cursor-pointer
          ${dragOver 
            ? 'border-[#eb9f13] bg-[#eb9f13]/10' 
            : 'border-[#dde0e3] hover:border-[#eb9f13]'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${error ? 'border-red-500' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        {displayImage ? (
          <>
            {/* Image de profil */}
            <img
              src={displayImage}
              alt="Photo de profil"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay au hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-[#f8fbfa] flex items-center justify-center">
            {dragOver ? (
              <Photo className={`${iconSizes[size]} text-[#eb9f13]`} />
            ) : (
              <User className={`${iconSizes[size]} text-[#6a7581]`} />
            )}
          </div>
        )}

        {/* Bouton de suppression */}
        {displayImage && showRemoveButton && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-[#6a7581] mb-1">
          {dragOver 
            ? 'Déposez votre photo ici' 
            : 'Cliquez ou glissez une photo'
          }
        </p>
        <p className="text-xs text-[#6a7581]">
          Formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} • Max {maxSize}MB
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="text-red-500 text-sm text-center bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;