// extractMissingTranslations.cjs
// Script CommonJS pour extraire les clés manquantes dans la traduction Tamazight Latin

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseDir: './i18n/locales',
  referenceLanguage: 'fr', // Langue de référence (complète)
  targetLanguage: 'tz-ltn', // Langue à vérifier
  outputFile: 'missing-translations-tz-ltn.json',
  reportFile: 'missing-translations-report.txt',
  excelFile: 'missing-translations-tz-ltn.csv' // CSV au lieu d'Excel pour simplicité
};

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper pour afficher avec couleur
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Fonction pour charger un fichier JSON
function loadTranslation(language) {
  const filePath = path.join(config.baseDir, language, 'translation.json');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log(`❌ Erreur lors du chargement de ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

// Fonction pour extraire toutes les clés d'un objet (récursif)
function extractKeys(obj, prefix = '') {
  let keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // Récursion pour les objets imbriqués
      keys = keys.concat(extractKeys(obj[key], fullKey));
    } else {
      // Ajouter la clé finale
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Fonction pour obtenir la valeur d'une clé dans un objet
function getValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

// Fonction pour définir une valeur dans un objet (créer la structure si nécessaire)
function setValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Fonction pour échapper les caractères spéciaux CSV
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Fonction principale
function extractMissingTranslations() {
  log('\n🔍 Extraction des traductions manquantes pour Tamazight Latin...\n', 'cyan');
  
  // Charger les traductions
  const referenceTranslation = loadTranslation(config.referenceLanguage);
  const targetTranslation = loadTranslation(config.targetLanguage);
  
  if (!referenceTranslation || !targetTranslation) {
    log('❌ Impossible de charger les fichiers de traduction', 'red');
    return;
  }
  
  // Charger aussi les autres langues pour le rapport
  const enTranslation = loadTranslation('en');
  const arTranslation = loadTranslation('ar');
  
  // Extraire toutes les clés
  const referenceKeys = extractKeys(referenceTranslation);
  const targetKeys = extractKeys(targetTranslation);
  
  // Trouver les clés manquantes
  const missingKeys = referenceKeys.filter(key => !targetKeys.includes(key));
  
  // Créer l'objet des traductions manquantes
  const missingTranslations = {};
  const missingDetails = [];
  
  missingKeys.forEach(key => {
    const referenceValue = getValue(referenceTranslation, key);
    setValue(missingTranslations, key, referenceValue);
    
    // Ajouter aux détails pour le rapport
    missingDetails.push({
      key: key,
      fr: referenceValue || '',
      en: getValue(enTranslation, key) || '',
      ar: getValue(arTranslation, key) || ''
    });
  });
  
  // Statistiques
  const stats = {
    totalKeysReference: referenceKeys.length,
    totalKeysTarget: targetKeys.length,
    missingKeys: missingKeys.length,
    completionPercentage: ((targetKeys.length / referenceKeys.length) * 100).toFixed(1)
  };
  
  // Générer le rapport texte
  let report = `RAPPORT DES TRADUCTIONS MANQUANTES - TAMAZIGHT LATIN (tz-ltn)
========================================================
Généré le: ${new Date().toLocaleString('fr-FR')}

📊 STATISTIQUES
--------------
- Clés totales (référence ${config.referenceLanguage}): ${stats.totalKeysReference}
- Clés traduites (tz-ltn): ${stats.totalKeysTarget}
- Clés manquantes: ${stats.missingKeys}
- Taux de complétion: ${stats.completionPercentage}%

📝 CLÉS MANQUANTES PAR CATÉGORIE
--------------------------------\n`;

  // Grouper par catégorie principale
  const categorizedMissing = {};
  missingKeys.forEach(key => {
    const category = key.split('.')[0];
    if (!categorizedMissing[category]) {
      categorizedMissing[category] = [];
    }
    categorizedMissing[category].push(key);
  });
  
  // Ajouter au rapport par catégorie
  Object.keys(categorizedMissing).sort().forEach(category => {
    const keys = categorizedMissing[category];
    report += `\n### ${category.toUpperCase()} (${keys.length} clés)\n`;
    report += `${'='.repeat(40)}\n\n`;
    
    keys.forEach(key => {
      const detail = missingDetails.find(d => d.key === key);
      report += `📌 ${key}\n`;
      report += `   FR: ${detail.fr}\n`;
      if (detail.en) report += `   EN: ${detail.en}\n`;
      if (detail.ar) report += `   AR: ${detail.ar}\n`;
      report += '\n';
    });
  });
  
  // Créer le fichier CSV
  let csvContent = 'Clé,Français,Anglais,Arabe,Traduction Tamazight\n';
  missingDetails.forEach(detail => {
    csvContent += `${escapeCSV(detail.key)},${escapeCSV(detail.fr)},${escapeCSV(detail.en)},${escapeCSV(detail.ar)},\n`;
  });
  
  // Sauvegarder les fichiers
  try {
    // Sauvegarder le JSON des traductions manquantes
    fs.writeFileSync(
      config.outputFile,
      JSON.stringify(missingTranslations, null, 2),
      'utf8'
    );
    log(`✅ Traductions manquantes sauvegardées dans: ${config.outputFile}`, 'green');
    
    // Sauvegarder le rapport texte
    fs.writeFileSync(config.reportFile, report, 'utf8');
    log(`✅ Rapport détaillé sauvegardé dans: ${config.reportFile}`, 'green');
    
    // Sauvegarder le CSV
    fs.writeFileSync(config.excelFile, csvContent, 'utf8');
    log(`✅ Fichier CSV créé: ${config.excelFile}`, 'green');
    
    // Afficher un résumé
    log('\n📊 RÉSUMÉ:', 'yellow');
    console.log(`   - ${stats.missingKeys} clés manquantes sur ${stats.totalKeysReference}`);
    console.log(`   - Taux de complétion: ${stats.completionPercentage}%`);
    log('\n🔑 Principales catégories avec des manques:', 'yellow');
    
    Object.entries(categorizedMissing)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .forEach(([category, keys]) => {
        console.log(`   - ${category}: ${keys.length} clés manquantes`);
      });
      
  } catch (error) {
    log(`❌ Erreur lors de la sauvegarde: ${error.message}`, 'red');
  }
}

