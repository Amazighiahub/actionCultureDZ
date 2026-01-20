/**
 * Ajouter le type Salon du livre si nécessaire
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'actionculture',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

async function main() {
  await sequelize.authenticate();
  console.log('✅ Connecté\n');

  // Afficher tous les types avec soumission
  const [types] = await sequelize.query(`
    SELECT id_type_evenement, nom_type, accepte_soumissions, config_soumission
    FROM type_evenement
    WHERE accepte_soumissions = 1
  `);

  console.log('Types acceptant les soumissions d\'œuvres:');
  types.forEach(t => {
    const nom = typeof t.nom_type === 'string' ? JSON.parse(t.nom_type) : t.nom_type;
    const config = typeof t.config_soumission === 'string' ? JSON.parse(t.config_soumission) : t.config_soumission;
    console.log(`  - ID ${t.id_type_evenement}: ${nom.fr || nom.ar}`);
    console.log(`    Types d'œuvres: ${config?.type_oeuvre?.join(', ') || 'Tous'}`);
  });

  await sequelize.close();
}

main().catch(console.error);
