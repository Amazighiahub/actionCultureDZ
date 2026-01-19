// fix-all-explore-translations.cjs
const fs = require('fs');
const path = require('path');

// Traductions pour la section Explore dans toutes les langues
const exploreTranslations = {
  'ar': {
    'home.explore.title': 'استكشف',
    'home.explore.subtitle': 'اكتشف ثراء الثقافة الأمازيغية',
    'home.explore.tabs.heritage': 'التراث',
    'home.explore.tabs.map': 'الخريطة',
    'home.explore.tabs.events': 'الفعاليات',
    'home.explore.tabs.works': 'الأعمال',
    'home.explore.tabs.crafts': 'الحرف'
  },
  'fr': {
    'home.explore.title': 'Explorer',
    'home.explore.subtitle': 'Découvrez la richesse de la culture amazighe',
    'home.explore.tabs.heritage': 'Patrimoine',
    'home.explore.tabs.map': 'Carte',
    'home.explore.tabs.events': 'Événements',
    'home.explore.tabs.works': 'Œuvres',
    'home.explore.tabs.crafts': 'Artisanat'
  },
  'en': {
    'home.explore.title': 'Explore',
    'home.explore.subtitle': 'Discover the richness of Amazigh culture',
    'home.explore.tabs.heritage': 'Heritage',
    'home.explore.tabs.map': 'Map',
    'home.explore.tabs.events': 'Events',
    'home.explore.tabs.works': 'Works',
    'home.explore.tabs.crafts': 'Crafts'
  },
  'tz-ltn': {
    'home.explore.title': 'Snirem',
    'home.explore.subtitle': 'Af aɣlad n yidles amaziɣ',
    'home.explore.tabs.heritage': 'Agemmay',
    'home.explore.tabs.map': 'Takarḍa',
    'home.explore.tabs.events': 'Tidyanin',
    'home.explore.tabs.works': 'Tiẓuriyin',
    'home.explore.tabs.crafts': 'Tiḥuna'
  },
  'tz-tfng': {
    'home.explore.title': 'ⵙⵏⵉⵔⴻⵎ',
    'home.explore.subtitle': 'ⴰⴼ ⴰⵖⵍⴰⴷ ⵏ ⵢⵉⴷⵍⴻⵙ ⴰⵎⴰⵣⵉⵖ',
    'home.explore.tabs.heritage': 'ⴰⴳⴻⵎⵎⴰⵢ',
    'home.explore.tabs.map': 'ⵜⴰⴽⴰⵔⴹⴰ',
    'home.explore.tabs.events': 'ⵜⵉⴷⵢⴰⵏⵉⵏ',
    'home.explore.tabs.works': 'ⵜⵉⵥⵓⵔⵉⵢⵉⵏ',
    'home.explore.tabs.crafts': 'ⵜⵉⵃⵓⵏⴰ'
  }
};

console.log('🔧 Correction des traductions Explore pour toutes les langues...\n');

const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];
let totalFixed = 0;

locales.forEach(locale => {
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  
  const file = path.join('i18n/locales', locale, 'translation.json');
  
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const translations = exploreTranslations[locale];
    
    let fixed = 0;
    let alreadyOk = 0;
    
    // Assurer la structure
    if (!content.home) content.home = {};
    if (!content.home.explore) content.home.explore = {};
    if (!content.home.explore.tabs) content.home.explore.tabs = {};
    
    // Vérifier et corriger chaque traduction
    for (const [key, value] of Object.entries(translations)) {
      const keys = key.split('.');
      let obj = content;
      
      // Naviguer jusqu'à l'avant-dernière clé
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      
      // Vérifier si la traduction existe et est correcte
      if (!obj[lastKey] || obj[lastKey].includes('{{')) {
        obj[lastKey] = value;
        console.log(`✅ Corrigé: ${key} = "${value}"`);
        fixed++;
      } else if (obj[lastKey] === value) {
        alreadyOk++;
      } else {
        console.log(`ℹ️  Existe avec valeur différente: ${key}`);
        console.log(`    Actuel: "${obj[lastKey]}"`);
        console.log(`    Proposé: "${value}"`);
        // On remplace quand même pour assurer la cohérence
        obj[lastKey] = value;
        fixed++;
      }
    }
    
    if (fixed > 0) {
      fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
      console.log(`\n💾 ${fixed} traductions corrigées`);
      totalFixed += fixed;
    } else {
      console.log(`\n✅ Toutes les traductions Explore sont correctes (${alreadyOk} vérifiées)`);
    }
    
    // Vérifier spécifiquement les clés problématiques
    console.log('\n🔍 Vérification des valeurs actuelles:');
    const keysToCheck = Object.keys(translations);
    keysToCheck.forEach(key => {
      const keys = key.split('.');
      let value = content;
      for (const k of keys) {
        value = value?.[k];
      }
      console.log(`  ${key}: ${value ? `"${value}"` : 'MANQUANT'}`);
    });
    
  } catch (error) {
    console.error(`❌ Erreur pour ${locale}: ${error.message}`);
  }
});

console.log(`\n✅ Total: ${totalFixed} traductions corrigées!`);

// Vérifier l'état final
console.log('\n📊 État final des traductions Explore:');
locales.forEach(locale => {
  const file = path.join('i18n/locales', locale, 'translation.json');
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const exploreSection = content.home?.explore;
    
    if (exploreSection) {
      console.log(`\n${locale.toUpperCase()}:`);
      console.log(`  title: "${exploreSection.title || 'MANQUANT'}"`);
      console.log(`  subtitle: "${exploreSection.subtitle || 'MANQUANT'}"`);
      console.log(`  tabs: ${exploreSection.tabs ? Object.keys(exploreSection.tabs).length + ' onglets' : 'MANQUANT'}`);
    } else {
      console.log(`\n${locale.toUpperCase()}: Section explore MANQUANTE`);
    }
  } catch (error) {
    console.log(`\n${locale.toUpperCase()}: Erreur de lecture`);
  }
});