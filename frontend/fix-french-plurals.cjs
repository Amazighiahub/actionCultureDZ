// fix-french-plurals.cjs
const fs = require('fs');
const path = require('path');

console.log('🔧 Suppression des formes "many" non nécessaires en français...\n');

const file = path.join('i18n/locales/fr/translation.json');

try {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  let removed = 0;
  
  // Fonction pour parcourir et supprimer les clés _many
  function removeManyForms(obj, path = '') {
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (key.endsWith('_many')) {
        // Supprimer la forme _many car elle n'existe pas en français
        delete obj[key];
        console.log(`🗑️  Supprimé: ${fullPath}`);
        removed++;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        removeManyForms(obj[key], fullPath);
      }
    }
  }
  
  removeManyForms(content);
  
  if (removed > 0) {
    fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
    console.log(`\n✅ ${removed} formes "many" supprimées`);
  }
  
  // Vérifier les clés manquantes depuis l'image
  console.log('\n🔍 Vérification des clés visibles dans l\'interface:');
  
  const keysToCheck = [
    'sections.heritage.noResults',
    'sections.heritage.seeAll',
    'home.professionals.title',
    'home.professionals.subtitle',
    'home.professionals.createWork',
    'home.professionals.organizeEvent',
    'home.professionals.benefits'
  ];
  
  keysToCheck.forEach(key => {
    const keys = key.split('.');
    let value = content;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (value) {
      console.log(`✅ ${key}: "${value}"`);
    } else {
      console.log(`❌ ${key}: MANQUANT`);
    }
  });
  
  // Statistiques finales
  console.log('\n📊 Statistiques finales:');
  let stats = { total: 0, translated: 0, untranslated: 0 };
  
  function countStats(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        stats.total++;
        if (obj[key].includes('{{') && 
            !obj[key].includes('{{count}}') && 
            !obj[key].includes('{{min}}') && 
            !obj[key].includes('{{max}}') && 
            !obj[key].includes('{{name}}') &&
            !obj[key].includes('{{minutes}}')) {
          stats.untranslated++;
        } else {
          stats.translated++;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        countStats(obj[key]);
      }
    }
  }
  
  countStats(content);
  
  console.log(`Total: ${stats.total} clés`);
  console.log(`✅ Traduites: ${stats.translated} (${Math.round(stats.translated/stats.total*100)}%)`);
  console.log(`⚠️  Non traduites: ${stats.untranslated} (${Math.round(stats.untranslated/stats.total*100)}%)`);
  
} catch (error) {
  console.error(`❌ Erreur: ${error.message}`);
}