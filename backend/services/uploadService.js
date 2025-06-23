// services/uploadService.js - Version améliorée
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class UploadService {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', 'uploads');
    this.imagesDir = path.join(this.uploadDir, 'images');
    this.documentsDir = path.join(this.uploadDir, 'documents');
    this.videosDir = path.join(this.uploadDir, 'videos');
    this.audiosDir = path.join(this.uploadDir, 'audios');
    
    // Dossiers spécifiques pour les œuvres
    this.oeuvresDir = path.join(this.uploadDir, 'oeuvres');
    this.oeuvresImagesDir = path.join(this.oeuvresDir, 'images');
    this.oeuvresVideosDir = path.join(this.oeuvresDir, 'videos');
    this.oeuvresAudiosDir = path.join(this.oeuvresDir, 'audios');
    this.oeuvresDocumentsDir = path.join(this.oeuvresDir, 'documents');
    
    // Dossiers pour les profils
    this.profilesDir = path.join(this.uploadDir, 'profiles');
    
    // Dossier temporaire
    this.tempDir = path.join(this.uploadDir, 'temp');

    // Créer les dossiers s'ils n'existent pas
    this.ensureDirectoriesExist();
  }

  ensureDirectoriesExist() {
    const dirs = [
      this.uploadDir,
      this.imagesDir,
      this.documentsDir,
      this.videosDir,
      this.audiosDir,
      this.oeuvresDir,
      this.oeuvresImagesDir,
      this.oeuvresVideosDir,
      this.oeuvresAudiosDir,
      this.oeuvresDocumentsDir,
      this.profilesDir,
      this.tempDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
      }
    });
  }

  // Générer un nom de fichier unique
  generateFilename(originalname, prefix = '') {
    const ext = path.extname(originalname).toLowerCase();
    const name = path.basename(originalname, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    // Nettoyer le nom (supprimer caractères spéciaux)
    const cleanName = name
      .toLowerCase()
      .replace(/[àáäâèéëêìíïîòóöôùúüûñç]/g, (char) => {
        const map = {
          'à': 'a', 'á': 'a', 'ä': 'a', 'â': 'a',
          'è': 'e', 'é': 'e', 'ë': 'e', 'ê': 'e',
          'ì': 'i', 'í': 'i', 'ï': 'i', 'î': 'i',
          'ò': 'o', 'ó': 'o', 'ö': 'o', 'ô': 'o',
          'ù': 'u', 'ú': 'u', 'ü': 'u', 'û': 'u',
          'ñ': 'n', 'ç': 'c'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    return `${prefix}${prefix ? '-' : ''}${cleanName}-${timestamp}-${random}${ext}`;
  }

  // Configuration pour les images
  uploadImage() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.imagesDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname, 'img');
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Format d\'image non supporté. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP, BMP, SVG'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      },
      fileFilter: fileFilter
    });
  }

  // Configuration pour les documents
  uploadDocument() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.documentsDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname, 'doc');
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /pdf|doc|docx|txt|odt|rtf|xls|xlsx|ppt|pptx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.oasis.opendocument.text',
        'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      if (extname && allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        cb(new Error('Format de document non supporté'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
      },
      fileFilter: fileFilter
    });
  }

  // Configuration pour les vidéos
  uploadVideo() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.videosDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname, 'vid');
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm|mpeg|mpg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      const allowedMimeTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/x-flv',
        'video/x-matroska',
        'video/webm'
      ];

      if (extname || allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        cb(new Error('Format de vidéo non supporté'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
      },
      fileFilter: fileFilter
    });
  }

  // Configuration pour les audios
  uploadAudio() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.audiosDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname, 'aud');
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /mp3|wav|ogg|m4a|aac|flac|wma/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      const allowedMimeTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/ogg',
        'audio/m4a',
        'audio/aac',
        'audio/flac',
        'audio/x-ms-wma'
      ];

      if (extname || allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        cb(new Error('Format audio non supporté'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
      },
      fileFilter: fileFilter
    });
  }

  // Upload spécifique pour les médias d'œuvres (accepte plusieurs types)
  uploadMedia() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Déterminer le sous-dossier selon le type de fichier
        let destDir = this.oeuvresDocumentsDir;
        
        if (file.mimetype.startsWith('image/')) {
          destDir = this.oeuvresImagesDir;
        } else if (file.mimetype.startsWith('video/')) {
          destDir = this.oeuvresVideosDir;
        } else if (file.mimetype.startsWith('audio/')) {
          destDir = this.oeuvresAudiosDir;
        }
        
        cb(null, destDir);
      },
      filename: (req, file, cb) => {
        const prefix = file.mimetype.startsWith('image/') ? 'img' :
                      file.mimetype.startsWith('video/') ? 'vid' :
                      file.mimetype.startsWith('audio/') ? 'aud' : 'doc';
        
        const filename = this.generateFilename(file.originalname, `oeuvre-${prefix}`);
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Accepter images, vidéos, audios et documents
      const allowedMimeTypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
        // Vidéos
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        // Audios
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac',
        // Documents
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        // Vérifier par extension si le MIME type n'est pas reconnu
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = [
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
          '.mp4', '.avi', '.mov', '.wmv', '.webm',
          '.mp3', '.wav', '.ogg', '.m4a', '.aac',
          '.pdf', '.doc', '.docx'
        ];
        
        if (allowedExts.includes(ext)) {
          return cb(null, true);
        }
        
        cb(new Error('Type de fichier non supporté'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB par fichier
        files: 10 // Maximum 10 fichiers
      },
      fileFilter: fileFilter
    });
  }

  // Upload pour les photos de profil
  uploadProfilePhoto() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.profilesDir);
      },
      filename: (req, file, cb) => {
        const userId = req.user?.id_user || 'anonymous';
        const filename = this.generateFilename(file.originalname, `profile-${userId}`);
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Format d\'image non supporté pour la photo de profil'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB pour les photos de profil
      },
      fileFilter: fileFilter
    });
  }

  // Upload générique (accepte tout)
  uploadAny() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Déterminer le dossier selon le type
        let destDir = this.documentsDir;
        
        if (file.mimetype.startsWith('image/')) {
          destDir = this.imagesDir;
        } else if (file.mimetype.startsWith('video/')) {
          destDir = this.videosDir;
        } else if (file.mimetype.startsWith('audio/')) {
          destDir = this.audiosDir;
        }
        
        cb(null, destDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname);
        cb(null, filename);
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: 200 * 1024 * 1024 // 200MB max
      }
    });
  }

  // Obtenir le chemin relatif d'un fichier uploadé
  getRelativePath(filePath) {
    // Convertir le chemin absolu en chemin relatif depuis uploads/
    const uploadsIndex = filePath.indexOf('uploads');
    if (uploadsIndex !== -1) {
      return filePath.substring(uploadsIndex).replace(/\\/g, '/');
    }
    return filePath.replace(/\\/g, '/');
  }

  // Supprimer un fichier
  async deleteFile(filePath) {
    try {
      // Gérer les chemins relatifs et absolus
      let fullPath;
      if (path.isAbsolute(filePath)) {
        fullPath = filePath;
      } else if (filePath.startsWith('uploads/')) {
        fullPath = path.join(__dirname, '..', filePath);
      } else {
        fullPath = path.join(__dirname, '..', 'uploads', filePath);
      }
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Fichier supprimé: ${fullPath}`);
        return true;
      } else {
        console.log(`⚠️ Fichier non trouvé: ${fullPath}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
      throw error;
    }
  }

  // Obtenir les infos d'un fichier
  async getFileInfo(filePath) {
    try {
      let fullPath;
      if (path.isAbsolute(filePath)) {
        fullPath = filePath;
      } else if (filePath.startsWith('uploads/')) {
        fullPath = path.join(__dirname, '..', filePath);
      } else {
        fullPath = path.join(__dirname, '..', 'uploads', filePath);
      }
      
      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const stats = fs.statSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      
      // Déterminer le type de fichier
      let type = 'document';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
        type = 'image';
      } else if (['.mp4', '.avi', '.mov', '.wmv', '.webm'].includes(ext)) {
        type = 'video';
      } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
        type = 'audio';
      }
      
      return {
        path: this.getRelativePath(fullPath),
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        type: type,
        extension: ext,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true
      };
    } catch (error) {
      console.error('❌ Erreur lecture fichier:', error);
      return null;
    }
  }

  // Formater la taille d'un fichier
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Nettoyer les fichiers temporaires
  async cleanTempFiles(olderThanHours = 24) {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      console.log(`🧹 ${deletedCount} fichier(s) temporaire(s) supprimé(s)`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Erreur nettoyage fichiers temporaires:', error);
      return 0;
    }
  }
}

// Export singleton
module.exports = new UploadService();