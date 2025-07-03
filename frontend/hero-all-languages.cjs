// hero-all-languages.cjs
const fs = require('fs');
const path = require('path');

// Traductions pour la section Hero dans toutes les langues
const translations = {
  'ar': {
    "sections.hero.title": "مرحباً بكم في",
    "sections.hero.titleHighlight": "تمليليت ثقافة",
    "sections.hero.subtitle": "منصة رقمية مخصصة للحفاظ على التراث الثقافي الأمازيغي وتعزيزه",
    "sections.hero.cta.learnMore": "اعرف المزيد",
    "sections.hero.cta.explore": "استكشف المنصة",
    "sections.hero.quickActions.title": "اكتشف ثقافتنا",
    "sections.hero.quickActions.discover.title": "اكتشف التراث",
    "sections.hero.quickActions.discover.description": "استكشف المواقع التاريخية والمعالم الثقافية",
    "sections.hero.quickActions.events.title": "الفعاليات القادمة",
    "sections.hero.quickActions.events.description": "شارك في الأحداث والاحتفالات الثقافية",
    "sections.hero.quickActions.works.title": "الأعمال الفنية",
    "sections.hero.quickActions.works.description": "اكتشف الإبداعات الفنية والأدبية الأمازيغية"
  },
  'fr': {
    "sections.hero.title": "Bienvenue sur",
    "sections.hero.titleHighlight": "Tamlilit Culture",
    "sections.hero.subtitle": "Plateforme numérique dédiée à la préservation et à la valorisation du patrimoine culturel amazigh",
    "sections.hero.cta.learnMore": "En savoir plus",
    "sections.hero.cta.explore": "Explorer la plateforme",
    "sections.hero.quickActions.title": "Découvrez notre culture",
    "sections.hero.quickActions.discover.title": "Découvrir le patrimoine",
    "sections.hero.quickActions.discover.description": "Explorez les sites historiques et les monuments culturels",
    "sections.hero.quickActions.events.title": "Événements à venir",
    "sections.hero.quickActions.events.description": "Participez aux événements et célébrations culturelles",
    "sections.hero.quickActions.works.title": "Œuvres artistiques",
    "sections.hero.quickActions.works.description": "Découvrez les créations artistiques et littéraires amazighes"
  },
  'en': {
    "sections.hero.title": "Welcome to",
    "sections.hero.titleHighlight": "Tamlilit Culture",
    "sections.hero.subtitle": "Digital platform dedicated to preserving and promoting Amazigh cultural heritage",
    "sections.hero.cta.learnMore": "Learn more",
    "sections.hero.cta.explore": "Explore platform",
    "sections.hero.quickActions.title": "Discover our culture",
    "sections.hero.quickActions.discover.title": "Discover heritage",
    "sections.hero.quickActions.discover.description": "Explore historical sites and cultural monuments",
    "sections.hero.quickActions.events.title": "Upcoming events",
    "sections.hero.quickActions.events.description": "Participate in cultural events and celebrations",
    "sections.hero.quickActions.works.title": "Artistic works",
    "sections.hero.quickActions.works.description": "Discover Amazigh artistic and literary creations"
  },
  'tz-ltn': {
    "sections.hero.title": "Azul deg",
    "sections.hero.titleHighlight": "Tamlilit Tadelsant",
    "sections.hero.subtitle": "Tafrant tumḍint i uḥraz d usnerni n ugemmay adelsan amaziɣ",
    "sections.hero.cta.learnMore": "Ẓer ugar",
    "sections.hero.cta.explore": "Snirem tafrant",
    "sections.hero.quickActions.title": "Af tadelsant-nneɣ",
    "sections.hero.quickActions.discover.title": "Af agemmay",
    "sections.hero.quickActions.discover.description": "Snirem adɣaren n umezruy d isemḍal idelsanen",
    "sections.hero.quickActions.events.title": "Tidyanin i d-iteddun",
    "sections.hero.quickActions.events.description": "Ttekki deg tedyanin d tmeɣriwin tidelsanin",
    "sections.hero.quickActions.works.title": "Tiẓuriyin",
    "sections.hero.quickActions.works.description": "Af tisnulfuyin tiẓuranin d tseklanin timaziɣin"
  },
  'tz-tfng': {
    "sections.hero.title": "ⴰⵣⵓⵍ ⴷⴻⴳ",
    "sections.hero.titleHighlight": "ⵜⴰⵎⵍⵉⵍⵉⵜ ⵜⴰⴷⴻⵍⵙⴰⵏⵜ",
    "sections.hero.subtitle": "ⵜⴰⴼⵔⴰⵏⵜ ⵜⵓⵎⴹⵉⵏⵜ ⵉ ⵓⵃⵔⴰⵣ ⴷ ⵓⵙⵏⴻⵔⵏⵉ ⵏ ⵓⴳⴻⵎⵎⴰⵢ ⴰⴷⴻⵍⵙⴰⵏ ⴰⵎⴰⵣⵉⵖ",
    "sections.hero.cta.learnMore": "ⵥⴻⵔ ⵓⴳⴰⵔ",
    "sections.hero.cta.explore": "ⵙⵏⵉⵔⴻⵎ ⵜⴰⴼⵔⴰⵏⵜ",
    "sections.hero.quickActions.title": "ⴰⴼ ⵜⴰⴷⴻⵍⵙⴰⵏⵜ-ⵏⵏⴻⵖ",
    "sections.hero.quickActions.discover.title": "ⴰⴼ ⴰⴳⴻⵎⵎⴰⵢ",
    "sections.hero.quickActions.discover.description": "ⵙⵏⵉⵔⴻⵎ ⴰⴷⵖⴰⵔⴻⵏ ⵏ ⵓⵎⴻⵣⵔⵓⵢ ⴷ ⵉⵙⴻⵎⴹⴰⵍ ⵉⴷⴻⵍⵙⴰⵏⴻⵏ",
    "sections.hero.quickActions.events.title": "ⵜⵉⴷⵢⴰⵏⵉⵏ ⵉ ⴷ-ⵉⵜⴻⴷⴷⵓⵏ",
    "sections.hero.quickActions.events.description": "ⵜⵜⴻⴽⴽⵉ ⴷⴻⴳ ⵜⴻⴷⵢⴰⵏⵉⵏ ⴷ ⵜⵎⴻⵖⵔⵉⵡⵉⵏ ⵜⵉⴷⴻⵍⵙⴰⵏⵉⵏ",
    "sections.hero.quickActions.works.title": "ⵜⵉⵥⵓⵔⵉⵢⵉⵏ",
    "sections.hero.quickActions.works.description": "ⴰⴼ ⵜⵉⵙⵏⵓⵍⴼⵓⵢⵉⵏ ⵜⵉⵥⵓⵔⴰⵏⵉⵏ ⴷ ⵜⵙⴻⴽⵍⴰⵏⵉⵏ ⵜⵉⵎⴰⵣⵉⵖⵉⵏ"
  }
};

