#!/usr/bin/env node
/**
 * Vérification des fichiers dupliqués (différence de casse uniquement)
 * Ex: components/ui/ vs components/UI/ — problématique sous Linux/Docker
 *
 * Usage: node scripts/check-duplicates.js
 */

const { execSync } = require('child_process');

const files = execSync('git ls-files', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const byLower = new Map(); // lowercase path -> array of actual paths

for (const path of files) {
  const key = path.toLowerCase();
  if (!byLower.has(key)) {
    byLower.set(key, []);
  }
  if (!byLower.get(key).includes(path)) {
    byLower.get(key).push(path);
  }
}

const duplicates = [...byLower.entries()].filter(([, paths]) => paths.length > 1);

console.log('');
console.log('============================================');
console.log('  Vérification des doublons (casse)');
console.log('============================================');
console.log('');

if (duplicates.length === 0) {
  console.log('✅ Aucun doublon détecté (chemins identiques à la casse près)');
  console.log('');
  process.exit(0);
}

console.log('⚠️  Doublons détectés (risque sous Linux/Docker) :');
console.log('');
for (const [, paths] of duplicates) {
  console.log('DOUBLON:');
  paths.forEach((p) => console.log('  -', p));
  console.log('');
}
process.exit(1);
