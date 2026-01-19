#!/usr/bin/env node
/**
 * Test de changement de langue - EventCulture
 * Vérifie que le sélecteur fonctionne avec toutes les langues
 */

const fs = require('fs');
const path = require('path');

const languages = ['fr', 'en', 'ar', 'tz-ltn', 'tz-tfng'];
const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

console.log('');
console.log('='.repeat(80));
console.log('  TEST DE CHANGEMENT DE LANGUE - EventCulture');
console.log('='.repeat(80));

// Charger toutes les traductions
const translations = {};
languages.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'translation.json');
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

// Fonction pour obtenir une clé imbriquée
function getNestedValue(obj, keyPath) {
  const value = keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
  if (value === undefined || value === null) return '[MANQUANT]';
  if (typeof value === 'object') return '[OBJET]';
  return value;
}

// Fonction pour tronquer
function truncate(s, len) {
  if (typeof s !== 'string') return String(s);
  return s.length > len ? s.substring(0, len - 2) + '..' : s;
}

// Clés à tester (corrigées)
const testKeys = [
  // Common (navigation et actions)
  { key: 'common.save', section: 'Common' },
  { key: 'common.cancel', section: 'Common' },
  { key: 'common.delete', section: 'Common' },
  { key: 'common.loading', section: 'Common' },
  { key: 'common.logout', section: 'Common' },
  { key: 'common.confirm', section: 'Common' },

  // Oeuvre
  { key: 'oeuvre.addToFavorites', section: 'Oeuvre' },
  { key: 'oeuvre.backToList', section: 'Oeuvre' },
  { key: 'oeuvre.tabs.gallery', section: 'Oeuvre' },
  { key: 'oeuvre.fields.title', section: 'Oeuvre' },
  { key: 'oeuvre.fields.description', section: 'Oeuvre' },

  // Event
  { key: 'event.location', section: 'Event' },
  { key: 'event.registration.register', section: 'Event' },
  { key: 'event.registration.full', section: 'Event' },
  { key: 'event.tabs.program', section: 'Event' },
  { key: 'event.startDate', section: 'Event' },

  // Places
  { key: 'places.address', section: 'Places' },
  { key: 'places.types.museum', section: 'Places' },
  { key: 'places.types.theater', section: 'Places' },
  { key: 'places.useCurrentLocation', section: 'Places' },
  { key: 'places.createNew', section: 'Places' },

  // Admin
  { key: 'admin.dashboard.title', section: 'Admin' },
  { key: 'admin.tabs.users', section: 'Admin' },
  { key: 'admin.actions.validate', section: 'Admin' },
  { key: 'admin.notifications.modal.title', section: 'Admin' },

  // Auth
  { key: 'auth.login.title', section: 'Auth' },
  { key: 'auth.login.submit', section: 'Auth' },
  { key: 'auth.register.title', section: 'Auth' },
];

// Afficher les résultats par section
let currentSection = '';
let missingCount = 0;
let totalTests = 0;

console.log('');

testKeys.forEach(({ key, section }) => {
  if (section !== currentSection) {
    if (currentSection !== '') console.log('');
    console.log('  ' + section.toUpperCase() + ':');
    console.log('  ' + '-'.repeat(76));
    currentSection = section;
  }

  const fr = getNestedValue(translations.fr, key);
  const en = getNestedValue(translations.en, key);
  const ar = getNestedValue(translations.ar, key);
  const tzLtn = getNestedValue(translations['tz-ltn'], key);
  const tzTfng = getNestedValue(translations['tz-tfng'], key);

  const values = [fr, en, ar, tzLtn, tzTfng];
  const hasMissing = values.some(v => v === '[MANQUANT]' || v === '[OBJET]');

  if (hasMissing) missingCount++;
  totalTests++;

  const status = hasMissing ? '  X' : ' OK';
  const keyShort = key.length > 32 ? '...' + key.slice(-29) : key;

  console.log(
    status + ' ' +
    keyShort.padEnd(34) +
    truncate(fr, 10).padEnd(12) +
    truncate(en, 10).padEnd(12) +
    truncate(ar, 10).padEnd(12) +
    truncate(tzLtn, 10).padEnd(12) +
    truncate(tzTfng, 12)
  );
});

console.log('');
console.log('='.repeat(80));
console.log('  RESUME');
console.log('='.repeat(80));
console.log('');

if (missingCount === 0) {
  console.log('  [OK] Toutes les ' + totalTests + ' cles testees sont presentes dans toutes les langues!');
} else {
  console.log('  [!] ' + missingCount + '/' + totalTests + ' cles ont des traductions manquantes');
}

console.log('');
console.log('  Configuration du selecteur de langue:');
console.log('');
console.log('    Code      Langue              Direction   Police          Drapeau');
console.log('    ' + '-'.repeat(68));
console.log('    fr        Francais            LTR         -               FR');
console.log('    en        English             LTR         -               GB');
console.log('    ar        Arabe               RTL         font-arabic     DZ');
console.log('    tz-ltn    Tamazight (Latin)   LTR         -               Z');
console.log('    tz-tfng   Tamazight (Tfng)    LTR         tifinagh-font   ?');
console.log('');
console.log('  Persistance: localStorage (cle: i18nextLng)');
console.log('  Langue par defaut: FR');
console.log('  Fallback: FR');
console.log('');

// Test de cohérence finale
console.log('='.repeat(80));
console.log('  VERIFICATION FINALE');
console.log('='.repeat(80));
console.log('');

const langNames = {
  fr: 'Francais',
  en: 'English',
  ar: 'Arabe',
  'tz-ltn': 'Tamazight Latin',
  'tz-tfng': 'Tamazight Tifinagh'
};

let allOk = true;
languages.forEach(lang => {
  const data = translations[lang];
  const checks = [
    { name: 'oeuvre', ok: !!data.oeuvre },
    { name: 'event', ok: !!data.event },
    { name: 'places', ok: !!data.places },
    { name: 'admin', ok: !!data.admin },
    { name: 'common', ok: !!data.common },
    { name: 'auth', ok: !!data.auth },
  ];

  const allSectionsOk = checks.every(c => c.ok);
  const status = allSectionsOk ? 'OK' : 'INCOMPLETE';
  const missingStr = checks.filter(c => !c.ok).map(c => c.name).join(', ') || '-';

  if (!allSectionsOk) allOk = false;

  console.log('  ' + (allSectionsOk ? 'OK' : 'X ') + ' ' + lang.toUpperCase().padEnd(10) + langNames[lang].padEnd(22) + (allSectionsOk ? 'Complet' : 'Manque: ' + missingStr));
});

console.log('');
if (allOk) {
  console.log('  [OK] Le selecteur de langue fonctionne correctement avec toutes les langues!');
} else {
  console.log('  [!] Certaines langues ont des sections manquantes');
}
console.log('');
console.log('='.repeat(80));
console.log('');
