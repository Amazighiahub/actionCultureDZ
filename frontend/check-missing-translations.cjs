// check-missing-translations.cjs
const fs = require('fs');
const path = require('path');

// Traductions potentiellement manquantes d'après l'image
const missingTranslations = {
  'fr': {
    'sections.heritage.noResults': 'Aucun résultat',
    'sections.heritage.seeAll': 'Voir tout',
    'home.professionals.title': 'Pour les professionnels',
    'home.professionals.subtitle': 'Rejoignez notre communauté d\'artistes et d\'artisans',
    'home.professionals.createWork': 'Créer une œuvre',
    'home.professionals.organizeEvent': 'Organiser un événement',
    'home.professionals.benefits': 'Bénéficiez d\'une meilleure visibilité pour vos œuvres et événements'
  },
  'ar': {
    'sections.heritage.noResults': 'لا توجد نتائج',
    'sections.heritage.seeAll': 'عرض الكل',
    'home.professionals.title': 'للمحترفين',
    'home.professionals.subtitle': 'انضم إلى مجتمعنا من الفنانين والحرفيين',
    'home.professionals.createWork': 'أنشئ عملاً',
    'home.professionals.organizeEvent': 'نظم فعالية',
    'home.professionals.benefits': 'استفد من رؤية أكبر لأعمالك وفعالياتك'
  },
  'en': {
    'sections.heritage.noResults': 'No results',
    'sections.heritage.seeAll': 'See all',
    'home.professionals.title': 'For professionals',
    'home.professionals.subtitle': 'Join our community of artists and craftspeople',
    'home.professionals.createWork': 'Create a work',
    'home.professionals.organizeEvent': 'Organize an event',
    'home.professionals.benefits': 'Get better visibility for your works and events'
  },
  'tz-ltn': {
    'sections.heritage.noResults': 'Ulac igmaḍ',
    'sections.heritage.seeAll': 'Wali akk',
    'home.professionals.title': 'I yimahilen',
    'home.professionals.subtitle': 'Rnu ɣer tegrawt-nneɣ n inaẓuren d imahilen',
    'home.professionals.createWork': 'Snulfu-d tawuri',
    'home.professionals.organizeEvent': 'Suddes tadyant',
    'home.professionals.benefits': 'Faṛeṣ seg wugar n ṭṭmeɛ i leḫdam-ik d tedyanin-ik'
  },
  'tz-tfng': {
    'sections.heritage.noResults': 'ⵓⵍⴰⵛ ⵉⴳⵎⴰⴹ',
    'sections.heritage.seeAll': 'ⵡⴰⵍⵉ ⴰⴽⴽ',
    'home.professionals.title': 'ⵉ ⵢⵉⵎⴰⵀⵉⵍⴻⵏ',
    'home.professionals.subtitle': 'ⵔⵏⵓ ⵖⴻⵔ ⵜⴻⴳⵔⴰⵡⵜ-ⵏⵏⴻⵖ ⵏ ⵉⵏⴰⵥⵓⵔⴻⵏ ⴷ ⵉⵎⴰⵀⵉⵍⴻⵏ',
    'home.professionals.createWork': 'ⵙⵏⵓⵍⴼⵓ-ⴷ ⵜⴰⵡⵓⵔⵉ',
    'home.professionals.organizeEvent': 'ⵙⵓⴷⴷⴻⵙ ⵜⴰⴷⵢⴰⵏⵜ',
    'home.professionals.benefits': 'ⴼⴰⵕⴻⵚ ⵙⴻⴳ ⵡⵓⴳⴰⵔ ⵏ ⵟⵟⵎⴻⵄ ⵉ ⵍⴻⵅⴷⴰⵎ-ⵉⴽ ⴷ ⵜⴻⴷⵢⴰⵏⵉⵏ-ⵉⴽ'
  }
};

console.log('🔍 Vérification et ajout des traductions manquantes...\n');

const locales = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

locales.forEach(locale => {
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  
  const file = path.join('i18n/locales', locale, 'translation.json');
  
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const toAdd = missingTranslations[locale];
    
    let added = 0;
    let exists = 0;
    
    for (const [key, value] of Object.entries(toAdd)) {
      const keys = key.split('.');
      let obj = content;
      
      // Créer la structure si nécessaire
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      
      if (!obj[lastKey] || obj[lastKey].includes('{{')) {
        obj[lastKey] = value;
        console.log(`✅ Ajouté: ${key}`);
        added++;
      } else {
        console.log(`ℹ️  Existe déjà: ${key} = "${obj[lastKey]}"`);
        exists++;
      }
    }
    
    if (added > 0) {
      fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
      console.log(`💾 ${added} traductions ajoutées`);
    }
    
    console.log(`📊 Résumé: ${added} ajoutées, ${exists} existantes`);
    
  } catch (error) {
    console.error(`❌ Erreur pour ${locale}: ${error.message}`);
  }
});

console.log('\n✅ Vérification terminée!');