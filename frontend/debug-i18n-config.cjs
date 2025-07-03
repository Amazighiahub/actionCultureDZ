// debug-i18n-config.cjs
const fs = require('fs');
const path = require('path');

console.log('🔍 Debug de la configuration i18n...\n');

// 1. Vérifier que tous les fichiers de traduction existent
console.log('📁 Vérification des fichiers de traduction:');
const locales = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

locales.forEach(locale => {
  const file = path.join('i18n/locales', locale, 'translation.json');
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`  ✅ ${locale}: ${file} (${Math.round(stats.size/1024)}KB)`);
  } else {
    console.log(`  ❌ ${locale}: ${file} N'EXISTE PAS`);
  }
});

// 2. Vérifier le fichier de config i18n
console.log('\n📄 Recherche du fichier de configuration i18n:');
const possibleConfigs = [
  'i18n/config.js',
  'i18n/config.ts',
  'src/i18n/config.js',
  'src/i18n/config.ts',
  'src/config/i18n.js',
  'src/config/i18n.ts',
  'src/i18n.js',
  'src/i18n.ts'
];

let configFound = false;
possibleConfigs.forEach(configPath => {
  if (fs.existsSync(configPath)) {
    console.log(`  ✅ Trouvé: ${configPath}`);
    configFound = true;
    
    // Lire et analyser le fichier
    const content = fs.readFileSync(configPath, 'utf8');
    
    // Vérifier les imports
    console.log('\n  📥 Imports détectés:');
    const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[2].includes('translation.json')) {
        console.log(`    - ${match[1]} depuis ${match[2]}`);
      }
    }
    
    // Vérifier les codes de langue
    console.log('\n  🌐 Codes de langue détectés:');
    const langCodes = content.match(/['"]([a-z]{2}(-[a-zA-Z]+)?)['"]\s*:/g);
    if (langCodes) {
      langCodes.forEach(code => {
        console.log(`    - ${code.replace(/['":\s]/g, '')}`);
      });
    }
  }
});

if (!configFound) {
  console.log('  ❌ Aucun fichier de configuration i18n trouvé!');
}

// 3. Suggérer une configuration de test
console.log('\n💡 Configuration de test suggérée:');
console.log('Ajoutez ceci dans votre composant React pour tester:\n');

console.log(`
import { useTranslation } from 'react-i18next';

function TestTranslations() {
  const { t, i18n } = useTranslation();
  
  const testLanguage = (lng) => {
    i18n.changeLanguage(lng);
    console.log(\`Language: \${lng}\`);
    console.log(\`- home.explore.title: \${t('home.explore.title')}\`);
    console.log(\`- home.professionals.title: \${t('home.professionals.title')}\`);
  };
  
  return (
    <div>
      <h2>Test des traductions</h2>
      <button onClick={() => testLanguage('ar')}>Test AR</button>
      <button onClick={() => testLanguage('fr')}>Test FR</button>
      <button onClick={() => testLanguage('en')}>Test EN</button>
      <button onClick={() => testLanguage('tz-ltn')}>Test TZ-LTN</button>
      <button onClick={() => testLanguage('tz-tfng')}>Test TZ-TFNG</button>
      <p>Langue actuelle: {i18n.language}</p>
      <p>Test: {t('home.explore.title')}</p>
    </div>
  );
}
`);

// 4. Vérifier les codes de langue possibles
console.log('\n⚠️  Attention aux codes de langue:');
console.log('Assurez-vous que votre application utilise exactement ces codes:');
console.log('  - ar (pas AR ou ara)');
console.log('  - fr (pas FR ou fra)');
console.log('  - en (pas EN ou eng)');
console.log('  - tz-ltn (pas tz-Ltn ou tz_ltn)');
console.log('  - tz-tfng (pas tz-Tfng ou tz_tfng)');

// 5. Créer un fichier HTML de test
console.log('\n📝 Création d\'un fichier de test standalone...');

const testHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test i18n</title>
    <script src="https://unpkg.com/i18next@23.7.6/dist/umd/i18next.min.js"></script>
</head>
<body>
    <h1>Test des traductions i18n</h1>
    <select id="langSelector">
        <option value="ar">العربية</option>
        <option value="fr">Français</option>
        <option value="en">English</option>
        <option value="tz-ltn">Tamaziɣt</option>
        <option value="tz-tfng">ⵜⴰⵎⴰⵣⵉⵖⵜ</option>
    </select>
    
    <div id="results"></div>
    
    <script>
        // Charger les traductions
        const translations = {
            ar: ${JSON.stringify(JSON.parse(fs.readFileSync('i18n/locales/ar/translation.json', 'utf8')), null, 2)},
            fr: ${JSON.stringify(JSON.parse(fs.readFileSync('i18n/locales/fr/translation.json', 'utf8')), null, 2)},
            en: ${JSON.stringify(JSON.parse(fs.readFileSync('i18n/locales/en/translation.json', 'utf8')), null, 2)},
            'tz-ltn': ${JSON.stringify(JSON.parse(fs.readFileSync('i18n/locales/tz-ltn/translation.json', 'utf8')), null, 2)},
            'tz-tfng': ${JSON.stringify(JSON.parse(fs.readFileSync('i18n/locales/tz-tfng/translation.json', 'utf8')), null, 2)}
        };
        
        // Initialiser i18next
        i18next.init({
            lng: 'fr',
            resources: Object.keys(translations).reduce((acc, lng) => {
                acc[lng] = { translation: translations[lng] };
                return acc;
            }, {})
        });
        
        // Tester les traductions
        function testTranslations() {
            const lng = document.getElementById('langSelector').value;
            i18next.changeLanguage(lng);
            
            const keys = [
                'home.explore.title',
                'home.explore.subtitle',
                'home.professionals.title',
                'sections.heritage.title'
            ];
            
            let html = '<h2>Résultats pour ' + lng + ':</h2><ul>';
            keys.forEach(key => {
                const value = i18next.t(key);
                html += '<li><strong>' + key + ':</strong> ' + value + '</li>';
            });
            html += '</ul>';
            
            document.getElementById('results').innerHTML = html;
        }
        
        document.getElementById('langSelector').addEventListener('change', testTranslations);
        testTranslations();
    </script>
</body>
</html>`;

fs.writeFileSync('test-i18n.html', testHtml);
console.log('✅ Fichier test-i18n.html créé. Ouvrez-le dans votre navigateur pour tester.');