#!/usr/bin/env node
/**
 * Génère un template JSON avec toutes les clés manquantes organisées par section
 */

const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'missing-translations-report.json');
const outputPath = path.join(__dirname, '..', 'missing-keys-template.json');

// Lire le rapport
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Prendre les clés manquantes en français comme référence
const missingKeys = report.fr || [];

// Filtrer les clés invalides (comme ".", "a", "T", etc.)
const validKeys = missingKeys.filter(key => {
  // Ignorer les clés trop courtes ou invalides
  if (key.length < 3) return false;
  if (key === 'canvas' || key === 'helvetica' || key === '2d') return false;
  if (key === 'itemsPerPage' || key === 'language' || key === 'languageChanged') return false;
  if (key === 'service' || key === 'link' || key === 'meta' || key === 'theme') return false;
  if (key === 'evenement' || key === 'notifications' || key === 'patrimoine') return false;

  // Ne garder que les clés avec au moins un point (section.key)
  return key.includes('.');
});

// Organiser par section
const organized = {};

validKeys.forEach(key => {
  const parts = key.split('.');
  let current = organized;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      // Dernière partie = la clé
      current[part] = `[À TRADUIRE] ${key}`;
    } else {
      // Partie intermédiaire = section
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  });
});

// Sauvegarder le template
fs.writeFileSync(outputPath, JSON.stringify(organized, null, 2), 'utf-8');

console.log(`\n✅ Template généré: ${outputPath}`);
console.log(`📊 ${validKeys.length} clés valides organisées\n`);

// Statistiques par section
const sections = {};
validKeys.forEach(key => {
  const section = key.split('.')[0];
  if (!sections[section]) sections[section] = 0;
  sections[section]++;
});

console.log('📑 Clés par section:\n');
Object.entries(sections)
  .sort((a, b) => b[1] - a[1])
  .forEach(([section, count]) => {
    console.log(`  ${section.padEnd(25)} - ${count} clés`);
  });

console.log('\n');
