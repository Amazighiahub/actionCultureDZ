const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '../../i18n/locales');
const SCRIPT_DIR = __dirname;

const langs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

for (const lang of langs) {
  const transPath = path.join(LOCALES, lang, 'translation.json');
  const keysPath = path.join(SCRIPT_DIR, `toast-keys-${lang}.json`);

  if (!fs.existsSync(keysPath)) {
    console.log(`⏭ ${lang}: pas de fichier toast-keys, skip`);
    continue;
  }

  const existing = JSON.parse(fs.readFileSync(transPath, 'utf8'));
  const toAdd = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

  // Deep merge (toAdd into existing, without overwriting)
  function deepMerge(target, source) {
    let added = 0;
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        added += deepMerge(target[key], source[key]);
      } else if (!(key in target)) {
        target[key] = source[key];
        added++;
      }
    }
    return added;
  }

  const added = deepMerge(existing, toAdd);
  fs.writeFileSync(transPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`✅ ${lang}: ${added} clés toast ajoutées`);
}

console.log('\nDone!');
