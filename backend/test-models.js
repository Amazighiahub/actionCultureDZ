// Script de test pour vérifier les modèles
const db = require('./models');

console.log('=== Test des modèles ===\n');

// Liste des modèles chargés
const modelNames = Object.keys(db).filter(k =>
  !['sequelize', 'Sequelize', 'initializeDatabase', 'resetDatabase', 'insertDefaultData', 'importData'].includes(k)
);
console.log('Modèles chargés:', modelNames.length);
console.log(modelNames.join(', '));
console.log('');

// Vérifier les associations de Lieu
if (db.Lieu) {
  console.log('=== Associations de Lieu ===');
  if (db.Lieu.associations) {
    Object.keys(db.Lieu.associations).forEach(name => {
      const assoc = db.Lieu.associations[name];
      console.log(`  ${name}: ${assoc.associationType} -> ${assoc.target.name}`);
    });
  }
}
console.log('');

// Test de requête simple
async function testQuery() {
  try {
    console.log('=== Test requête Lieu ===');
    const count = await db.Lieu.count();
    console.log(`Nombre de lieux: ${count}`);

    // Test avec include
    console.log('\n=== Test requête avec includes ===');
    const lieux = await db.Lieu.findAll({
      limit: 1,
      include: [
        { model: db.Commune, required: false },
        { model: db.Localite, required: false },
        { model: db.DetailLieu, required: false },
        { model: db.Service, required: false },
        { model: db.LieuMedia, required: false },
        { model: db.QRCode, required: false }
      ]
    });
    console.log(`Lieux récupérés avec includes: ${lieux.length}`);

  } catch (error) {
    console.error('Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.sequelize.close();
  }
}

testQuery();
