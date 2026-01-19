/**
 * Script pour créer un événement de test
 * Usage: node scripts/create-test-event.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { initializeDatabase } = require('../models');

async function createTestEvent() {
  console.log('🚀 Création d\'un événement de test...\n');

  try {
    const { models, sequelize } = await initializeDatabase({
      sync: { force: false },
      skipSeed: true
    });

    // 1. Vérifier/créer un type d'événement
    let typeEvenement = await models.TypeEvenement.findOne({
      where: { nom_type: { fr: 'Festival' } }
    });

    if (!typeEvenement) {
      typeEvenement = await models.TypeEvenement.create({
        nom_type: { fr: 'Festival', ar: 'مهرجان', en: 'Festival' },
        description: { fr: 'Événement culturel festif', ar: 'حدث ثقافي احتفالي', en: 'Festive cultural event' }
      });
      console.log('✅ Type d\'événement créé:', typeEvenement.id_type_evenement);
    } else {
      console.log('ℹ️ Type d\'événement existant:', typeEvenement.id_type_evenement);
    }

    // 2. Vérifier/créer un lieu
    let lieu = await models.Lieu.findOne();

    if (!lieu) {
      // Créer une wilaya d'abord si nécessaire
      let wilaya = await models.Wilaya.findOne();
      if (!wilaya) {
        wilaya = await models.Wilaya.create({
          nom_wilaya: { fr: 'Alger', ar: 'الجزائر', en: 'Algiers' },
          code_wilaya: '16'
        });
        console.log('✅ Wilaya créée:', wilaya.id_wilaya);
      }

      lieu = await models.Lieu.create({
        nom: { fr: 'Palais de la Culture', ar: 'قصر الثقافة', en: 'Palace of Culture' },
        adresse: { fr: '25 Boulevard Frantz Fanon, Alger', ar: '25 شارع فرانتز فانون، الجزائر' },
        latitude: 36.7538,
        longitude: 3.0588,
        id_wilaya: wilaya.id_wilaya,
        typePatrimoine: 'monument'
      });
      console.log('✅ Lieu créé:', lieu.id_lieu);
    } else {
      console.log('ℹ️ Lieu existant:', lieu.id_lieu);
    }

    // 3. Vérifier/créer un utilisateur organisateur
    let user = await models.User.findOne({
      where: { email: 'organisateur@test.dz' }
    });

    if (!user) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
      
      // Vérifier/créer un type utilisateur
      let typeUser = await models.TypeUser.findOne({ where: { id_type_user: 1 } });
      if (!typeUser) {
        typeUser = await models.TypeUser.create({
          nom_type: { fr: 'Visiteur', ar: 'زائر', en: 'Visitor' }
        });
      }

      user = await models.User.create({
        nom: { fr: 'Organisateur', ar: 'منظم', en: 'Organizer' },
        prenom: { fr: 'Test', ar: 'اختبار', en: 'Test' },
        email: 'organisateur@test.dz',
        password: hashedPassword,
        id_type_user: typeUser.id_type_user,
        statut: 'actif',
        email_verifie: true
      });
      console.log('✅ Utilisateur organisateur créé:', user.id_user);
      console.log('   📧 Email: organisateur@test.dz');
      console.log('   🔑 Mot de passe: TestPassword123!');
    } else {
      console.log('ℹ️ Utilisateur existant:', user.id_user);
    }

    // 4. Créer l'événement de test
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() + 7); // Dans 7 jours

    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + 3); // Dure 3 jours

    const dateLimiteInscription = new Date();
    dateLimiteInscription.setDate(dateLimiteInscription.getDate() + 5); // 2 jours avant

    const evenement = await models.Evenement.create({
      nom_evenement: { 
        fr: 'Festival du Livre d\'Alger 2025', 
        ar: 'مهرجان الكتاب بالجزائر 2025', 
        en: 'Algiers Book Festival 2025' 
      },
      description: { 
        fr: 'Un festival littéraire célébrant les auteurs algériens et internationaux. Rencontres, dédicaces et ateliers d\'écriture.',
        ar: 'مهرجان أدبي يحتفي بالكتاب الجزائريين والدوليين. لقاءات وتوقيعات وورشات كتابة.',
        en: 'A literary festival celebrating Algerian and international authors. Meetings, signings and writing workshops.'
      },
      date_debut: dateDebut,
      date_fin: dateFin,
      date_limite_inscription: dateLimiteInscription,
      contact_email: 'contact@festival-livre.dz',
      contact_telephone: '+213 21 00 00 00',
      id_lieu: lieu.id_lieu,
      id_user: user.id_user,
      id_type_evenement: typeEvenement.id_type_evenement,
      statut: 'planifie',
      capacite_max: 500,
      tarif: 0, // Gratuit
      inscription_requise: true,
      age_minimum: 0,
      accessibilite: { 
        fr: 'Accès PMR disponible, parking gratuit',
        ar: 'وصول ذوي الاحتياجات الخاصة متاح، موقف سيارات مجاني',
        en: 'Wheelchair access available, free parking'
      },
      certificat_delivre: false
    });

    console.log('\n✅ ÉVÉNEMENT DE TEST CRÉÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📌 ID: ${evenement.id_evenement}`);
    console.log(`📛 Nom: ${evenement.nom_evenement.fr}`);
    console.log(`📅 Date: ${dateDebut.toLocaleDateString('fr-FR')} - ${dateFin.toLocaleDateString('fr-FR')}`);
    console.log(`📍 Lieu ID: ${lieu.id_lieu}`);
    console.log(`👤 Organisateur ID: ${user.id_user}`);
    console.log(`🎫 Capacité: ${evenement.capacite_max} places`);
    console.log(`💰 Tarif: Gratuit`);
    console.log(`📝 Inscription requise: Oui`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n🔗 Pour tester l\'inscription:');
    console.log(`   POST http://localhost:3001/api/evenements/${evenement.id_evenement}/inscription`);
    console.log('   Headers: Authorization: Bearer <votre_token>');
    console.log('\n🔗 Pour voir l\'événement:');
    console.log(`   GET http://localhost:3001/api/evenements/${evenement.id_evenement}`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestEvent();
