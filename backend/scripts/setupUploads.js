// scripts/setupUploads.js - Script pour créer la structure des dossiers uploads
const fs = require('fs');
const path = require('path');

// Structure des dossiers à créer
const uploadStructure = {
  uploads: {
    images: {},
    videos: {},
    audios: {},
    documents: {},
    oeuvres: {
      images: {},
      videos: {},
      audios: {},
      documents: {}
    },
    profiles: {},
    temp: {}
  }
};

// Fonction récursive pour créer les dossiers
function createDirectoryStructure(basePath, structure) {
  Object.keys(structure).forEach(dir => {
    const dirPath = path.join(basePath, dir);
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Dossier créé: ${dirPath}`);
    } else {
      console.log(`📁 Dossier existant: ${dirPath}`);
    }
    
    // Créer les sous-dossiers
    if (Object.keys(structure[dir]).length > 0) {
      createDirectoryStructure(dirPath, structure[dir]);
    }
    
    // Ajouter un fichier .gitkeep pour que Git track les dossiers vides
    const gitkeepPath = path.join(dirPath, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  });
}

// Créer aussi un .gitignore pour ignorer les fichiers uploadés mais garder la structure
function createGitignore() {
  const gitignorePath = path.join(__dirname, '..', 'uploads', '.gitignore');
  const gitignoreContent = `# Ignorer tous les fichiers
*
# Mais garder les dossiers et .gitkeep
!*/
!.gitkeep
!.gitignore
`;
  
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('✅ Fichier .gitignore créé pour uploads/');
}

// Script principal
function setupUploads() {
  console.log('🚀 Configuration des dossiers uploads...\n');
  
  const basePath = path.join(__dirname, '..');
  
  try {
    // Créer la structure
    createDirectoryStructure(basePath, uploadStructure);
    
    // Créer le .gitignore
    createGitignore();
    
    console.log('\n✅ Configuration terminée avec succès!');
    console.log('\n📌 Structure créée:');
    console.log('uploads/');
    console.log('├── images/');
    console.log('├── videos/');
    console.log('├── audios/');
    console.log('├── documents/');
    console.log('├── oeuvres/');
    console.log('│   ├── images/');
    console.log('│   ├── videos/');
    console.log('│   ├── audios/');
    console.log('│   └── documents/');
    console.log('├── profiles/');
    console.log('└── temp/');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  setupUploads();
}

module.exports = setupUploads;