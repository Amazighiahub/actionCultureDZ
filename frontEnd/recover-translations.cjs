// recover-translations.cjs - Version CommonJS corrigée
const fs = require('fs');
const path = require('path');

const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

console.log('🔄 Récupération des traductions depuis les anciens fichiers...\n');

locales.forEach(locale => {
  const newFile = path.join('i18n/locales', locale, 'translation.json');
  const oldFile = path.join('i18n/locales', locale, 'translation_old.json');
  
  try {
    // Lire les fichiers
    const newTranslations = JSON.parse(fs.readFileSync(newFile, 'utf8'));
    const oldTranslations = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
    
    let recoveredCount = 0;
    
    // Fonction pour parcourir et récupérer les traductions
    function recoverTranslations(newObj, oldObj, path = '') {
      for (const key in newObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof newObj[key] === 'object' && newObj[key] !== null) {
          if (oldObj && typeof oldObj[key] === 'object') {
            recoverTranslations(newObj[key], oldObj[key], currentPath);
          }
        } else if (typeof newObj[key] === 'string') {
          // Si c'est une valeur non traduite
          if (newObj[key].includes('{{') || newObj[key].includes('⵿⵿')) {
            // Vérifier que l'ancienne valeur existe et est une chaîne
            if (oldObj && 
                oldObj[key] !== undefined && 
                oldObj[key] !== null &&
                typeof oldObj[key] === 'string' &&
                !oldObj[key].includes('{{') && 
                !oldObj[key].includes('⵿⵿') &&
                oldObj[key] !== key &&
                oldObj[key].trim() !== '') {
              // Récupérer l'ancienne traduction
              newObj[key] = oldObj[key];
              recoveredCount++;
              console.log(`  ✓ ${currentPath}: "${oldObj[key]}"`);
            }
          }
        }
      }
    }
    
    console.log(`\n📁 ${locale.toUpperCase()}`);
    recoverTranslations(newTranslations, oldTranslations);
    
    if (recoveredCount > 0) {
      // Sauvegarder le fichier avec les traductions récupérées
      fs.writeFileSync(newFile, JSON.stringify(newTranslations, null, 2), 'utf8');
      console.log(`  ✅ ${recoveredCount} traductions récupérées et sauvegardées`);
    } else {
      console.log(`  ℹ️  Aucune traduction à récupérer`);
    }
    
  } catch (error) {
    console.error(`  ❌ Erreur avec ${locale}: ${error.message}`);
  }
});

console.log('\n✨ Terminé!');
console.log('Les fichiers translation_old.json peuvent maintenant être supprimés.');