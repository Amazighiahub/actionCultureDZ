// Script pour créer des programmes de test pour l'événement 9
const { Sequelize } = require('sequelize');
const config = require('../config/database');

async function createProgrammes() {
  const sequelize = new Sequelize(config.development || config);

  try {
    // D'abord récupérer les infos de l'événement 9
    const [event] = await sequelize.query('SELECT date_debut, date_fin, id_lieu FROM evenement WHERE id_evenement = 9');
    console.log('Événement 9:', event[0]);

    const idLieu = event[0]?.id_lieu || 1;

    // Programmes de test pour 3 jours
    const programmes = [
      // === JOUR 1 (15 mars 2025) ===
      {
        titre: JSON.stringify({ fr: "Cérémonie d'ouverture", ar: "حفل الافتتاح", en: "Opening Ceremony" }),
        description: JSON.stringify({ fr: "Discours d'ouverture et présentation des artistes", ar: "كلمة افتتاحية وتقديم الفنانين", en: "Opening speech and artist presentations" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-15',
        heure_debut: '09:00:00',
        heure_fin: '10:30:00',
        ordre: 1,
        statut: 'planifie',
        type_activite: 'ceremonie'
      },
      {
        titre: JSON.stringify({ fr: "Visite guidée de l'exposition", ar: "جولة إرشادية في المعرض", en: "Guided Tour of Exhibition" }),
        description: JSON.stringify({ fr: "Découverte des œuvres avec un guide expert", ar: "اكتشاف الأعمال مع مرشد خبير", en: "Discover artworks with an expert guide" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-15',
        heure_debut: '11:00:00',
        heure_fin: '12:30:00',
        ordre: 2,
        statut: 'planifie',
        type_activite: 'visite'
      },
      {
        titre: JSON.stringify({ fr: "Conférence: L'art contemporain algérien", ar: "محاضرة: الفن الجزائري المعاصر", en: "Conference: Contemporary Algerian Art" }),
        description: JSON.stringify({ fr: "Discussion sur l'évolution de l'art contemporain en Algérie", ar: "نقاش حول تطور الفن المعاصر في الجزائر", en: "Discussion on the evolution of contemporary art in Algeria" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-15',
        heure_debut: '14:00:00',
        heure_fin: '16:00:00',
        ordre: 3,
        statut: 'planifie',
        type_activite: 'conference'
      },

      // === JOUR 2 (16 mars 2025) ===
      {
        titre: JSON.stringify({ fr: "Atelier de peinture", ar: "ورشة الرسم", en: "Painting Workshop" }),
        description: JSON.stringify({ fr: "Initiation aux techniques de peinture contemporaine", ar: "تعلم تقنيات الرسم المعاصر", en: "Introduction to contemporary painting techniques" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-16',
        heure_debut: '10:00:00',
        heure_fin: '12:00:00',
        ordre: 1,
        statut: 'planifie',
        type_activite: 'atelier'
      },
      {
        titre: JSON.stringify({ fr: "Rencontre avec les artistes", ar: "لقاء مع الفنانين", en: "Meet the Artists" }),
        description: JSON.stringify({ fr: "Échanges et discussions avec les artistes exposants", ar: "تبادل ونقاش مع الفنانين العارضين", en: "Exchange and discussions with exhibiting artists" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-16',
        heure_debut: '14:30:00',
        heure_fin: '16:30:00',
        ordre: 2,
        statut: 'planifie',
        type_activite: 'debat'
      },
      {
        titre: JSON.stringify({ fr: "Projection: Documentaire sur l'art", ar: "عرض: وثائقي عن الفن", en: "Screening: Art Documentary" }),
        description: JSON.stringify({ fr: "Projection d'un documentaire sur l'art contemporain", ar: "عرض فيلم وثائقي عن الفن المعاصر", en: "Screening of a documentary on contemporary art" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-16',
        heure_debut: '17:00:00',
        heure_fin: '18:30:00',
        ordre: 3,
        statut: 'planifie',
        type_activite: 'projection'
      },

      // === JOUR 3 (17 mars 2025) ===
      {
        titre: JSON.stringify({ fr: "Table ronde: L'avenir de l'art", ar: "طاولة مستديرة: مستقبل الفن", en: "Round Table: The Future of Art" }),
        description: JSON.stringify({ fr: "Débat sur les perspectives de l'art contemporain", ar: "نقاش حول آفاق الفن المعاصر", en: "Debate on the perspectives of contemporary art" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-17',
        heure_debut: '10:00:00',
        heure_fin: '12:00:00',
        ordre: 1,
        statut: 'planifie',
        type_activite: 'debat'
      },
      {
        titre: JSON.stringify({ fr: "Atelier de sculpture", ar: "ورشة النحت", en: "Sculpture Workshop" }),
        description: JSON.stringify({ fr: "Découverte des techniques de sculpture moderne", ar: "اكتشاف تقنيات النحت الحديث", en: "Discover modern sculpture techniques" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-17',
        heure_debut: '14:00:00',
        heure_fin: '15:30:00',
        ordre: 2,
        statut: 'planifie',
        type_activite: 'atelier'
      },
      {
        titre: JSON.stringify({ fr: "Cérémonie de clôture", ar: "حفل الاختتام", en: "Closing Ceremony" }),
        description: JSON.stringify({ fr: "Remise des prix et discours de clôture", ar: "توزيع الجوائز وكلمة الختام", en: "Award ceremony and closing speech" }),
        id_evenement: 9,
        id_lieu: idLieu,
        date_programme: '2025-03-17',
        heure_debut: '16:00:00',
        heure_fin: '18:00:00',
        ordre: 3,
        statut: 'planifie',
        type_activite: 'ceremonie'
      }
    ];

    console.log(`\n📝 Création de ${programmes.length} programmes pour l'événement 9...\n`);

    // Insérer les programmes
    for (const prog of programmes) {
      await sequelize.query(
        `INSERT INTO programme (titre, description, id_evenement, id_lieu, date_programme, heure_debut, heure_fin, ordre, statut, type_activite, date_creation, date_modification)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [
            prog.titre,
            prog.description,
            prog.id_evenement,
            prog.id_lieu,
            prog.date_programme,
            prog.heure_debut,
            prog.heure_fin,
            prog.ordre,
            prog.statut,
            prog.type_activite
          ]
        }
      );
      const titre = JSON.parse(prog.titre);
      console.log(`  ✅ ${prog.date_programme} ${prog.heure_debut.slice(0,5)} - ${titre.fr}`);
    }

    console.log(`\n✅ ${programmes.length} programmes créés avec succès!\n`);

    // Vérifier
    const [created] = await sequelize.query(
      'SELECT id_programme, titre, date_programme, heure_debut, type_activite FROM programme WHERE id_evenement = 9 ORDER BY date_programme, ordre'
    );

    console.log('📋 Récapitulatif des programmes créés:');
    console.log('─'.repeat(60));

    let currentDate = '';
    created.forEach(p => {
      const titre = JSON.parse(p.titre);
      if (p.date_programme !== currentDate) {
        currentDate = p.date_programme;
        console.log(`\n📅 ${currentDate}:`);
      }
      console.log(`   ${p.heure_debut.slice(0,5)} | ${titre.fr} (${p.type_activite})`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`Total: ${created.length} programmes`);

  } catch(e) {
    console.error('❌ Erreur:', e.message);
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

createProgrammes();
