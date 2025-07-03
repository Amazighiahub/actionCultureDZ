// diagnose-translations-issues.cjs
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic des problèmes de traduction...\n');

const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

// Clés essentielles qui doivent être présentes
const essentialKeys = [
  'home.explore.title',
  'home.explore.subtitle',
  'home.explore.tabs.heritage',
  'home.explore.tabs.map',
  'home.explore.tabs.events',
  'home.explore.tabs.works',
  'home.explore.tabs.crafts',
  'home.professionals.title',
  'home.professionals.subtitle',
  'home.professionals.createWork',
  'home.professionals.organizeEvent',
  'home.professionals.benefits',
  'sections.heritage.title',
  'sections.heritage.subtitle',
  'sections.heritage.noResults',
  'sections.heritage.seeAll'
];

const report = {};

locales.forEach(locale => {
  console.log(`\n=== DIAGNOSTIC ${locale.toUpperCase()} ===`);
  report[locale] = {
    exists: false,
    valid: false,
    size: 0,
    missingKeys: [],
    untranslatedKeys: [],
    totalKeys: 0,
    translatedKeys: 0
  };
  
  const file = path.join('i18n/locales', locale, 'translation.json');
  
  // 1. Vérifier si le fichier existe
  if (!fs.existsSync(file)) {
    console.log(`❌ Fichier n'existe pas: ${file}`);
    return;
  }
  report[locale].exists = true;
  
  try {
    // 2. Lire et parser le fichier
    const content = fs.readFileSync(file, 'utf8');
    report[locale].size = content.length;
    
    let json;
    try {
      json = JSON.parse(content);
      report[locale].valid = true;
    } catch (parseError) {
      console.log(`❌ Erreur de parsing JSON: ${parseError.message}`);
      return;
    }
    
    // 3. Vérifier les clés essentielles
    console.log('\n📋 Vérification des clés essentielles:');
    essentialKeys.forEach(key => {
      const keys = key.split('.');
      let value = json;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      if (value === undefined) {
        console.log(`  ❌ ${key}: MANQUANT`);
        report[locale].missingKeys.push(key);
      } else if (typeof value === 'string' && (value.includes('{{') && !value.includes('{{count}}') && !value.includes('{{min}}'))) {
        console.log(`  ⚠️  ${key}: Non traduit ("${value}")`);
        report[locale].untranslatedKeys.push(key);
      } else {
        console.log(`  ✅ ${key}: "${value}"`);
      }
    });
    
    // 4. Compter toutes les traductions
    function countTranslations(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          report[locale].totalKeys++;
          if (!obj[key].includes('{{') || obj[key].includes('{{count}}') || obj[key].includes('{{min}}')) {
            report[locale].translatedKeys++;
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          countTranslations(obj[key]);
        }
      }
    }
    
    countTranslations(json);
    
    // 5. Résumé pour cette langue
    const percentage = Math.round((report[locale].translatedKeys / report[locale].totalKeys) * 100);
    console.log(`\n📊 Résumé:`);
    console.log(`  - Fichier valide: ${report[locale].valid ? '✅' : '❌'}`);
    console.log(`  - Taille: ${Math.round(report[locale].size / 1024)}KB`);
    console.log(`  - Total clés: ${report[locale].totalKeys}`);
    console.log(`  - Traduites: ${report[locale].translatedKeys} (${percentage}%)`);
    console.log(`  - Clés essentielles manquantes: ${report[locale].missingKeys.length}`);
    console.log(`  - Clés essentielles non traduites: ${report[locale].untranslatedKeys.length}`);
    
  } catch (error) {
    console.log(`❌ Erreur générale: ${error.message}`);
  }
});

// Rapport final
console.log('\n\n📊 RAPPORT FINAL');
console.log('================\n');

const workingLocales = [];
const brokenLocales = [];

Object.entries(report).forEach(([locale, data]) => {
  if (data.exists && data.valid && data.missingKeys.length === 0) {
    workingLocales.push(locale);
  } else {
    brokenLocales.push(locale);
  }
});

console.log(`✅ Langues fonctionnelles: ${workingLocales.join(', ') || 'Aucune'}`);
console.log(`❌ Langues avec problèmes: ${brokenLocales.join(', ') || 'Aucune'}`);

// Recommandations
console.log('\n💡 RECOMMANDATIONS:');

if (brokenLocales.length > 0) {
  console.log('\n1. Exécutez le script de correction:');
  console.log('   node fix-all-explore-translations.cjs');
  
  console.log('\n2. Si le problème persiste, vérifiez:');
  console.log('   - Le cache du navigateur (Ctrl+F5)');
  console.log('   - Le redémarrage de l\'application');
  console.log('   - Les imports dans i18n/config.js');
  
  console.log('\n3. Vérifiez que votre config i18n charge bien tous les fichiers:');
  console.log('   - Chemin correct: i18n/locales/[locale]/translation.json');
  console.log('   - Import correct dans le fichier de config');
}

// Afficher les clés manquantes par langue
console.log('\n📝 DÉTAILS DES CLÉS MANQUANTES:');
Object.entries(report).forEach(([locale, data]) => {
  if (data.missingKeys.length > 0) {
    console.log(`\n${locale.toUpperCase()}:`);
    data.missingKeys.forEach(key => console.log(`  - ${key}`));
  }
});