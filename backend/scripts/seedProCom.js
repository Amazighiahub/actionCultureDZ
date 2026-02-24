// scripts/seedProgrammesCommentaires.js - Ajouter programmes et commentaires
const { Sequelize } = require('sequelize');

// Configuration de la base de données
const sequelize = new Sequelize('actionculture', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// Import des modèles nécessaires
const models = {};

console.log('📦 Chargement des modèles...\n');

try {
  // Modèles nécessaires
  models.User = require('../models/users/user')(sequelize);
  models.Evenement = require('../models/events/evenement')(sequelize);
  models.Programme = require('../models/events/programme')(sequelize);
  models.Commentaire = require('../models/misc/commentaire')(sequelize);
  models.Lieu = require('../models/places/lieu')(sequelize);
  
  console.log('✅ Modèles chargés');
} catch (error) {
  console.error('❌ Erreur chargement modèles:', error.message);
}

async function seedProgrammesCommentaires() {
  try {
    console.log('\n🌱 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion établie !\n');

    // ========== ÉTAPE 1: Récupérer les données existantes ==========
    console.log('📊 Récupération des données existantes...');
    
    // Récupérer les événements
    const evenements = await models.Evenement.findAll({
      attributes: ['id_evenement', 'nom_evenement', 'id_lieu', 'date_debut', 'date_fin']
    });
    console.log(`✅ ${evenements.length} événements trouvés`);

    // Récupérer les utilisateurs
    const users = await models.User.findAll({
      attributes: ['id_user', 'nom', 'prenom', 'email']
    });
    console.log(`✅ ${users.length} utilisateurs trouvés`);

    // Récupérer les lieux
    const lieux = await models.Lieu.findAll({
      attributes: ['id_lieu', 'nom']
    });
    console.log(`✅ ${lieux.length} lieux trouvés\n`);

    // ========== ÉTAPE 2: Créer des programmes pour chaque événement ==========
    console.log('📅 Création des programmes...');
    
    const programmesData = [
      // Programmes pour le Festival de Musique Andalouse
      {
        eventName: "Festival de Musique Andalouse 2025",
        programmes: [
          {
            titre: "Cérémonie d'ouverture",
            description: "Ouverture officielle du festival avec allocutions et première performance",
            type_activite: "ceremonie",
            heure_debut: "18:00:00",
            heure_fin: "19:00:00",
            ordre: 1,
            nb_participants_max: 500
          },
          {
            titre: "Concert d'ouverture - Orchestre National d'Alger",
            description: "L'Orchestre National d'Alger interprète les grandes œuvres du répertoire andalou",
            type_activite: "concert",
            heure_debut: "19:30:00",
            heure_fin: "21:30:00",
            ordre: 2,
            nb_participants_max: 500,
            enregistrement_autorise: true
          },
          {
            titre: "Atelier d'initiation au Oud",
            description: "Apprenez les bases du oud avec le maître Salim Fergani",
            type_activite: "atelier",
            heure_debut: "10:00:00",
            heure_fin: "12:00:00",
            ordre: 3,
            nb_participants_max: 30,
            niveau_requis: "debutant",
            materiel_requis: ["Oud fourni sur place", "Cahier de notes"]
          },
          {
            titre: "Conférence : Histoire de la musique andalouse en Algérie",
            description: "Une plongée dans l'histoire et l'évolution de la musique andalouse",
            type_activite: "conference",
            heure_debut: "14:00:00",
            heure_fin: "16:00:00",
            ordre: 4,
            nb_participants_max: 200,
            traduction_disponible: true,
            support_numerique: true
          },
          {
            titre: "Concert de clôture - Ensemble de Tlemcen",
            description: "Grand concert de clôture avec l'ensemble prestigieux de Tlemcen",
            type_activite: "concert",
            heure_debut: "20:00:00",
            heure_fin: "22:30:00",
            ordre: 5,
            nb_participants_max: 500,
            diffusion_live: true
          }
        ]
      },
      // Programmes pour l'Exposition Art Contemporain
      {
        eventName: "Exposition Art Contemporain - Visions d'Algérie",
        programmes: [
          {
            titre: "Vernissage de l'exposition",
            description: "Inauguration officielle avec les artistes présents",
            type_activite: "exposition",
            heure_debut: "18:00:00",
            heure_fin: "20:00:00",
            ordre: 1,
            nb_participants_max: 100
          },
          {
            titre: "Visite guidée avec les artistes",
            description: "Visite commentée de l'exposition par les artistes eux-mêmes",
            type_activite: "visite",
            heure_debut: "11:00:00",
            heure_fin: "12:30:00",
            ordre: 2,
            nb_participants_max: 25,
            langue_principale: "fr",
            traduction_disponible: true
          },
          {
            titre: "Atelier de peinture contemporaine",
            description: "Initiez-vous aux techniques de l'art contemporain algérien",
            type_activite: "atelier",
            heure_debut: "14:00:00",
            heure_fin: "17:00:00",
            ordre: 3,
            nb_participants_max: 15,
            niveau_requis: "debutant",
            materiel_requis: ["Tablier", "Matériel fourni"]
          },
          {
            titre: "Table ronde : L'art contemporain en Algérie",
            description: "Débat avec artistes, critiques et collectionneurs",
            type_activite: "debat",
            heure_debut: "16:00:00",
            heure_fin: "18:00:00",
            ordre: 4,
            nb_participants_max: 50,
            enregistrement_autorise: true
          }
        ]
      },
      // Programmes pour la Projection Cinéma
      {
        eventName: "Projection - Cinéma Algérien Contemporain",
        programmes: [
          {
            titre: "Projection du film 'Les Terrasses' de Merzak Allouache",
            description: "Projection du film culte suivie d'un débat",
            type_activite: "projection",
            heure_debut: "19:00:00",
            heure_fin: "21:00:00",
            ordre: 1,
            nb_participants_max: 150
          },
          {
            titre: "Débat avec le réalisateur",
            description: "Rencontre et échange avec Merzak Allouache",
            type_activite: "debat",
            heure_debut: "21:00:00",
            heure_fin: "22:00:00",
            ordre: 2,
            nb_participants_max: 150,
            enregistrement_autorise: false
          }
        ]
      },
      // Programmes pour l'Atelier d'Écriture
      {
        eventName: "Atelier d'Écriture Créative",
        programmes: [
          {
            titre: "Introduction à l'écriture créative",
            description: "Les bases de l'écriture créative et exercices pratiques",
            type_activite: "formation",
            heure_debut: "09:00:00",
            heure_fin: "12:00:00",
            ordre: 1,
            nb_participants_max: 20,
            niveau_requis: "debutant"
          },
          {
            titre: "Atelier d'écriture de nouvelles",
            description: "Techniques spécifiques pour l'écriture de nouvelles",
            type_activite: "atelier",
            heure_debut: "14:00:00",
            heure_fin: "17:00:00",
            ordre: 2,
            nb_participants_max: 20,
            materiel_requis: ["Ordinateur portable ou cahier"]
          },
          {
            titre: "Lecture publique des textes",
            description: "Les participants lisent leurs créations",
            type_activite: "lecture",
            heure_debut: "17:30:00",
            heure_fin: "19:00:00",
            ordre: 3,
            nb_participants_max: 50
          }
        ]
      }
    ];

    // Créer les programmes
    for (const eventData of programmesData) {
      const event = evenements.find(e => e.nom_evenement === eventData.eventName);
      if (!event) {
        console.log(`⚠️  Événement non trouvé: ${eventData.eventName}`);
        continue;
      }

      console.log(`\n📅 Programmes pour: ${eventData.eventName}`);
      
      for (const prog of eventData.programmes) {
        try {
          // Calculer les dates complètes en fonction de la date de l'événement
          const eventDate = new Date(event.date_debut);
          const heureDebut = new Date(eventDate);
          const heureFin = new Date(eventDate);
          
          // Ajouter l'heure au jour
          const [hd, md, sd] = prog.heure_debut.split(':');
          heureDebut.setHours(parseInt(hd), parseInt(md), parseInt(sd));
          
          const [hf, mf, sf] = prog.heure_fin.split(':');
          heureFin.setHours(parseInt(hf), parseInt(mf), parseInt(sf));

          const programme = await models.Programme.create({
            ...prog,
            id_evenement: event.id_evenement,
            id_lieu: event.id_lieu,
            heure_debut: heureDebut,
            heure_fin: heureFin,
            statut: 'planifie'
          });
          
          console.log(`  ✅ Programme créé: ${prog.titre}`);
        } catch (error) {
          console.log(`  ❌ Erreur programme ${prog.titre}: ${error.message}`);
        }
      }
    }

    // ========== ÉTAPE 3: Créer des commentaires ==========
    console.log('\n\n💬 Création des commentaires...');
    
    const commentairesData = [
      {
        eventName: "Festival de Musique Andalouse 2025",
        commentaires: [
          {
            userEmail: "f.saidi@test.com",
            contenu: "J'ai assisté à l'édition précédente et c'était magnifique ! J'ai hâte de revivre cette expérience.",
            note_qualite: 5
          },
          {
            userEmail: "a.ziani@journal.dz",
            contenu: "Un événement incontournable pour tous les amateurs de musique andalouse. La programmation s'annonce exceptionnelle.",
            note_qualite: 5
          },
          {
            userEmail: "s.boudiaf@music.dz",
            contenu: "En tant que compositeur, je trouve ce festival essentiel pour la préservation de notre patrimoine musical.",
            note_qualite: 5
          }
        ]
      },
      {
        eventName: "Exposition Art Contemporain - Visions d'Algérie",
        commentaires: [
          {
            userEmail: "f.saidi@test.com",
            contenu: "Les œuvres exposées l'année dernière étaient vraiment impressionnantes. Vivement cette nouvelle édition !",
            note_qualite: 4
          },
          {
            userEmail: "a.ziani@journal.dz",
            contenu: "Une belle initiative pour promouvoir l'art contemporain algérien. J'ai hâte de découvrir les nouveaux talents.",
            note_qualite: 5
          }
        ]
      },
      {
        eventName: "Projection - Cinéma Algérien Contemporain",
        commentaires: [
          {
            userEmail: "f.saidi@test.com",
            contenu: "Excellente idée de projeter ce classique ! J'espère qu'il y aura d'autres films programmés.",
            note_qualite: 4
          },
          {
            userEmail: "k.mammeri@cinema.dz",
            contenu: "Ravi de pouvoir présenter ce film et d'échanger avec le public sur le cinéma algérien.",
            note_qualite: null
          }
        ]
      }
    ];

    // Créer les commentaires principaux
    const commentairesCreated = [];
    
    for (const eventComments of commentairesData) {
      const event = evenements.find(e => e.nom_evenement === eventComments.eventName);
      if (!event) continue;
      
      console.log(`\n💬 Commentaires pour: ${eventComments.eventName}`);
      
      for (const comm of eventComments.commentaires) {
        const user = users.find(u => u.email === comm.userEmail);
        if (!user) continue;
        
        try {
          const commentaire = await models.Commentaire.create({
            contenu: comm.contenu,
            id_user: user.id_user,
            id_evenement: event.id_evenement,
            note_qualite: comm.note_qualite,
            statut: 'publie'
          });
          
          commentairesCreated.push({
            id: commentaire.id_commentaire,
            event: event.nom_evenement,
            user: `${user.prenom} ${user.nom}`
          });
          
          console.log(`  ✅ Commentaire de ${user.prenom} ${user.nom}`);
        } catch (error) {
          console.log(`  ❌ Erreur commentaire: ${error.message}`);
        }
      }
    }

    // ========== ÉTAPE 4: Créer des réponses aux commentaires ==========
    console.log('\n\n💬 Création des réponses aux commentaires...');
    
    const reponsesData = [
      {
        commentaireIndex: 0, // Premier commentaire
        reponses: [
          {
            userEmail: "m.benali@test.dz",
            contenu: "Merci pour votre enthousiasme ! Cette édition sera encore plus riche avec de nouveaux artistes invités."
          },
          {
            userEmail: "a.khedda@musee.dz",
            contenu: "Je confirme, l'édition précédente était exceptionnelle. À ne pas manquer !"
          }
        ]
      },
      {
        commentaireIndex: 3, // Commentaire sur l'exposition
        reponses: [
          {
            userEmail: "a.khedda@musee.dz",
            contenu: "Nous avons préparé une sélection d'œuvres vraiment unique cette année. Vous ne serez pas déçus !"
          }
        ]
      }
    ];

    // Créer les réponses
    for (const reponseData of reponsesData) {
      if (reponseData.commentaireIndex >= commentairesCreated.length) continue;
      
      const parentComment = commentairesCreated[reponseData.commentaireIndex];
      console.log(`\n📝 Réponses au commentaire de ${parentComment.user} sur ${parentComment.event}`);
      
      for (const rep of reponseData.reponses) {
        const user = users.find(u => u.email === rep.userEmail);
        if (!user) continue;
        
        try {
          await models.Commentaire.create({
            contenu: rep.contenu,
            id_user: user.id_user,
            id_evenement: parentComment.event ? evenements.find(e => e.nom_evenement === parentComment.event)?.id_evenement : null,
            commentaire_parent_id: parentComment.id,
            statut: 'publie'
          });
          
          console.log(`  ✅ Réponse de ${user.prenom} ${user.nom}`);
        } catch (error) {
          console.log(`  ❌ Erreur réponse: ${error.message}`);
        }
      }
    }

    // ========== RÉSUMÉ ==========
    console.log('\n\n📊 Résumé des créations:');
    
    // Compter les programmes créés
    const programmesCount = await models.Programme.count();
    console.log(`- ${programmesCount} programmes au total`);
    
    // Compter les commentaires
    const commentairesCount = await models.Commentaire.count({
      where: { commentaire_parent_id: null }
    });
    const reponsesCount = await models.Commentaire.count({
      where: { commentaire_parent_id: { [Sequelize.Op.ne]: null } }
    });
    console.log(`- ${commentairesCount} commentaires principaux`);
    console.log(`- ${reponsesCount} réponses aux commentaires`);

    console.log('\n🎉 Seed des programmes et commentaires terminé !');

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n👋 Connexion fermée');
  }
}

// Exécuter
seedProgrammesCommentaires();