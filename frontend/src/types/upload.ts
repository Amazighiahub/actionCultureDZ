// types/upload.ts - Fichier complet pour la gestion des uploads

/**
 * Status possible d'un fichier en cours d'upload
 */
export type UploadStatus = "pending" | "uploading" | "success" | "error" | "cancelled";

/**
 * Types de fichiers supportés
 */
export type FileType = "image" | "document" | "video" | "audio" | "media";

/**
 * Interface pour un fichier en cours d'upload
 */
export interface UploadedFile {
  /** Le fichier original */
  file: File;
  /** URL du fichier une fois uploadé (ou preview locale) */
  url?: string;
  /** Status actuel de l'upload */
  status: UploadStatus;
  /** Message d'erreur si status = "error" */
  error?: string;
  /** Progression de l'upload (0-100) */
  progress?: number;
  /** ID unique pour identifier le fichier */
  id: string;
  /** Type de fichier détecté */
  fileType?: FileType;
  /** Taille formatée pour affichage */
  formattedSize?: string;
  /** Timestamp de début d'upload */
  startTime?: number;
  /** Timestamp de fin d'upload */
  endTime?: number;
}

/**
 * Résultat d'un upload réussi
 */
export interface FileUploadResult {
  /** URL publique du fichier uploadé */
  url: string;
  /** Nom du fichier sur le serveur */
  filename: string;
  /** Nom original du fichier */
  originalName: string;
  /** Taille en bytes */
  size: number;
  /** Type MIME */
  mimeType: string;
  /** Type de fichier détecté */
  fileType: FileType;
  /** ID du média en base de données (si applicable) */
  mediaId?: number;
  /** Métadonnées additionnelles */
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  };
}

/**
 * Configuration pour l'upload
 */
export interface UploadConfig {
  /** Endpoint d'upload */
  endpoint: string;
  /** Types de fichiers acceptés */
  acceptedTypes: string[];
  /** Taille maximale en MB */
  maxSize: number;
  /** Autoriser plusieurs fichiers */
  multiple: boolean;
  /** Autoriser la compression automatique */
  autoCompress?: boolean;
  /** Qualité de compression (0-1) pour les images */
  compressionQuality?: number;
  /** Headers HTTP personnalisés */
  headers?: Record<string, string>;
  /** Paramètres additionnels à envoyer */
  additionalParams?: Record<string, any>;
}

/**
 * Événements d'upload
 */
export interface UploadEvents {
  /** Fichier ajouté à la file d'attente */
  onFileAdded?: (file: UploadedFile) => void;
  /** Début d'upload d'un fichier */
  onUploadStart?: (file: UploadedFile) => void;
  /** Progression d'upload */
  onUploadProgress?: (file: UploadedFile, progress: number) => void;
  /** Upload terminé avec succès */
  onUploadSuccess?: (file: UploadedFile, result: FileUploadResult) => void;
  /** Erreur d'upload */
  onUploadError?: (file: UploadedFile, error: string) => void;
  /** Fichier supprimé */
  onFileRemoved?: (file: UploadedFile) => void;
  /** Tous les uploads terminés */
  onAllUploadsComplete?: (results: FileUploadResult[]) => void;
}

/**
 * Props pour le composant FileUpload
 */
export interface FileUploadProps extends UploadEvents {
  /** Type de fichiers à accepter */
  type?: FileType;
  /** Patterns d'extensions acceptées (override type) */
  accept?: string;
  /** Taille maximale en MB */
  maxSize?: number;
  /** Autoriser plusieurs fichiers */
  multiple?: boolean;
  /** Callback quand des URLs sont générées */
  onFileUploaded?: (urls: string[]) => void;
  /** Callback quand des fichiers sont sélectionnés (avant upload) */
  onFilesSelected?: (files: File[]) => void;
  /** Callback d'erreur global */
  onError?: (error: string) => void;
  /** Classes CSS additionnelles */
  className?: string;
  /** Texte placeholder */
  placeholder?: string;
  /** Afficher les previews */
  preview?: boolean;
  /** URLs existantes à afficher */
  existingUrls?: string[];
  /** Fichiers déjà en cours d'upload */
  existingFiles?: UploadedFile[];
  /** Mode disabled */
  disabled?: boolean;
  /** Autoriser le drag & drop */
  allowDrop?: boolean;
  /** Configuration d'upload personnalisée */
  uploadConfig?: Partial<UploadConfig>;
}

/**
 * Erreurs d'upload possibles
 */
export enum UploadError {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_TYPE = "INVALID_TYPE",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN"
}

/**
 * Messages d'erreur localisés
 */
