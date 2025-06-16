// services/uploadService.js
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

    // Créer les dossiers s'ils n'existent pas
    this.ensureDirectoriesExist();
  }

  ensureDirectoriesExist() {
    const dirs = [this.uploadDir, this.imagesDir, this.documentsDir, this.videosDir];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
      }
    });
  }

  // Générer un nom de fichier unique
  generateFilename(originalname) {
    const ext = path.extname(originalname);
    const name = path.basename(originalname, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    // Nettoyer le nom (supprimer caractères spéciaux)
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    return `${cleanName}-${timestamp}-${random}${ext}`;
  }

  // Configuration pour les images
  uploadImage() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.imagesDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname);
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Format d\'image non supporté. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP, BMP'));
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
        const filename = this.generateFilename(file.originalname);
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
        const filename = this.generateFilename(file.originalname);
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      const allowedMimeTypes = [
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/x-ms-wmv',
        'video/x-flv',
        'video/x-matroska',
        'video/webm'
      ];

      if (extname && allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        cb(new Error('Format de vidéo non supporté'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 200 * 1024 * 1024 // 200MB
      },
      fileFilter: fileFilter
    });
  }

  // Upload générique (accepte tout)
  uploadAny() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Déterminer le dossier selon le type
        let destDir = this.uploadDir;
        
        if (file.mimetype.startsWith('image/')) {
          destDir = this.imagesDir;
        } else if (file.mimetype.startsWith('video/')) {
          destDir = this.videosDir;
        } else {
          destDir = this.documentsDir;
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

  // Supprimer un fichier
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      
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
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const stats = fs.statSync(fullPath);
      
      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true
      };
    } catch (error) {
      console.error('❌ Erreur lecture fichier:', error);
      return null;
    }
  }
}

// Export singleton
module.exports = new UploadService();