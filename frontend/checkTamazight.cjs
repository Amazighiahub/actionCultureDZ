// checkTamazight.cjs
// Script pour vérifier spécifiquement les problèmes avec les traductions Tamazight

const fs = require('fs');
const path = require('path');

console.log('\n🔍 VÉRIFICATION SPÉCIFIQUE TAMAZIGHT\n');

// 1. Vérifier les fichiers
console.log('1️⃣ FICHIERS DE TRADUCTION:');
const files = {
  'tz-ltn': './i18n/locales/tz-ltn/translation.json',
  'tz-tfng': './i18n/locales/tz-tfng/translation.json',
  'ar': './i18n/locales/ar/translation.json',
  'fr': './i18n/locales/fr/translation.json'
};

const translations = {};

Object.entries(files).forEach(([lang, filePath]) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      translations[lang] = JSON.parse(content);
      const size = (fs.statSync(filePath).size / 1024).toFixed(1);
      console.log(`✅ ${lang}: ${size}KB - JSON valide`);
      
      // Vérifier quelques clés
      const testValue = translations[lang].common?.language || 
                       translations[lang].header?.title || 
                       'AUCUNE CLÉ TROUVÉE';
      console.log(`   Exemple: "${testValue}"`);
      
    } catch (e) {
      console.log(`❌ ${lang}: Erreur JSON - ${e.message}`);
    }
  } else {
    console.log(`❌ ${lang}: Fichier manquant`);
  }
});

// 2. Vérifier le fichier de config
console.log('\n2️⃣ CONFIGURATION i18n:');
const configPath = './i18n/config.ts';
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Vérifier les imports
  const tzLtnImport = config.includes("'./locales/tz-ltn/translation.json'") || 
                     config.includes('"./locales/tz-ltn/translation.json"');
  const tzTfngImport = config.includes("'./locales/tz-tfng/translation.json'") || 
                      config.includes('"./locales/tz-tfng/translation.json"');
  
  console.log(`Import tz-ltn: ${tzLtnImport ? '✅' : '❌'}`);
  console.log(`Import tz-tfng: ${tzTfngImport ? '✅' : '❌'}`);
  
  // Vérifier les resources
  const hasResources = config.includes("'tz-ltn':") || config.includes('"tz-ltn":');
  console.log(`Resources tz-ltn: ${hasResources ? '✅' : '❌'}`);
  
  // Vérifier supportedLngs
  const supportedMatch = config.match(/supportedLngs:\s*\[([^\]]+)\]/);
  if (supportedMatch) {
    const supported = supportedMatch[1];
    console.log(`\nsupportedLngs: ${supported}`);
    console.log(`Contient 'tz-ltn': ${supported.includes('tz-ltn') ? '✅' : '❌'}`);
    console.log(`Contient 'tz-tfng': ${supported.includes('tz-tfng') ? '✅' : '❌'}`);
  }
}

// 3. Comparaison des clés
console.log('\n3️⃣ COMPARAISON DES CLÉS:');
if (translations['tz-ltn'] && translations['ar']) {
  const tzKeys = Object.keys(translations['tz-ltn']).sort();
  const arKeys = Object.keys(translations['ar']).sort();
  
  console.log(`\nClés principales tz-ltn: ${tzKeys.join(', ')}`);
  console.log(`Clés principales ar: ${arKeys.join(', ')}`);
  
  // Vérifier si les structures sont identiques
  const sameStructure = JSON.stringify(tzKeys) === JSON.stringify(arKeys);
  console.log(`\nStructure identique: ${sameStructure ? '✅' : '❌'}`);
}

// 4. Test de valeurs spécifiques
console.log('\n4️⃣ TEST DE VALEURS:');
const testPaths = [
  'common.language',
  'header.title',
  'home.explore.title'
];

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

testPaths.forEach(path => {
  console.log(`\n${path}:`);
  Object.keys(translations).forEach(lang => {
    const value = getNestedValue(translations[lang], path);
    if (value) {
      console.log(`  ${lang}: "${value}"`);
    } else {
      console.log(`  ${lang}: ❌ MANQUANT`);
    }
  });
});

// 5. Solution proposée
console.log('\n5️⃣ SOLUTION PROPOSÉE:');
console.log(`
Si les traductions Tamazight ne s'affichent pas :

1. Vérifiez que le fichier config.ts contient :
   - L'import: import tzLtnTranslation from './locales/tz-ltn/translation.json';
   - La resource: 'tz-ltn': { translation: tzLtnTranslation },
   - Dans supportedLngs: 'tz-ltn'

2. Dans votre Header, utilisez exactement le code 'tz-ltn' (pas 'tz' ou autre)

3. Si ça ne fonctionne toujours pas, essayez de forcer un rechargement :
   window.location.reload() après le changement de langue

4. Vérifiez la console du navigateur pour des erreurs
`);

// 6. Générer un fichier de test HTML
const testHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Tamazight</title>
</head>
<body>
    <h1>Test des traductions Tamazight</h1>
    <div id="test"></div>
    <script>
        // Simuler le chargement des traductions
        const translations = ${JSON.stringify(translations, null, 2)};
        
        const testDiv = document.getElementById('test');
        
        Object.entries(translations).forEach(([lang, trans]) => {
            const div = document.createElement('div');
            div.innerHTML = \`
                <h2>\${lang}</h2>
                <p>common.language: \${trans.common?.language || 'MANQUANT'}</p>
                <p>header.title: \${trans.header?.title || 'MANQUANT'}</p>
            \`;
            testDiv.appendChild(div);
        });
    </script>
</body>
</html>`;

fs.writeFileSync('test-tamazight.html', testHtml);
console.log('\n✅ Fichier test-tamazight.html créé - Ouvrez-le dans votre navigateur');