// Script pour générer un fichier de traduction vide pour les clés manquantes
function generateTranslationTemplate() {
  if (!fs.existsSync(config.outputFile)) {
    log(`❌ Le fichier ${config.outputFile} n'existe pas. Exécutez d'abord le script principal.`, 'red');
    return;
  }
  
  const missingData = fs.readFileSync(config.outputFile, 'utf8');
  const missingTranslations = JSON.parse(missingData);
  
  // Créer un template avec des placeholders
  const template = JSON.parse(JSON.stringify(missingTranslations));
  
  function replaceWithPlaceholder(obj, prefix = '') {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        replaceWithPlaceholder(obj[key], prefix ? `${prefix}.${key}` : key);
      } else {
        // Remplacer par un placeholder indiquant qu'il faut traduire
        obj[key] = `[À TRADUIRE: ${obj[key]}]`;
      }
    }
  }
  
  replaceWithPlaceholder(template);
  
  // Sauvegarder le template
  fs.writeFileSync(
    'translation-template-tz-ltn.json',
    JSON.stringify(template, null, 2),
    'utf8'
  );
  
  log('\n✅ Template de traduction généré: translation-template-tz-ltn.json', 'green');
}

// Fonction pour fusionner les traductions existantes avec les nouvelles
function mergeTranslations() {
  const targetPath = path.join(config.baseDir, config.targetLanguage, 'translation.json');
  
  if (!fs.existsSync('translation-completed-tz-ltn.json')) {
    log('❌ Fichier translation-completed-tz-ltn.json non trouvé', 'red');
    log('   Créez ce fichier avec vos traductions complétées', 'yellow');
    return;
  }
  
  try {
    // Charger les fichiers
    const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const newTranslations = JSON.parse(fs.readFileSync('translation-completed-tz-ltn.json', 'utf8'));
    
    // Fonction de fusion récursive
    function deepMerge(target, source) {
      for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    
    // Fusionner
    const merged = JSON.parse(JSON.stringify(existing));
    deepMerge(merged, newTranslations);
    
    // Sauvegarder
    fs.writeFileSync(
      'translation-merged-tz-ltn.json',
      JSON.stringify(merged, null, 2),
      'utf8'
    );
    
    log('✅ Traductions fusionnées dans: translation-merged-tz-ltn.json', 'green');
    log('   Vérifiez le fichier avant de remplacer l\'original', 'yellow');
    
  } catch (error) {
    log(`❌ Erreur lors de la fusion: ${error.message}`, 'red');
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.cyan}Script d'extraction des traductions manquantes${colors.reset}
${colors.bright}============================================${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node extractMissingTranslations.cjs [options]

${colors.yellow}Options:${colors.reset}
  --help, -h       Afficher cette aide
  --template       Générer un template de traduction
  --merge          Fusionner les traductions complétées

${colors.yellow}Exemples:${colors.reset}
  node extractMissingTranslations.cjs              # Extraction simple
  node extractMissingTranslations.cjs --template   # Extraction + template
  node extractMissingTranslations.cjs --merge      # Fusionner les traductions

${colors.yellow}Fichiers générés:${colors.reset}
  - missing-translations-tz-ltn.json    : JSON des clés manquantes
  - missing-translations-report.txt     : Rapport détaillé
  - missing-translations-tz-ltn.csv     : Fichier CSV pour Excel
  - translation-template-tz-ltn.json    : Template avec placeholders (si --template)
`);
  process.exit(0);
}

// Exécuter les fonctions selon les arguments
if (args.includes('--merge')) {
  mergeTranslations();
} else {
  extractMissingTranslations();
  
  if (args.includes('--template')) {
    generateTranslationTemplate();
  }
  
  // Instructions finales
  log('\n📘 INSTRUCTIONS:', 'blue');
  console.log('1. Consultez "missing-translations-report.txt" pour voir toutes les clés manquantes');
  console.log('2. Utilisez "missing-translations-tz-ltn.csv" pour traduire dans Excel');
  console.log('3. Pour générer un template: node extractMissingTranslations.cjs --template');
  console.log('4. Pour fusionner après traduction: node extractMissingTranslations.cjs --merge');
  log('\n💡 Conseil: Traduisez par ordre de priorité (les catégories les plus utilisées en premier)', 'magenta');
}

// Export pour utilisation comme module si nécessaire
module.exports = {
  extractMissingTranslations,
  generateTranslationTemplate,
  mergeTranslations
};