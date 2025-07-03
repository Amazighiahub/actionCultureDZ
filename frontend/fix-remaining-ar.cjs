// fix-remaining-ar.cjs
const fs = require('fs');
const path = require('path');

// Les 13 dernières traductions manquantes
const translations = {
  // Contributors - formes plurielles manquantes
  "contributors.addedCount_few": "تمت إضافة {{count}} مساهمين",
  "contributors.addedCount_many": "تمت إضافة {{count}} مساهماً", 
  "contributors.addedCount_other": "تمت إضافة {{count}} مساهم",
  
  // Notifications - formes plurielles manquantes
  "notifications.youHave_few": "لديك {{count}} إشعارات",
  "notifications.youHave_many": "لديك {{count}} إشعاراً",
  "notifications.youHave_other": "لديك {{count}} إشعار",
  
  // Publishers - formes plurielles manquantes
  "publishers.addedCount_few": "تمت إضافة {{count}} ناشرين",
  "publishers.addedCount_many": "تمت إضافة {{count}} ناشراً",
  "publishers.addedCount_other": "تمت إضافة {{count}} ناشر",
  
  // Sections crafts
  "sections.crafts.price.range": "{{min}} - {{max}}", // Garder tel quel car c'est un format
  "sections.crafts.stock.inStock_few": "{{count}} قطع متوفرة",
  "sections.crafts.stock.inStock_many": "{{count}} قطعة متوفرة",
  "sections.crafts.stock.inStock_other": "{{count}} قطعة متوفرة"
};

console.log('🔧 Correction des dernières traductions arabes...\n');

const file = path.join('i18n/locales/ar/translation.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));

let applied = 0;

// Fonction pour naviguer dans l'objet et appliquer les traductions
function applyFix(obj, path = '') {
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      // Si c'est une des clés à corriger
      if (translations[currentPath] && (obj[key].includes('{{') || obj[key].includes('⵿⵿'))) {
        obj[key] = translations[currentPath];
        console.log(`✅ ${currentPath}: "${translations[currentPath]}"`);
        applied++;
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      applyFix(obj[key], currentPath);
    }
  }
}

applyFix(content);

if (applied > 0) {
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  console.log(`\n✅ ${applied} traductions corrigées et sauvegardées!`);
}

// Vérification finale
console.log('\n📊 Vérification finale après correction:');
let remaining = [];

function checkRemaining(obj, path = '') {
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      if (obj[key].includes('{{') && !obj[key].includes('{{count}}') && !obj[key].includes('{{min}}') && !obj[key].includes('{{max}}')) {
        remaining.push({
          key: currentPath,
          value: obj[key]
        });
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      checkRemaining(obj[key], currentPath);
    }
  }
}

checkRemaining(content);

if (remaining.length > 0) {
  console.log(`\n⚠️  Il reste ${remaining.length} clés avec des placeholders (hors variables):`)
  remaining.slice(0, 20).forEach(item => {
    console.log(`  - ${item.key}: "${item.value}"`);
  });
  if (remaining.length > 20) {
    console.log(`  ... et ${remaining.length - 20} autres`);
  }
} else {
  console.log('\n✅ Toutes les traductions obligatoires sont complétées!');
}

// Statistiques finales
let stats = { total: 0, translated: 0, untranslated: 0 };

function countStats(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      stats.total++;
      // Ne pas compter les placeholders de variables comme non traduits
      if (obj[key].includes('{{') && !obj[key].includes('{{count}}') && !obj[key].includes('{{min}}') && !obj[key].includes('{{max}}') && !obj[key].includes('{{name}}')) {
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

console.log(`\n📈 Résultat final:`);
console.log(`Total: ${stats.total} clés`);
console.log(`✅ Traduites: ${stats.translated} (${Math.round(stats.translated/stats.total*100)}%)`);
console.log(`⚠️  Non traduites (vraies): ${stats.untranslated} (${Math.round(stats.untranslated/stats.total*100)}%)`);