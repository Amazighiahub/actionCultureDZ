#!/usr/bin/env node
/**
 * Script d'analyse complète des traductions pour TOUT le projet
 * Vérifie que toutes les clés utilisées dans le code existent dans tous les fichiers de traduction
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');
const srcDir = path.join(__dirname, '..', 'src');
const languages = ['fr', 'en', 'ar', 'tz-ltn', 'tz-tfng'];

console.log('\n🔍 Analyse complète des traductions du projet EventCulture\n');
console.log('='.repeat(80));

// 1. Charger toutes les traductions
const translations = {};
languages.forEach(lang => {
  const translationPath = path.join(localesDir, lang, 'translation.json');
  try {
    const content = fs.readFileSync(translationPath, 'utf-8');
    translations[lang] = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${lang}:`, error.message);
    translations[lang] = {};
  }
});

// 2. Fonction pour obtenir toutes les clés d'un objet de manière récursive
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 3. Obtenir toutes les clés disponibles par langue
const availableKeys = {};
languages.forEach(lang => {
  availableKeys[lang] = getAllKeys(translations[lang]);
});

console.log('\n📊 Clés disponibles par langue:\n');
languages.forEach(lang => {
  console.log(`  ${lang.toUpperCase().padEnd(10)} - ${availableKeys[lang].length} clés`);
});

// 4. Extraire toutes les clés utilisées dans le code source
console.log('\n\n🔎 Extraction des clés utilisées dans le code...\n');

let usedKeysRaw = [];
try {
  // Chercher tous les appels t() dans les fichiers .tsx et .ts
  const grepCommand = `cd "${srcDir}" && grep -r "t('" . --include="*.tsx" --include="*.ts" || true`;
  const output = execSync(grepCommand, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

  // Parser les résultats
  const lines = output.split('\n');
  const keyRegex = /t\(['"]([\w.]+)['"](?:,|\))/g;

  lines.forEach(line => {
    let match;
    while ((match = keyRegex.exec(line)) !== null) {
      usedKeysRaw.push(match[1]);
    }
  });
} catch (error) {
  console.error('Erreur lors de l\'extraction:', error.message);
}

// Dédupliquer et trier
const usedKeys = [...new Set(usedKeysRaw)].sort();

console.log(`✅ ${usedKeys.length} clés uniques trouvées dans le code\n`);

// 5. Analyser les clés par section
const keysBySection = {};
usedKeys.forEach(key => {
  const section = key.split('.')[0];
  if (!keysBySection[section]) {
    keysBySection[section] = [];
  }
  keysBySection[section].push(key);
});

console.log('📑 Répartition par section:\n');
Object.entries(keysBySection)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([section, keys]) => {
    console.log(`  ${section.padEnd(20)} - ${keys.length} clés`);
  });

// 6. Vérifier les clés manquantes par langue
console.log('\n\n❌ Clés manquantes par langue:\n');

const missingByLang = {};
let totalMissing = 0;

languages.forEach(lang => {
  const missing = [];
  usedKeys.forEach(key => {
    if (!availableKeys[lang].includes(key)) {
      missing.push(key);
      totalMissing++;
    }
  });

  if (missing.length > 0) {
    missingByLang[lang] = missing;
    console.log(`\n${lang.toUpperCase()} - ${missing.length} clés manquantes:`);

    // Grouper par section
    const bySection = {};
    missing.forEach(key => {
      const section = key.split('.')[0];
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(key);
    });

    Object.entries(bySection).forEach(([section, keys]) => {
      console.log(`\n  ${section}:`);
      keys.slice(0, 10).forEach(key => console.log(`    - ${key}`));
      if (keys.length > 10) {
        console.log(`    ... et ${keys.length - 10} autres`);
      }
    });
  } else {
    console.log(`\n✅ ${lang.toUpperCase()} - Aucune clé manquante`);
  }
});

// 7. Vérifier les clés inutilisées (présentes dans les traductions mais pas dans le code)
console.log('\n\n⚠️  Clés inutilisées (dans les traductions mais pas dans le code):\n');

languages.forEach(lang => {
  const unused = availableKeys[lang].filter(key => !usedKeys.includes(key));

  if (unused.length > 0) {
    console.log(`\n${lang.toUpperCase()} - ${unused.length} clés inutilisées`);

    // Grouper par section
    const bySection = {};
    unused.forEach(key => {
      const section = key.split('.')[0];
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(key);
    });

    // Afficher seulement les sections avec beaucoup de clés inutilisées
    Object.entries(bySection)
      .filter(([, keys]) => keys.length > 5)
      .forEach(([section, keys]) => {
        console.log(`  ${section}: ${keys.length} clés`);
      });
  }
});

// 8. Vérifier la cohérence entre langues
console.log('\n\n🔄 Cohérence entre langues:\n');

const baseLang = 'fr';
const baseKeys = availableKeys[baseLang];

languages.forEach(lang => {
  if (lang === baseLang) return;

  const missing = baseKeys.filter(key => !availableKeys[lang].includes(key));
  const extra = availableKeys[lang].filter(key => !baseKeys.includes(key));

  if (missing.length > 0 || extra.length > 0) {
    console.log(`\n${lang.toUpperCase()} vs ${baseLang.toUpperCase()}:`);
    if (missing.length > 0) {
      console.log(`  ⚠️  ${missing.length} clés manquantes par rapport à ${baseLang.toUpperCase()}`);
    }
    if (extra.length > 0) {
      console.log(`  ℹ️  ${extra.length} clés en plus par rapport à ${baseLang.toUpperCase()}`);
    }
  } else {
    console.log(`✅ ${lang.toUpperCase()} - Parfaitement synchronisé avec ${baseLang.toUpperCase()}`);
  }
});

// 9. Résumé final
console.log('\n\n' + '='.repeat(80));
console.log('\n📈 RÉSUMÉ GLOBAL:\n');

console.log(`Total de clés utilisées dans le code: ${usedKeys.length}`);
console.log(`Total de clés manquantes: ${totalMissing}`);
console.log(`Sections principales: ${Object.keys(keysBySection).length}`);

if (totalMissing === 0) {
  console.log('\n✅ EXCELLENT! Toutes les clés utilisées sont traduites dans toutes les langues!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ATTENTION! ${totalMissing} traductions manquantes à ajouter.\n`);

  // Générer un fichier de rapport
  const reportPath = path.join(__dirname, '..', 'missing-translations-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(missingByLang, null, 2), 'utf-8');
  console.log(`📄 Rapport détaillé sauvegardé dans: ${reportPath}\n`);

  process.exit(1);
}
