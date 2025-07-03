// fix-en-tzfng-translations.cjs
const fs = require('fs');
const path = require('path');

// Traductions manquantes pour l'anglais et le tifinagh
const missingTranslations = {
  'en': {
    // Professionnels
    'home.professionals.title': 'For professionals',
    'home.professionals.subtitle': 'Join our community of artists and craftspeople',
    'home.professionals.createWork': 'Create a work',
    'home.professionals.organizeEvent': 'Organize an event',
    'home.professionals.benefits': 'Get better visibility for your works and events',
    
    // Heritage
    'sections.heritage.noResults': 'No results',
    'sections.heritage.seeAll': 'See all',
    
    // Autres clés potentiellement manquantes
    'common.backToDashboard': 'Back to dashboard',
    'common.chooseFile': 'Choose file',
    'common.chooseFiles': 'Choose files',
    'common.city': 'City',
    'common.dragDropImage': 'Drag and drop image here',
    'common.featureInDevelopment': 'This feature is under development',
    'common.imageFormats': 'Supported formats: JPG, PNG, GIF',
    'common.invalidDate': 'Invalid date',
    'common.noDescription': 'No description',
    'common.selectCity': 'Select city',
    'common.selectType': 'Select type',
    'common.viewAll': 'View all'
  },
  'tz-tfng': {
    // Professionnels
    'home.professionals.title': 'ⵉ ⵢⵉⵎⴰⵀⵉⵍⴻⵏ',
    'home.professionals.subtitle': 'ⵔⵏⵓ ⵖⴻⵔ ⵜⴻⴳⵔⴰⵡⵜ-ⵏⵏⴻⵖ ⵏ ⵉⵏⴰⵥⵓⵔⴻⵏ ⴷ ⵉⵎⴰⵀⵉⵍⴻⵏ',
    'home.professionals.createWork': 'ⵙⵏⵓⵍⴼⵓ-ⴷ ⵜⴰⵡⵓⵔⵉ',
    'home.professionals.organizeEvent': 'ⵙⵓⴷⴷⴻⵙ ⵜⴰⴷⵢⴰⵏⵜ',
    'home.professionals.benefits': 'ⴼⴰⵕⴻⵚ ⵙⴻⴳ ⵡⵓⴳⴰⵔ ⵏ ⵟⵟⵎⴻⵄ ⵉ ⵍⴻⵅⴷⴰⵎ-ⵉⴽ ⴷ ⵜⴻⴷⵢⴰⵏⵉⵏ-ⵉⴽ',
    
    // Heritage
    'sections.heritage.noResults': 'ⵓⵍⴰⵛ ⵉⴳⵎⴰⴹ',
    'sections.heritage.seeAll': 'ⵡⴰⵍⵉ ⴰⴽⴽ',
    
    // Common
    'common.backToDashboard': 'ⴰⵖⵓⵍ ⵖⴻⵔ ⵜⴰⴼⴻⵍⵡⵉⵜ',
    'common.chooseFile': 'ⴼⵔⴻⵏ ⴰⴼⴰⵢⵍⵓ',
    'common.chooseFiles': 'ⴼⵔⴻⵏ ⵉⴼⴰⵢⵍⵓⵜⴻⵏ',
    'common.city': 'ⵜⴰⵎⴷⵉⵏⵜ',
    'common.dragDropImage': 'ⵙⵓⵖⴻⴷ ⵜⴻⵙⵔⴻⵙⴻⴷ ⵜⵓⴳⵏⴰ ⴷⴰ',
    'common.featureInDevelopment': 'ⵜⴰⵎⴰⵀⵉⵍⵜ-ⴰ ⵜⴻⵍⵍⴰ ⴷⴻⴳ ⵓⵙⴱⵓⵖⵍⵓ',
    'common.imageFormats': 'ⵉⵎⴰⵙⴰⵍⴻⵏ ⵉⵜⵜⵡⴰⵇⴱⴰⵍⴻⵏ: JPG, PNG, GIF',
    'common.invalidDate': 'ⴰⵙⴰⴽⵓⴷ ⵓⵔ ⵉⵖⴻⴷ ⴰⵔⴰ',
    'common.noDescription': 'ⵓⵍⴰⵛ ⴰⴳⵍⴰⵎ',
    'common.selectCity': 'ⴼⵔⴻⵏ ⵜⴰⵎⴷⵉⵏⵜ',
    'common.selectType': 'ⴼⵔⴻⵏ ⴰⵏⴰⵡ',
    'common.viewAll': 'ⵡⴰⵍⵉ ⴰⴽⴽ',
    
    // Auth
    'auth.mustBeConnected': 'ⵉⵍⴰⵇ ⴰⴷ ⵜⵉⵍⵉⴷ ⵜⴻⵜⵜⵡⴰⵙⴻⵏⵜ',
    'auth.required': 'ⵉⵍⴰⵇ'
  }
};

console.log('🔧 Correction des traductions EN et TZ-TFNG...\n');

['en', 'tz-tfng'].forEach(locale => {
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  
  const file = path.join('i18n/locales', locale, 'translation.json');
  
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const translations = missingTranslations[locale];
    
    let fixed = 0;
    let checked = 0;
    
    // Parcourir toutes les traductions à corriger
    for (const [key, value] of Object.entries(translations)) {
      const keys = key.split('.');
      let obj = content;
      
      // Créer la structure si nécessaire
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      checked++;
      
      // Vérifier si la traduction doit être corrigée
      if (!obj[lastKey] || 
          obj[lastKey] === key || 
          obj[lastKey].includes('{{' + key + '}}') ||
          obj[lastKey].includes('⵿⵿')) {
        obj[lastKey] = value;
        console.log(`✅ Corrigé: ${key}`);
        fixed++;
      }
    }
    
    if (fixed > 0) {
      fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
      console.log(`\n💾 ${fixed}/${checked} traductions corrigées`);
    } else {
      console.log(`\n✅ Toutes les traductions sont déjà correctes`);
    }
    
    // Vérifier spécifiquement les clés problématiques
    console.log('\n🔍 Vérification des valeurs finales:');
    ['home.professionals.title', 'sections.heritage.noResults'].forEach(key => {
      const keys = key.split('.');
      let value = content;
      for (const k of keys) {
        value = value?.[k];
      }
      console.log(`  ${key}: "${value}"`);
    });
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
});