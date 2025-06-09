// backend/setupUploads.js - Script pour initialiser la structure des uploads
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('📁 Configuration de la structure des uploads...\n');

// Structure des dossiers à créer
const uploadStructure = {
  base: process.env.UPLOAD_DIR || 'uploads',
  subdirs: {
    images: {
      path: process.env.UPLOAD_IMAGES_DIR || 'uploads/images',
      description: 'Images (photos, illustrations)',
      gitkeep: true
    },
    documents: {
      path: process.env.UPLOAD_DOCUMENTS_DIR || 'uploads/documents',
      description: 'Documents (PDF, Word, Excel)',
      gitkeep: true
    },
    videos: {
      path: process.env.UPLOAD_VIDEOS_DIR || 'uploads/videos',
      description: 'Vidéos',
      gitkeep: true
    },
    temp: {
      path: process.env.UPLOAD_TEMP_DIR || 'uploads/temp',
      description: 'Fichiers temporaires',
      gitkeep: true
    }
  }
};

// Créer les dossiers
function createDirectories() {
  // Créer le dossier principal
  if (!fs.existsSync(uploadStructure.base)) {
    fs.mkdirSync(uploadStructure.base, { recursive: true });
    console.log(`✅ Dossier principal créé: ${uploadStructure.base}`);
  } else {
    console.log(`📂 Dossier principal existe: ${uploadStructure.base}`);
  }

  // Créer les sous-dossiers
  Object.entries(uploadStructure.subdirs).forEach(([key, config]) => {
    if (!fs.existsSync(config.path)) {
      fs.mkdirSync(config.path, { recursive: true });
      console.log(`✅ Sous-dossier créé: ${config.path} - ${config.description}`);
    } else {
      console.log(`📂 Sous-dossier existe: ${config.path} - ${config.description}`);
    }

    // Créer un fichier .gitkeep pour garder les dossiers vides dans git
    if (config.gitkeep) {
      const gitkeepPath = path.join(config.path, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
      }
    }
  });
}

// Créer le fichier .gitignore pour les uploads
function createGitignore() {
  const gitignorePath = path.join(uploadStructure.base, '.gitignore');
  const gitignoreContent = `# Ignorer tous les fichiers uploadés
*
*/

# Mais garder les fichiers .gitkeep
!.gitkeep
!.gitignore

# Garder la structure des dossiers
!images/
!documents/
!videos/
!temp/
`;

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(`\n✅ Fichier .gitignore créé dans ${uploadStructure.base}`);
  }
}

// Créer un fichier README pour documenter la structure
function createReadme() {
  const readmePath = path.join(uploadStructure.base, 'README.md');
  const readmeContent = `# Structure des Uploads

## Organisation des fichiers

- **images/** : Photos, illustrations, logos
  - Formats acceptés : JPG, PNG, GIF, WebP
  - Taille max : ${process.env.UPLOAD_IMAGE_MAX_SIZE || '5MB'}
  
- **documents/** : Documents texte
  - Formats acceptés : PDF, DOC, DOCX, XLS, XLSX
  - Taille max : ${process.env.UPLOAD_DOCUMENT_MAX_SIZE || '10MB'}
  
- **videos/** : Vidéos
  - Formats acceptés : MP4, WebM, MOV, AVI
  - Taille max : ${process.env.UPLOAD_VIDEO_MAX_SIZE || '100MB'}
  
- **temp/** : Fichiers temporaires (nettoyés automatiquement)

## Sécurité

- Les noms de fichiers sont automatiquement sécurisés
- Les types MIME sont vérifiés
- Les extensions sont validées
- Organisation par date (YYYY-MM) pour éviter trop de fichiers par dossier

## Configuration

Voir le fichier \`.env\` pour modifier les limites et types autorisés.
`;

  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ README créé dans ${uploadStructure.base}`);
  }
}

// Afficher les statistiques actuelles
function displayStats() {
  console.log('\n📊 Statistiques des uploads existants:\n');
  
  Object.entries(uploadStructure.subdirs).forEach(([key, config]) => {
    if (fs.existsSync(config.path)) {
      const files = getAllFiles(config.path);
      const totalSize = files.reduce((sum, file) => {
        try {
          return sum + fs.statSync(file).size;
        } catch {
          return sum;
        }
      }, 0);

      console.log(`📁 ${key}:`);
      console.log(`   - Fichiers: ${files.length}`);
      console.log(`   - Taille totale: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    }
  });
}

// Helper pour obtenir tous les fichiers
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (file === '.gitkeep' || file === '.gitignore' || file === 'README.md') return;
    
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Exécuter le setup
console.log('🚀 Démarrage de la configuration...\n');

createDirectories();
createGitignore();
createReadme();
displayStats();

console.log('\n✅ Configuration des uploads terminée !');
console.log('\n💡 Pour nettoyer les fichiers temporaires, utilisez:');
console.log('   node cleanTempUploads.js\n');