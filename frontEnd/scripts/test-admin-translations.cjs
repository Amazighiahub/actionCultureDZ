#!/usr/bin/env node
/**
 * Script de test pour vérifier que toutes les clés de traduction admin
 * sont présentes dans toutes les langues (FR, EN, AR, TZ-LTN, TZ-TFNG)
 */

const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const localesDir = path.join(__dirname, '..', 'i18n', 'locales');
const languages = ['fr', 'en', 'ar', 'tz-ltn', 'tz-tfng'];

// Clés admin attendues
const expectedAdminKeys = {
  'notifications.modal.title': true,
  'notifications.modal.description': true,
  'notifications.types.info': true,
  'notifications.types.validation': true,
  'notifications.types.warning': true,
  'notifications.types.custom': true,
  'notifications.targetGroups.all': true,
  'notifications.targetGroups.professionals': true,
  'notifications.targetGroups.visitors': true,
  'notifications.form.notificationType': true,
  'notifications.form.send': true,
  'moderation.title': true,
  'moderation.status.pending': true,
  'moderation.status.processed': true,
  'moderation.status.rejected': true,
  'moderation.types.commentaire': true,
  'moderation.types.utilisateur': true,
  'moderation.types.oeuvre': true,
  'moderation.types.evenement': true,
  'moderation.reasons.inappropriateContent': true,
  'moderation.reasons.spam': true,
  'moderation.reasons.harassment': true,
  'moderation.actions.approve': true,
  'moderation.actions.reject': true,
  'moderation.actions.warn': true,
  'moderation.actions.process': true,
  'moderation.noReports': true,
  'patrimoine.title': true,
  'patrimoine.filters.allTypes': true,
  'patrimoine.filters.allWilayas': true,
  'patrimoine.types.historicalSite': true,
  'patrimoine.types.archaeologicalSite': true,
  'patrimoine.types.monument': true,
  'patrimoine.types.museum': true,
  'patrimoine.deleteDialog.title': true,
  'patrimoine.deleteDialog.description': true,
  'overview.title': true,
  'overview.subtitle': true,
  'stats.users': true,
  'stats.works': true,
  'stats.events': true,
  'stats.heritage': true,
  'stats.thisMonth': true,
  'alerts.title': true,
  'pending.users': true,
  'pending.usersDesc': true,
  'pending.noUsers': true,
  'pending.works': true,
  'pending.worksDesc': true,
  'pending.noWorks': true,
  'pending.viewAll': true,
  'pending.viewAllWorks': true,
  'activity.title': true,
  'activity.viewsToday': true,
  'activity.newUsers': true,
  'activity.pendingWorks': true,
  'activity.openReports': true,
  'actions.reject': true,
  'actions.validate': true,
};

// Fonction pour obtenir toutes les clés d'un objet de manière récursive
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

// Charger et tester les traductions
console.log('\n🔍 Test des traductions admin pour toutes les langues\n');
console.log('='.repeat(70));

const results = {};
const missingKeys = {};

languages.forEach(lang => {
  const translationPath = path.join(localesDir, lang, 'translation.json');

  try {
    const content = fs.readFileSync(translationPath, 'utf-8');
    const translations = JSON.parse(content);

    // Obtenir toutes les clés admin
    const adminKeys = getAllKeys(translations.admin || {});

    // Vérifier les clés manquantes
    const missing = [];
    Object.keys(expectedAdminKeys).forEach(expectedKey => {
      if (!adminKeys.includes(expectedKey)) {
        missing.push(expectedKey);
      }
    });

    results[lang] = {
      total: adminKeys.length,
      expected: Object.keys(expectedAdminKeys).length,
      missing: missing.length,
      success: missing.length === 0
    };

    if (missing.length > 0) {
      missingKeys[lang] = missing;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${lang}:`, error.message);
    results[lang] = { error: error.message };
  }
});

// Afficher les résultats
console.log('\n📊 Résultats:\n');

let allSuccess = true;

languages.forEach(lang => {
  const result = results[lang];
  if (result.error) {
    console.log(`❌ ${lang.toUpperCase().padEnd(10)} - ERREUR: ${result.error}`);
    allSuccess = false;
  } else if (result.success) {
    console.log(`✅ ${lang.toUpperCase().padEnd(10)} - ${result.total} clés (${result.expected} attendues)`);
  } else {
    console.log(`⚠️  ${lang.toUpperCase().padEnd(10)} - ${result.total} clés (${result.missing} manquantes sur ${result.expected})`);
    allSuccess = false;
  }
});

// Afficher les clés manquantes
if (Object.keys(missingKeys).length > 0) {
  console.log('\n❌ Clés manquantes par langue:\n');
  Object.entries(missingKeys).forEach(([lang, keys]) => {
    console.log(`  ${lang.toUpperCase()}:`);
    keys.forEach(key => console.log(`    - admin.${key}`));
    console.log('');
  });
}

console.log('\n' + '='.repeat(70));

if (allSuccess) {
  console.log('\n✅ Toutes les traductions admin sont complètes!\n');
  process.exit(0);
} else {
  console.log('\n❌ Certaines traductions sont incomplètes.\n');
  process.exit(1);
}
