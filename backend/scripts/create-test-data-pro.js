// Script pour créer des données de test pour l'utilisateur professionnel
require('dotenv').config();
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

async function createTestData() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie\n');

    // Récupérer l'ID de l'utilisateur professionnel
    const [users] = await sequelize.query(`
      SELECT id_user FROM user WHERE email = 'pro.artiste@eventculture.dz'
    `);

    if (!users.length) {
      console.error('❌ Utilisateur professionnel non trouvé!');
      console.log('Exécutez d\'abord: node scripts/create-test-professional.js');
      process.exit(1);
    }

    const userId = users[0].id_user;
    console.log(`👤 Utilisateur trouvé: ID ${userId}\n`);

    // ========================================================================
    // 1. CRÉER DES ŒUVRES
    // ========================================================================
    console.log('📚 Création des œuvres...');

    const oeuvres = [
      {
        titre: JSON.stringify({
          fr: 'Les Couleurs de la Casbah',
          ar: 'ألوان القصبة',
          en: 'Colors of the Casbah'
        }),
        description: JSON.stringify({
          fr: 'Une série de peintures célébrant l\'architecture traditionnelle de la Casbah d\'Alger.',
          ar: 'سلسلة من اللوحات تحتفي بالهندسة المعمارية التقليدية لقصبة الجزائر.',
          en: 'A series of paintings celebrating the traditional architecture of the Casbah of Algiers.'
        }),
        id_type_oeuvre: 1, // Livre
        id_langue: 5, // Français
        annee_creation: 2023,
        statut: 'publie'
      },
      {
        titre: JSON.stringify({
          fr: 'Mémoires du Sahara',
          ar: 'ذكريات الصحراء',
          en: 'Memories of the Sahara'
        }),
        description: JSON.stringify({
          fr: 'Recueil photographique des paysages et cultures du Grand Sud algérien.',
          ar: 'مجموعة صور فوتوغرافية لمناظر وثقافات الجنوب الجزائري الكبير.',
          en: 'Photographic collection of landscapes and cultures of the Algerian South.'
        }),
        id_type_oeuvre: 1,
        id_langue: 3, // Arabe
        annee_creation: 2022,
        statut: 'publie'
      },
      {
        titre: JSON.stringify({
          fr: 'Chants Kabyles Modernes',
          ar: 'أغاني قبائلية حديثة',
          en: 'Modern Kabyle Songs'
        }),
        description: JSON.stringify({
          fr: 'Album musical fusionnant traditions kabyles et sonorités contemporaines.',
          ar: 'ألبوم موسيقي يمزج بين التقاليد القبائلية والأصوات المعاصرة.',
          en: 'Musical album fusing Kabyle traditions with contemporary sounds.'
        }),
        id_type_oeuvre: 3, // Album Musical
        id_langue: 1, // Tamazight
        annee_creation: 2024,
        statut: 'publie'
      },
      {
        titre: JSON.stringify({
          fr: 'L\'Art de la Dinanderie',
          ar: 'فن الصفيحة النحاسية',
          en: 'The Art of Copperware'
        }),
        description: JSON.stringify({
          fr: 'Documentaire sur les artisans dinandiers de Constantine.',
          ar: 'وثائقي عن حرفيي النحاس في قسنطينة.',
          en: 'Documentary about the coppersmith artisans of Constantine.'
        }),
        id_type_oeuvre: 2, // Film
        id_langue: 5,
        annee_creation: 2023,
        statut: 'en_attente'
      }
    ];

    for (const oeuvre of oeuvres) {
      await sequelize.query(`
        INSERT INTO oeuvre (titre, description, id_type_oeuvre, id_langue, annee_creation, statut, saisi_par, date_creation, date_modification)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          oeuvre.titre,
          oeuvre.description,
          oeuvre.id_type_oeuvre,
          oeuvre.id_langue,
          oeuvre.annee_creation,
          oeuvre.statut,
          userId
        ]
      });
    }
    console.log(`✅ ${oeuvres.length} œuvres créées`);

    // ========================================================================
    // 2. CRÉER DES ÉVÉNEMENTS
    // ========================================================================
    console.log('📅 Création des événements...');

    // Types: 1=Festival, 2=Exposition, 3=Concert, 4=Conférence, 5=Atelier
    // Utiliser des dates relatives pour que les événements soient toujours dans le futur
    const now = new Date();
    const getFutureDate = (daysFromNow, hours = 10, minutes = 0) => {
      const date = new Date(now);
      date.setDate(date.getDate() + daysFromNow);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const evenements = [
      {
        nom_evenement: JSON.stringify({
          fr: 'Exposition "Art Contemporain Algérien"',
          ar: 'معرض "الفن الجزائري المعاصر"',
          en: 'Exhibition "Contemporary Algerian Art"'
        }),
        description: JSON.stringify({
          fr: 'Une exposition collective présentant les œuvres de 15 artistes algériens contemporains.',
          ar: 'معرض جماعي يقدم أعمال 15 فنانًا جزائريًا معاصرًا.',
          en: 'A collective exhibition featuring works by 15 contemporary Algerian artists.'
        }),
        date_debut: getFutureDate(30, 10, 0),  // Dans 30 jours
        date_fin: getFutureDate(45, 18, 0),    // Dans 45 jours
        id_lieu: 1,
        statut: 'planifie',
        id_type_evenement: 2 // Exposition
      },
      {
        nom_evenement: JSON.stringify({
          fr: 'Concert de Musique Andalouse',
          ar: 'حفل موسيقى أندلسية',
          en: 'Andalusian Music Concert'
        }),
        description: JSON.stringify({
          fr: 'Soirée musicale avec l\'orchestre national de musique andalouse.',
          ar: 'أمسية موسيقية مع الأوركسترا الوطنية للموسيقى الأندلسية.',
          en: 'Musical evening with the national Andalusian music orchestra.'
        }),
        date_debut: getFutureDate(60, 20, 0),  // Dans 60 jours
        date_fin: getFutureDate(60, 23, 0),
        id_lieu: 3,
        statut: 'planifie',
        id_type_evenement: 3 // Concert
      },
      {
        nom_evenement: JSON.stringify({
          fr: 'Atelier de Calligraphie Arabe',
          ar: 'ورشة الخط العربي',
          en: 'Arabic Calligraphy Workshop'
        }),
        description: JSON.stringify({
          fr: 'Initiation à l\'art de la calligraphie arabe avec le maître calligraphe Mohamed Benali.',
          ar: 'تعلم فن الخط العربي مع الخطاط محمد بن علي.',
          en: 'Introduction to Arabic calligraphy with master calligrapher Mohamed Benali.'
        }),
        date_debut: getFutureDate(90, 14, 0),  // Dans 90 jours
        date_fin: getFutureDate(90, 17, 0),
        id_lieu: 1,
        statut: 'planifie',
        id_type_evenement: 5 // Atelier
      },
      {
        nom_evenement: JSON.stringify({
          fr: 'Festival du Film Documentaire',
          ar: 'مهرجان الفيلم الوثائقي',
          en: 'Documentary Film Festival'
        }),
        description: JSON.stringify({
          fr: 'Projection de documentaires sur le patrimoine culturel algérien.',
          ar: 'عرض أفلام وثائقية عن التراث الثقافي الجزائري.',
          en: 'Screening of documentaries on Algerian cultural heritage.'
        }),
        date_debut: getFutureDate(120, 18, 0), // Dans 120 jours
        date_fin: getFutureDate(125, 22, 0),
        id_lieu: 3,
        statut: 'planifie',
        id_type_evenement: 1 // Festival
      }
    ];

    for (const evt of evenements) {
      await sequelize.query(`
        INSERT INTO evenement (nom_evenement, description, date_debut, date_fin, id_lieu, statut, id_type_evenement, id_user, date_creation, date_modification)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          evt.nom_evenement,
          evt.description,
          evt.date_debut,
          evt.date_fin,
          evt.id_lieu,
          evt.statut,
          evt.id_type_evenement,
          userId
        ]
      });
    }
    console.log(`✅ ${evenements.length} événements créés`);

    // ========================================================================
    // 3. CRÉER DES ARTISANATS (liés aux œuvres)
    // ========================================================================
    console.log('🎨 Création des artisanats...');

    // Récupérer les IDs des œuvres qu'on vient de créer
    const [oeuvresCreees] = await sequelize.query(`
      SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ? ORDER BY id_oeuvre DESC LIMIT 4
    `, { replacements: [userId] });

    if (oeuvresCreees.length > 0) {
      const artisanats = [
        {
          id_oeuvre: oeuvresCreees[0]?.id_oeuvre,
          id_materiau: 5, // Textile
          id_technique: 4, // Tissage
          dimensions: '200x150 cm',
          poids: 5.5,
          prix: 35000
        },
        {
          id_oeuvre: oeuvresCreees[1]?.id_oeuvre,
          id_materiau: 4, // Céramique
          id_technique: 5, // Poterie
          dimensions: '40x30 cm',
          poids: 2.0,
          prix: 5500
        },
        {
          id_oeuvre: oeuvresCreees[2]?.id_oeuvre,
          id_materiau: 3, // Métal
          id_technique: 3, // Gravure
          dimensions: '45 cm (collier)',
          poids: 0.15,
          prix: 15000
        },
        {
          id_oeuvre: oeuvresCreees[3]?.id_oeuvre,
          id_materiau: 1, // Bois
          id_technique: 1, // Sculpture
          dimensions: '25x15x10 cm',
          poids: 1.2,
          prix: 4500
        }
      ];

      let artisanatCount = 0;
      for (const art of artisanats) {
        if (art.id_oeuvre) {
          await sequelize.query(`
            INSERT INTO artisanat (id_oeuvre, id_materiau, id_technique, dimensions, poids, prix, date_creation)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `, {
            replacements: [
              art.id_oeuvre,
              art.id_materiau,
              art.id_technique,
              art.dimensions,
              art.poids,
              art.prix
            ]
          });
          artisanatCount++;
        }
      }
      console.log(`✅ ${artisanatCount} artisanats créés (liés aux œuvres)`);
    } else {
      console.log('⚠️ Aucune œuvre trouvée, artisanats non créés');
    }

    // ========================================================================
    // RÉSUMÉ
    // ========================================================================
    // RÉSUMÉ FINAL
    // ========================================================================
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           DONNÉES DE TEST CRÉÉES                      ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  Œuvres:      ${oeuvres.length} créées                             ║`);
    console.log(`║  Événements:  ${evenements.length} créés                             ║`);
    console.log('║  Artisanats:  Liés aux œuvres                        ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log('║  Utilisateur: pro.artiste@eventculture.dz            ║');
    console.log('║  Mot de passe: ProTest2024!                          ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n🎉 Données de test prêtes!');
    console.log('   Connectez-vous au dashboard professionnel pour les voir.');

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

createTestData();
