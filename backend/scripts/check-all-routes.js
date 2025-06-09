// check-all-routes.js - Vérifier tous les fichiers de routes pour les problèmes d'authMiddleware
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de tous les fichiers de routes\n');

const routesDir = path.join(__dirname, 'routes');
const problems = [];
let totalFiles = 0;
let filesWithProblems = 0;

// Méthodes à vérifier
const oldMethods = ['isAdmin', 'isProfessional'];
const newMethods = ['requireAdmin', 'requireValidatedProfessional'];

try {
  // Lire tous les fichiers .js dans le dossier routes
  const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
  
  console.log(`📁 ${files.length} fichiers trouvés dans routes/\n`);

  files.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    totalFiles++;
    
    console.log(`📄 ${file}:`);
    
    let hasProblems = false;
    
    // Vérifier l'import de createAuthMiddleware
    if (!content.includes('createAuthMiddleware')) {
      console.log('   ⚠️  N\'importe pas createAuthMiddleware');
      hasProblems = true;
    }
    
    // Vérifier les anciennes méthodes
    oldMethods.forEach((method, index) => {
      const regex = new RegExp(`authMiddleware\\.${method}`, 'g');
      const matches = content.match(regex) || [];
      
      if (matches.length > 0) {
        console.log(`   ❌ Utilise authMiddleware.${method} (${matches.length}x) → devrait être authMiddleware.${newMethods[index]}`);
        problems.push({
          file,
          issue: `Utilise authMiddleware.${method} au lieu de authMiddleware.${newMethods[index]}`,
          count: matches.length
        });
        hasProblems = true;
      }
    });
    
    // Vérifier si le fichier initialise correctement authMiddleware
    if (content.includes('createAuthMiddleware') && !content.includes('createAuthMiddleware(models)')) {
      console.log('   ⚠️  N\'appelle pas createAuthMiddleware avec les models');
      hasProblems = true;
    }
    
    if (!hasProblems) {
      console.log('   ✅ OK');
    } else {
      filesWithProblems++;
    }
    
    console.log('');
  });

  // Résumé
  console.log('═══════════════════════════════════════');
  console.log('📊 RÉSUMÉ:');
  console.log(`   Total fichiers: ${totalFiles}`);
  console.log(`   Fichiers OK: ${totalFiles - filesWithProblems}`);
  console.log(`   Fichiers avec problèmes: ${filesWithProblems}`);
  
  if (problems.length > 0) {
    console.log('\n❌ PROBLÈMES À CORRIGER:');
    problems.forEach(p => {
      console.log(`   - ${p.file}: ${p.issue} (${p.count} occurrences)`);
    });
    
    console.log('\n💡 CORRECTION AUTOMATIQUE:');
    console.log('   Pour corriger automatiquement ces problèmes :');
    console.log('   1. Exécutez : node fix-metadata-routes.js');
    console.log('   2. Ou remplacez manuellement :');
    console.log('      - authMiddleware.isAdmin → authMiddleware.requireAdmin');
    console.log('      - authMiddleware.isProfessional → authMiddleware.requireValidatedProfessional');
  } else {
    console.log('\n✅ Aucun problème détecté !');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
}

console.log('\n✅ Vérification terminée');
process.exit(problems.length > 0 ? 1 : 0);