console.log('🌍 Application des traductions Hero pour toutes les langues...\n');

const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];
let totalApplied = 0;

locales.forEach(locale => {
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  
  const file = path.join('i18n/locales', locale, 'translation.json');
  
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const localeTranslations = translations[locale];
    
    let applied = 0;
    
    // Assurer la structure
    if (!content.sections) content.sections = {};
    if (!content.sections.hero) content.sections.hero = {};
    if (!content.sections.hero.quickActions) content.sections.hero.quickActions = {};
    if (!content.sections.hero.quickActions.discover) content.sections.hero.quickActions.discover = {};
    if (!content.sections.hero.quickActions.events) content.sections.hero.quickActions.events = {};
    if (!content.sections.hero.quickActions.works) content.sections.hero.quickActions.works = {};
    if (!content.sections.hero.cta) content.sections.hero.cta = {};
    
    // Appliquer les traductions
    for (const [key, value] of Object.entries(localeTranslations)) {
      const keys = key.split('.');
      let obj = content;
      
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      
      if (!obj[lastKey] || obj[lastKey].includes('{{')) {
        obj[lastKey] = value;
        console.log(`✅ ${key}`);
        applied++;
      }
    }
    
    if (applied > 0) {
      fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
      console.log(`💾 ${applied} traductions appliquées`);
      totalApplied += applied;
    } else {
      console.log('ℹ️  Toutes les traductions Hero sont déjà présentes');
    }
    
  } catch (error) {
    console.error(`❌ Erreur pour ${locale}: ${error.message}`);
  }
});

console.log(`\n✅ Total: ${totalApplied} traductions appliquées dans toutes les langues!`);