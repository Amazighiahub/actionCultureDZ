require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});

async function test() {
  try {
    // Test 1: raw nom value
    const [rows] = await s.query('SELECT nom, prenom FROM intervenant LIMIT 1');
    console.log('nom type:', typeof rows[0].nom, 'value:', rows[0].nom);
    console.log('prenom type:', typeof rows[0].prenom, 'value:', rows[0].prenom);

    // Test 2: JSON_EXTRACT
    try {
      const [r2] = await s.query("SELECT JSON_EXTRACT(nom, '$.fr') as nom_fr FROM intervenant LIMIT 1");
      console.log('JSON_EXTRACT OK:', r2);
    } catch (e) {
      console.error('JSON_EXTRACT FAIL:', e.message);
    }

    // Test 3: Check if nom is actually stored as JSON or string
    const [r3] = await s.query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='intervenant' AND COLUMN_NAME='nom' AND TABLE_SCHEMA=DATABASE()");
    console.log('Column type for nom:', r3[0]?.COLUMN_TYPE);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}

test();
