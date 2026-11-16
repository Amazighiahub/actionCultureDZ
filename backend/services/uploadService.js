// services/uploadService.js
// Réception des fichiers en mémoire (multer) avant le contrôle des octets (middlewares/uploadSecurity)
// puis l'envoi à Cloudinary (services/upload/cloudinaryUploader). 2026-11-16 : l'ancien envoi direct à
// Cloudinary sans contrôle (uploadImage, uploadProfilePhoto) est retiré ; il ne servait plus qu'à
// l'affiche des événements, passée au chemin sûr.

const multer = require('multer');

class UploadService {
  constructor() {
    // Aucun dossier local à créer - tout va sur Cloudinary
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
        // Code connu de multerErrorGuard : 400 « Type de fichier non autorisé » (avant : 500, ex. photo HEIC)
        cb(Object.assign(new Error('Format d\'image non supporté. Formats acceptés : JPG, PNG, GIF, WEBP'), { code: 'UPLOAD_INVALID_TYPE' }));
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
        cb(Object.assign(new Error('Format de document non supporté'), { code: 'UPLOAD_INVALID_TYPE' }));
      }
    };
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: maxSize },
      fileFilter
    });
  }
}

module.exports = new UploadService();
