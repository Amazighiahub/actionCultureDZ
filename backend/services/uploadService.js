// services/uploadService.js - Service d'upload pour Action Culture

const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('🔧 Initialisation du service d\'upload...');

// ✅ Configuration selon votre .env
const UPLOAD_IMAGES_DIR = process.env.UPLOAD_IMAGES_DIR || 'uploads/images';
const UPLOAD_DOCUMENTS_DIR = process.env.UPLOAD_DOCUMENTS_DIR || 'uploads/documents';
const UPLOAD_VIDEOS_DIR = process.env.UPLOAD_VIDEOS_DIR || 'uploads/videos';

console.log('📁 Configuration des dossiers:');
console.log(`  - Images: ${UPLOAD_IMAGES_DIR}`);
console.log(`  - Documents: ${UPLOAD_DOCUMENTS_DIR}`);
console.log(`  - Vidéos: ${UPLOAD_VIDEOS_DIR}`);

// ✅ Créer les dossiers s'ils n'existent pas
const createUploadDirs = () => {
  const dirs = [UPLOAD_IMAGES_DIR, UPLOAD_DOCUMENTS_DIR, UPLOAD_VIDEOS_DIR];
  
  dirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
      } else {
        console.log(`📁 Dossier existant: ${dir}`);
      }
    } catch (error) {
      console.error(`❌ Erreur création dossier ${dir}:`, error.message);
    }
  });
};

// Initialiser les dossiers
createUploadDirs();

// ✅ Configuration de stockage pour les images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📁 Destination pour ${file.originalname}: ${UPLOAD_IMAGES_DIR}`);
    cb(null, UPLOAD_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    
    console.log(`📝 Nom généré pour ${file.originalname}: ${filename}`);
    cb(null, filename);
  }
});

// ✅ Filtre pour valider les types d'images
const imageFilter = (req, file, cb) => {
  console.log(`🔍 Validation du fichier: ${file.originalname} (${file.mimetype})`);
  
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/bmp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ Type de fichier autorisé');
    cb(null, true);
  } else {
    console.log(`❌ Type non autorisé: ${file.mimetype}`);
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${allowedTypes.join(', ')}`), false);
  }
};

// ✅ FONCTION PRINCIPALE : uploadImage (celle utilisée par votre app.js)
const uploadImage = () => {
  console.log('⚙️ Configuration multer pour images...');
  
  return multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
      files: 1
    }
  });
};

// ✅ Configuration pour documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const uploadDocument = () => {
  return multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });
};

// ✅ Configuration pour vidéos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const uploadVideo = () => {
  return multer({
    storage: videoStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  });
};

// ✅ FONCTION IMPORTANTE : getFileUrl (utilisée par votre app.js actuel)
const getFileUrl = (filename) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  // ✅ CORRIGÉ : Inclure le bon chemin avec uploads/images
  const url = `${baseUrl}/${UPLOAD_IMAGES_DIR}/${filename}`;
  console.log(`🔗 URL générée pour ${filename}: ${url}`);
  return url;
};

// ✅ Fonction pour générer l'URL à partir du chemin complet
const getFileUrlFromPath = (filePath) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
  console.log(`🔗 URL générée pour chemin ${filePath}: ${url}`);
  return url;
};

// ✅ Fonction pour supprimer un fichier
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Fichier supprimé: ${filePath}`);
      return true;
    }
    console.log(`⚠️ Fichier introuvable: ${filePath}`);
    return false;
  } catch (error) {
    console.error(`❌ Erreur suppression: ${error.message}`);
    return false;
  }
};

// ✅ Fonction pour obtenir le type de fichier
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.includes('pdf') || mimetype.includes('document')) return 'document';
  return 'other';
};

// ✅ Export du service
const exportedService = {
  uploadImage,        // ← OBLIGATOIRE pour votre app.js
  uploadDocument,
  uploadVideo,
  getFileUrl,         // ← OBLIGATOIRE pour votre app.js
  getFileUrlFromPath,
  deleteFile,
  getFileType,
  
  // Constantes
  UPLOAD_IMAGES_DIR,
  UPLOAD_DOCUMENTS_DIR,
  UPLOAD_VIDEOS_DIR,
};

// ✅ Validation de l'export (debug)
console.log('🔍 Validation des exports:');
console.log(`  ✅ uploadImage: ${typeof exportedService.uploadImage}`);
console.log(`  ✅ getFileUrl: ${typeof exportedService.getFileUrl}`);

// ✅ Test spécifique
if (typeof exportedService.uploadImage !== 'function') {
  console.error('❌ ERREUR CRITIQUE: uploadImage n\'est pas une fonction!');
  process.exit(1);
} else {
  console.log('✅ uploadImage est bien une fonction');
}

if (typeof exportedService.getFileUrl !== 'function') {
  console.error('❌ ERREUR CRITIQUE: getFileUrl n\'est pas une fonction!');
  process.exit(1);
} else {
  console.log('✅ getFileUrl est bien une fonction');
}

console.log('✅ Service d\'upload initialisé avec succès');

module.exports = exportedService;