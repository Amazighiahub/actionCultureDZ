// Script pour créer un utilisateur professionnel validé pour les tests
// Types disponibles (sauf 1=visiteur et 29=admin):
// 2=ecrivain, 3=journaliste, 4=scientifique, 5=acteur, 6=artiste, 7=artisan,
// 8=realisateur, 9=musicien, 10=photographe, 11=danseur, 12=sculpteur, etc.

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

async function createTestProfessional() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie\n');

    // Données du professionnel de test - Type ARTISTE (id=6)
    // Note: nom et prenom sont en JSON multilingue
    const testUser = {
      email: 'pro.artiste@eventculture.dz',
      password: 'ProTest2024!',
      nom: JSON.stringify({ fr: 'Benali', ar: 'بن علي', en: 'Benali' }),
      prenom: JSON.stringify({ fr: 'Karim', ar: 'كريم', en: 'Karim' }),
      sexe: 'M',
      date_naissance: '1985-03-15',
      telephone: '+213 555 123 456',
      wilaya_residence: 16, // Alger
      biographie: JSON.stringify({
        fr: 'Artiste peintre spécialisé dans l\'art contemporain algérien. Plus de 15 ans d\'expérience.',
        ar: 'فنان تشكيلي متخصص في الفن المعاصر الجزائري. أكثر من 15 سنة من الخبرة.',
        en: 'Painter artist specializing in contemporary Algerian art. Over 15 years of experience.'
      }),
      id_type_user: 6, // Artiste (professionnel)
      statut: 'actif',
      email_verifie: true
    };

    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await sequelize.query(`
      SELECT id_user, email, statut, id_type_user FROM user WHERE email = ?
    `, {
      replacements: [testUser.email]
    });

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      console.log('⚠️  Un utilisateur avec cet email existe déjà:');
      console.log(`   ID: ${existingUser.id_user}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Statut: ${existingUser.statut}`);
      console.log(`   Type: ${existingUser.id_type_user}`);

      // Mettre à jour le statut si nécessaire
      await sequelize.query(`
        UPDATE user SET statut = 'actif', email_verifie = 1 WHERE id_user = ?
      `, { replacements: [existingUser.id_user] });
      console.log('✅ Statut mis à jour vers "actif"');

      console.log('\n📋 Informations de connexion:');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Mot de passe: ${testUser.password}`);

    } else {
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      // Créer l'utilisateur
      await sequelize.query(`
        INSERT INTO user (
          email, password, nom, prenom, sexe, date_naissance,
          telephone, wilaya_residence, biographie, id_type_user,
          statut, email_verifie, date_creation, date_modification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          testUser.email,
          hashedPassword,
          testUser.nom,
          testUser.prenom,
          testUser.sexe,
          testUser.date_naissance,
          testUser.telephone,
          testUser.wilaya_residence,
          testUser.biographie,
          testUser.id_type_user,
          testUser.statut,
          testUser.email_verifie ? 1 : 0
        ]
      });

      console.log('✅ Utilisateur professionnel créé avec succès!\n');
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║        COMPTE PROFESSIONNEL DE TEST                   ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  Email:        ${testUser.email}       ║`);
    console.log(`║  Mot de passe: ${testUser.password}                      ║`);
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  Nom:          ${testUser.prenom} ${testUser.nom}                       ║`);
    console.log(`║  Type:         Artiste (id_type_user: ${testUser.id_type_user})            ║`);
    console.log(`║  Statut:       ${testUser.statut}                            ║`);
    console.log(`║  Email vérifié: Oui                                   ║`);
    console.log(`║  Wilaya:       Alger (16)                             ║`);
    console.log('╚═══════════════════════════════════════════════════════╝');

    console.log('\n🎉 Prêt pour les tests!');
    console.log('\n📝 Note: Les types professionnels disponibles sont:');
    console.log('   2=écrivain, 3=journaliste, 4=scientifique, 5=acteur,');
    console.log('   6=artiste, 7=artisan, 8=réalisateur, 9=musicien,');
    console.log('   10=photographe, 11=danseur, 12=sculpteur, etc.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.original) {
      console.error('Détails:', error.original.message);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createTestProfessional();
