// services/uploadService.js
// Stockage Cloudinary via multer-storage-cloudinary
// Images  : resize auto, quality:auto:good, format:auto (WebP/AVIF)
// Vidéos  : 1280x720, 2Mbit/s, MP4
// Audios  : Cloudinary resource_type 'video'
// Docs    : Cloudinary resource_type 'raw'

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const crypto = require('crypto');
const {
  cloudinary,
  FOLDERS,
  IMAGE_TRANSFORMS
} = require('./cloudinaryService');

class UploadService {
  constructor() {
    // Aucun dossier local à créer - tout va sur Cloudinary
  }

  // ============================================================
  // Génération d'un public_id unique pour Cloudinary
  // ============================================================
  generatePublicId(originalname, prefix = '') {
    const ext = path.extname(originalname).toLowerCase();
    const name = path.basename(originalname, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');

    const cleanName = name
      .toLowerCase()
      .replace(/[àáäâèéëêìíïîòóöôùúüûñç]/g, (c) => (
        { à:'a',á:'a',ä:'a',â:'a',è:'e',é:'e',ë:'e',ê:'e',
          ì:'i',í:'i',ï:'i',î:'i',ò:'o',ó:'o',ö:'o',ô:'o',
          ù:'u',ú:'u',ü:'u',û:'u',ñ:'n',ç:'c' }[c] || c
      ))
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);

    return `${prefix ? prefix + '-' : ''}${cleanName}-${timestamp}-${random}`;
  }

  // ============================================================
  // Images — avec transformations Cloudinary
  // context: 'default' | 'profile'
  // ============================================================
  uploadImage(context = 'default') {
    const folder = context === 'profile' ? FOLDERS.profile : FOLDERS.image;
    const transformation = context === 'profile'
      ? IMAGE_TRANSFORMS.profile
      : IMAGE_TRANSFORMS.default;

    const storage = new CloudinaryStorage({
      cloudinary,
      params: (req, file) => ({
        folder,
        public_id:     this.generatePublicId(file.originalname, 'img'),
        resource_type: 'image',
        transformation,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
      })
    });

    const fileFilter = (req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp/;
      if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error('Format d\'image non supporté. Formats acceptés : JPG, PNG, GIF, WEBP'));
      }
    };

    return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
  }

  // ============================================================
  // Documents — resource_type 'raw' sur Cloudinary
  // ============================================================
  uploadDocument() {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: (req, file) => ({
        folder:        FOLDERS.document,
        public_id:     this.generatePublicId(file.originalname, 'doc'),
        resource_type: 'raw',
        allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'odt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx']
      })
    });

    const fileFilter = (req, file, cb) => {
      const allowedMimes = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/vnd.oasis.opendocument.text', 'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Format de document non supporté'));
      }
    };

    return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });
  }

  // ============================================================
  // Photo de profil — recadrage face 500x500
  // ============================================================
  uploadProfilePhoto() {
    return this.uploadImage('profile');
  }

  // ============================================================
  // PIPELINE "SAFE" : memoryStorage + magic bytes check AVANT
  // Cloudinary. Utilise pour images et documents (fichiers de taille
  // raisonnable qu'on peut se permettre de passer en RAM).
  // Pour videos/audio (100+ MB), on garde Cloudinary direct pour eviter
  // la pression memoire sur Node.
  //
  // Ces variantes expectent que la route :
  //  1. utilise multer.memoryStorage()
  //  2. passe par validateMagicBytesBuffer() (middleware)
  //  3. puis appelle uploadImageBuffer / uploadDocumentBuffer
  //     (cf. services/upload/cloudinaryUploader.js)
  // ============================================================
  uploadImageSafe(maxSize = 10 * 1024 * 1024) {
    const fileFilter = (req, file, cb) => {
      // Whitelist MIME cliente-basee : defense en premiere ligne.
      // La vraie validation se fait ensuite via magic bytes sur le buffer.
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Format d\'image non supporte. Formats acceptes : JPG, PNG, GIF, WEBP'));
      }
    };
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: maxSize },
      fileFilter
    });
  }

  uploadDocumentSafe(maxSize = 50 * 1024 * 1024) {
    const fileFilter = (req, file, cb) => {
      const allowed = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/vnd.oasis.opendocument.text', 'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Format de document non supporte'));
      }
    };
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: maxSize },
      fileFilter
    });
  }

  // Upload générique (réutilise uploadMedia)
  uploadAny() {
    return this.uploadMedia();
  }

  // ============================================================
  // Suppression d'un fichier Cloudinary via son URL
  // ============================================================
  async deleteFile(url) {
    const { deleteAsset, extractPublicId, isCloudinaryUrl } = require('./cloudinaryService');
    if (!isCloudinaryUrl(url)) return false;
    const publicId = extractPublicId(url);
    if (!publicId) return false;
    const resourceType = url.includes('/video/') ? 'video' :
                         url.includes('/raw/')   ? 'raw'   : 'image';
    await deleteAsset(publicId, resourceType);
    return true;
  }

  // Helper taille fichier (conservé pour compatibilité)
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cloudinary gère le stockage — pas de nettoyage local
  async cleanTempFiles() {
    return 0;
  }
}

module.exports = new UploadService();