export const UploadErrorMessages: Record<UploadError, string> = {
  [UploadError.FILE_TOO_LARGE]: "Le fichier est trop volumineux",
  [UploadError.INVALID_TYPE]: "Type de fichier non autorisé",
  [UploadError.NETWORK_ERROR]: "Erreur de connexion",
  [UploadError.SERVER_ERROR]: "Erreur du serveur",
  [UploadError.CANCELLED]: "Upload annulé",
  [UploadError.UNKNOWN]: "Erreur inconnue"
};

/**
 * Configurations par défaut selon le type
 */
export const DefaultUploadConfigs: Record<FileType, UploadConfig> = {
  image: {
    endpoint: "/api/upload/image",
    acceptedTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    maxSize: 10, // 10MB
    multiple: true,
    autoCompress: true,
    compressionQuality: 0.8
  },
  document: {
    endpoint: "/api/upload/document",
    acceptedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv"
    ],
    maxSize: 50, // 50MB
    multiple: true
  },
  video: {
    endpoint: "/api/upload/video",
    acceptedTypes: ["video/mp4", "video/webm", "video/ogg", "video/avi"],
    maxSize: 500, // 500MB
    multiple: false
  },
  audio: {
    endpoint: "/api/upload/audio",
    acceptedTypes: ["audio/mp3", "audio/wav", "audio/ogg", "audio/aac"],
    maxSize: 100, // 100MB
    multiple: true
  },
  media: {
    endpoint: "/api/upload/media",
    acceptedTypes: ["image/*", "video/*", "audio/*"],
    maxSize: 200, // 200MB
    multiple: true
  }
};

/**
 * Utilitaires pour la gestion des fichiers
 */
export class UploadUtils {
  /**
   * Génère un ID unique pour un fichier
   */
  static generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formate la taille d'un fichier en format lisible
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Détecte le type de fichier basé sur le MIME type
   */
  static detectFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return 'document';
    }
    return 'media';
  }

  /**
   * Valide un fichier selon la configuration
   */
  static validateFile(file: File, config: UploadConfig): { valid: boolean; error?: string } {
    // Vérifier la taille
    const maxSizeBytes = config.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Le fichier "${file.name}" est trop volumineux (max: ${config.maxSize}MB)`
      };
    }

    // Vérifier le type
    const isTypeAllowed = config.acceptedTypes.some(allowedType => {
      if (allowedType.endsWith('/*')) {
        return file.type.startsWith(allowedType.replace('/*', ''));
      }
      return file.type === allowedType;
    });

    if (!isTypeAllowed) {
      return {
        valid: false,
        error: `Type de fichier "${file.type}" non autorisé pour "${file.name}"`
      };
    }

    return { valid: true };
  }

  /**
   * Crée un objet UploadedFile à partir d'un File
   */
  static createUploadedFile(file: File): UploadedFile {
    return {
      id: this.generateFileId(),
      file,
      status: "pending",
      fileType: this.detectFileType(file.type),
      formattedSize: this.formatFileSize(file.size),
      startTime: Date.now()
    };
  }

  /**
   * Crée une URL de preview pour un fichier
   */
  static createPreviewUrl(file: File): string {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return '';
  }

  /**
   * Nettoie les URLs de preview créées
   */
  static revokePreviewUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Compresse une image
   */
  static async compressImage(
    file: File, 
    quality: number = 0.8, 
    maxWidth: number = 1920
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convertir en blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * Hook personnalisé pour gérer les uploads
 */
export interface UseUploadReturn {
  files: UploadedFile[];
  isUploading: boolean;
  progress: number;
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  startUpload: () => Promise<FileUploadResult[]>;
  cancelUpload: (fileId?: string) => void;
  clearAll: () => void;
}

/**
 * Types pour les réponses d'API
 */
export interface UploadApiResponse {
  success: boolean;
  data?: FileUploadResult;
  error?: string;
  message?: string;
}

export interface BatchUploadApiResponse {
  success: boolean;
  data?: FileUploadResult[];
  errors?: Array<{ fileId: string; error: string }>;
  message?: string;
}

/**
 * Configuration globale des uploads
 */
export interface GlobalUploadConfig {
  /** URL de base pour les uploads */
  baseUrl: string;
  /** Token d'authentification */
  authToken?: string;
  /** Headers par défaut */
  defaultHeaders: Record<string, string>;
  /** Retry automatique en cas d'erreur */
  autoRetry: boolean;
  /** Nombre maximum de tentatives */
  maxRetries: number;
  /** Délai entre les tentatives (ms) */
  retryDelay: number;
  /** Uploads simultanés maximum */
  maxConcurrentUploads: number;
}

export default {
  UploadUtils,
  DefaultUploadConfigs,
  UploadErrorMessages
};