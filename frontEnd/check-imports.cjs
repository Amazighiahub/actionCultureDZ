const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de l\'import toaster...\n');

// Lire App.tsx
const appPath = path.join(__dirname, 'src/App.tsx');
const content = fs.readFileSync(appPath, 'utf8');

// Trouver l'import
const match = content.match(/import.*toaster.*from\s+['"]([^'"]+)['"]/i);

if (match) {
  console.log('Import trouvé:', match[1]);
  
  // Lister les fichiers dans ui
  console.log('\nFichiers dans components/ui:');
  const uiPath = path.join(__dirname, 'src/components/ui');
  const files = fs.readdirSync(uiPath);
  
  files.forEach(file => {
    if (file.toLowerCase().includes('toast')) {
      console.log(`  - ${file}`);
    }
  });
  
  // Vérifier la casse
  const importedFile = match[1].split('/').pop();
  console.log('\nRecherche de:', importedFile);
  
  const found = files.find(f => 
    f.toLowerCase() === `${importedFile}.tsx`.toLowerCase() ||
    f.toLowerCase() === `${importedFile}.ts`.toLowerCase()
  );
  
  if (found) {
    console.log('✅ Fichier trouvé:', found);
    
    if (found !== `${importedFile}.tsx` && found !== `${importedFile}.ts`) {
      console.log('\n⚠️  PROBLÈME DE CASSE!');
      console.log('L\'import cherche:', importedFile);
      console.log('Mais le fichier est:', found);
    }
  }
}