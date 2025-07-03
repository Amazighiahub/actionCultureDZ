// smart-recover-translations.cjs
const fs = require('fs');
const path = require('path');

const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

console.log('🔄 Récupération intelligente des traductions...\n');

// D'abord, construire un dictionnaire de toutes les traductions de l'ancien fichier
locales.forEach(locale => {
  console.log(`\n📁 ${locale.toUpperCase()}`);
  
  const newFile = path.join('i18n/locales', locale, 'translation.json');
  const oldFile = path.join('i18n/locales', locale, 'translation_old.json');
  
  try {
    const newTranslations = JSON.parse(fs.readFileSync(newFile, 'utf8'));
    const oldTranslations = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
    
    // Créer un dictionnaire plat de toutes les anciennes traductions
    const oldFlat = {};
    function flattenOld(obj, prefix = '') {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'string' && 
            obj[key] && 
            !obj[key].includes('{{') && 
            !obj[key].includes('⵿⵿')) {
          oldFlat[fullKey] = obj[key];
          // Aussi stocker avec juste la dernière partie de la clé
          oldFlat[key] = obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          flattenOld(obj[key], fullKey);
        }
      }
    }
    flattenOld(oldTranslations);
    
    console.log(`  Trouvé ${Object.keys(oldFlat).length} traductions dans l'ancien fichier`);
    
    // Maintenant parcourir le nouveau fichier et chercher des correspondances
    let recoveredCount = 0;
    let attemptedCount = 0;
    
    function recoverNew(obj, prefix = '') {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'string') {
          if (obj[key].includes('{{') || obj[key].includes('⵿⵿')) {
            attemptedCount++;
            
            // Essayer plusieurs stratégies pour trouver la traduction
            let found = false;
            
            // 1. Chercher avec la clé complète
            if (oldFlat[fullKey]) {
              obj[key] = oldFlat[fullKey];
              console.log(`  ✓ Récupéré par clé complète: ${fullKey}`);
              recoveredCount++;
              found = true;
            }
            // 2. Chercher avec juste le dernier segment
            else if (oldFlat[key]) {
              obj[key] = oldFlat[key];
              console.log(`  ✓ Récupéré par clé simple: ${key}`);
              recoveredCount++;
              found = true;
            }
            // 3. Chercher des variations de la clé
            else {
              // Essayer sans le préfixe du namespace
              const keyParts = fullKey.split('.');
              for (let i = 1; i < keyParts.length; i++) {
                const partialKey = keyParts.slice(i).join('.');
                if (oldFlat[partialKey]) {
                  obj[key] = oldFlat[partialKey];
                  console.log(`  ✓ Récupéré par clé partielle: ${partialKey}`);
                  recoveredCount++;
                  found = true;
                  break;
                }
              }
            }
            
            if (!found && attemptedCount <= 5) {
              console.log(`  ⚠️  Pas trouvé: ${fullKey}`);
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          recoverNew(obj[key], fullKey);
        }
      }
    }
    
    recoverNew(newTranslations);
    
    if (recoveredCount > 0) {
      fs.writeFileSync(newFile, JSON.stringify(newTranslations, null, 2), 'utf8');
      console.log(`  ✅ ${recoveredCount}/${attemptedCount} traductions récupérées et sauvegardées`);
    } else {
      console.log(`  ℹ️  Aucune correspondance trouvée sur ${attemptedCount} tentatives`);
      
      // Montrer quelques exemples de ce qui n'a pas matché
      console.log(`\n  Exemples de clés non matchées:`);
      let count = 0;
      function showUnmatched(obj, prefix = '') {
        for (const key in obj) {
          if (count >= 5) return;
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'string' && (obj[key].includes('{{') || obj[key].includes('⵿⵿'))) {
            console.log(`    - Nouveau: "${fullKey}"`);
            count++;
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            showUnmatched(obj[key], fullKey);
          }
        }
      }
      showUnmatched(newTranslations);
      
      console.log(`\n  Exemples de traductions disponibles:`);
      const oldKeys = Object.keys(oldFlat).filter(k => !k.includes('.')).slice(0, 5);
      oldKeys.forEach(k => {
        console.log(`    - Ancien: "${k}" = "${oldFlat[k]}"`);
      });
    }
    
  } catch (error) {
    console.error(`  ❌ Erreur: ${error.message}`);
  }
});

console.log('\n✨ Terminé!');