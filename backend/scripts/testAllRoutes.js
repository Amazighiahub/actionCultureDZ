const request = require('supertest');
const app = require('../app.js').appInstance; // Adjust if your app path differs

const token = 'NOTOKENPLSPROVIDE';

async function testEvenement() {
  console.log('Testing /api/evenements POST...');
  try {
    const res = await request(app)
      .post('/api/evenements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom_evenement: 'Test Event',
        description: 'Test description',
        date_debut: '2025-07-01T00:00:00.000Z',
        date_fin: '2025-07-02T00:00:00.000Z',
        id_lieu: 1,
        id_type_evenement: 1,
        capacite_max: 100,
        prix_min: 10,
        prix_max: 20
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testIntervenant() {
  console.log('Testing /api/intervenants POST...');
  try {
    const res = await request(app)
      .post('/api/intervenants')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom: 'Doe',
        prenom: 'John',
        type_intervenant: 'Speaker',
        specialite: 'Tech',
        biographie: 'Bio here',
        email: 'john.doe@example.com',
        telephone: '+123456789',
        site_web: 'https://example.com',
        photo_url: 'https://example.com/photo.jpg',
        wilaya_id: 1,
        disponible: true
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testEditeur() {
  console.log('Testing  /api/metadata/editeurs POST...');
  try {
    const res = await request(app)
      .post('/api/metadata/editeurs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom: 'Editions Test',
        type_editeur: 'Type A',
        site_web: 'https://editeur.com',
        actif: true
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testMateriau() {
  console.log('Testing /api/metadata/materiauxiaux POST...');
  try {
    const res = await request(app)
      .post('/api/metadata/materiaux')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom: 'Materiau Test',
        description: 'Some description'
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testTechnique() {
  console.log('Testing /api/metadata/techniques POST...');
  try {
    const res = await request(app)
      .post('/api/metadata/techniques')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom: 'Technique Test',
        description: 'Some description'
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testTag() {
  console.log('Testing api/metadata/tags POST...');
  try {
    const res = await request(app)
      .post('/api/metadata/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nom: 'TagTest'
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testSitePatrimonial() {
  console.log('Testing api/patrimoine/sites POST...');
  try {
    const res = await request(app)
      .post('/api/patrimoine/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        lieu: {
          nom: 'Site Test',
          adresse: '123 Main St',
          latitude: 35.6895,
          longitude: 139.6917,
          typeLieu: 'Commune',
          wilayaId: 1
        },
        details: {
          description: 'Desc',
          histoire: 'History',
          horaires: JSON.stringify({ monday: '9-5' })
        },
        monument: {},
        vestige: {},
        services: [],
        medias: []
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testUserRegistration() {
  console.log('Testing /api/users/register POST...');
  try {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        nom: 'Doeuf',
        prenom: 'John',
        email: 'test@test.test',
        password: '123456789',
        type_user: 'visiteur',
        accepte_conditions: true
      });
    console.log(`Status: ${res.statusCode}`, res.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// MAIN EXECUTION
(async () => {
  //await testEvenement();
  //await testIntervenant();
  //await testEditeur();
  //await testMateriau();
  //await testTechnique();
  //await testTag();
  //await testSitePatrimonial();
  await testUserRegistration();
})();
