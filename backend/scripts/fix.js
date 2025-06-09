// fix.js - Placez ce fichier dans le dossier backend et exécutez: node fix.js
const fs = require('fs');

console.log('🔧 Correction de metadataRoutes.js...\n');

try {
  // Lire le fichier
  const content = fs.readFileSync('routes/metadataRoutes.js', 'utf8');
  console.log('✅ Fichier trouvé');
  
  // Compter les problèmes
  const count = (content.match(/authMiddleware\.isAdmin/g) || []).length;
  console.log(`📊 ${count} occurrences de 'isAdmin' trouvées`);
  
  if (count === 0) {
    console.log('\n✅ Aucune correction nécessaire !');
    process.exit(0);
  }
  
  // Sauvegarder
  fs.writeFileSync('routes/metadataRoutes.js.backup', content);
  console.log('💾 Sauvegarde créée');
  
  // Remplacer
  const fixed = content.replace(/authMiddleware\.isAdmin/g, 'authMiddleware.requireAdmin');
  fs.writeFileSync('routes/metadataRoutes.js', fixed);
  
  console.log(`✅ ${count} corrections effectuées !`);
  console.log('\n🚀 Vous pouvez maintenant lancer: npm start');
  
} catch (e) {
  console.error('❌ Erreur:', e.message);
  console.log('\n💡 Assurez-vous d\'être dans le dossier backend');
  console.log('   cd C:\\Users\\Dell\\Documents\\EventCulture\\backend');
  console.log('   node fix.js');
}