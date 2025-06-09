require('dotenv').config();
const bcrypt = require('bcrypt');
const { initializeDatabase } = require('../models');

const seedData = async (models) => {
  try {
    console.log('🌱 Insertion des données de test...');

    // Créer un utilisateur administrateur
    const adminPassword = await bcrypt.hash('admin123456', 12);
    const [admin] = await models.User.findOrCreate({
      where: { email: 'admin@actionculture.dz' },
      defaults: {
        nom: 'Administrateur',
        prenom: 'Système',
        email: 'admin@actionculture.dz',
        password: adminPassword,
        type_user: 'visiteur',
        biographie: 'Compte administrateur du système Action Culture',
        accepte_conditions: true,  // ✅ OBLIGATOIRE
        accepte_newsletter: false,
        statut: 'actif'
      }
    });

    // Assigner le rôle administrateur
    const adminRole = await models.Role.findOne({ where: { nom_role: 'Administrateur' } });
    if (adminRole) {
      await models.UserRole.findOrCreate({
        where: { id_user: admin.id_user, id_role: adminRole.id_role },
        defaults: { id_user: admin.id_user, id_role: adminRole.id_role }
      });
    }

    // Créer quelques utilisateurs de test
    const testUsers = [
      {
        nom: 'Kateb',
        prenom: 'Yacine',
        email: 'kateb.yacine@test.com',
        type_user: 'ecrivain',
        biographie: 'Écrivain algérien célèbre',
        accepte_conditions: true,  // ✅ OBLIGATOIRE
        accepte_newsletter: false,
        statut: 'actif'
      },
      {
        nom: 'Dib',
        prenom: 'Mohammed',
        email: 'mohammed.dib@test.com',
        type_user: 'ecrivain',
        biographie: 'Romancier et poète algérien',
        accepte_conditions: true,  // ✅ OBLIGATOIRE
        accepte_newsletter: false,
        statut: 'actif'
      },
      {
        nom: 'Assia',
        prenom: 'Djebar',
        email: 'assia.djebar@test.com',
        type_user: 'ecrivain',
        biographie: 'Romancière et cinéaste algérienne',
        accepte_conditions: true,  // ✅ OBLIGATOIRE
        accepte_newsletter: false,
        statut: 'actif'
      }
    ];

    const userRole = await models.Role.findOne({ where: { nom_role: 'Utilisateur' } });
    
    for (const userData of testUsers) {
      const password = await bcrypt.hash('password123', 12);
      const [user] = await models.User.findOrCreate({
        where: { email: userData.email },
        defaults: { 
          ...userData, 
          password
        }
      });

      if (userRole) {
        await models.UserRole.findOrCreate({
          where: { id_user: user.id_user, id_role: userRole.id_role },
          defaults: { id_user: user.id_user, id_role: userRole.id_role }
        });
      }
    }

    // Créer quelques œuvres de test
    const typeOeuvreLivre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Livre' } });
    const langueFrancais = await models.Langue.findOne({ where: { code: 'fr' } });
    const langueArabe = await models.Langue.findOne({ where: { code: 'ar' } });
    const categorieRoman = await models.Categorie.findOne({ where: { nom: 'Roman' } });

    if (typeOeuvreLivre && langueFrancais && categorieRoman) {
      const oeuvres = [
        {
          titre: 'Nedjma',
          annee_creation: 1956,
          description: 'Roman emblématique de la littérature algérienne',
          auteur_email: 'kateb.yacine@test.com'
        },
        {
          titre: 'La Grande Maison',
          annee_creation: 1952,
          description: 'Premier roman de Mohammed Dib',
          auteur_email: 'mohammed.dib@test.com'
        },
        {
          titre: 'L\'Amour, la fantasia',
          annee_creation: 1985,
          description: 'Roman autobiographique d\'Assia Djebar',
          auteur_email: 'assia.djebar@test.com'
        }
      ];

      for (const oeuvreData of oeuvres) {
        const auteur = await models.User.findOne({ where: { email: oeuvreData.auteur_email } });
        
        const [oeuvre] = await models.Oeuvre.findOrCreate({
          where: { titre: oeuvreData.titre },
          defaults: {
            titre: oeuvreData.titre,
            id_type_oeuvre: typeOeuvreLivre.id_type_oeuvre,
            id_langue: langueFrancais.id_langue,
            annee_creation: oeuvreData.annee_creation,
            description: oeuvreData.description,
            saisi_par: auteur?.id_user,
            statut: 'publie'
          }
        });

        // Associer à la catégorie
        await oeuvre.addCategorie(categorieRoman);

        // Associer l'auteur
        if (auteur) {
          await models.OeuvreUser.findOrCreate({
            where: { id_oeuvre: oeuvre.id_oeuvre, id_user: auteur.id_user },
            defaults: {
              id_oeuvre: oeuvre.id_oeuvre,
              id_user: auteur.id_user,
              role_dans_oeuvre: 'auteur',
              role_principal: true
            }
          });
        }
      }
    }

    console.log('✅ Données de test insérées avec succès');
    console.log('👤 Compte admin: admin@actionculture.dz / admin123456');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données de test:', error);
    throw error;
  }
};

const main = async () => {
  try {
    const config = {
      database: process.env.DB_NAME || 'actionculture',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      logging: false
    };
    
    const { sequelize, models } = await initializeDatabase(config);
    await seedData(models);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

main();