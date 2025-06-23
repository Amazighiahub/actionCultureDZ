// scripts/seedOeuvres.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
// Configurer faker en français
faker.locale = 'fr';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@actionculture.dz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminPassword';

// Générateur d'images placeholder
const PLACEHOLDER_IMAGES = {
  livre: 'https://via.placeholder.com/600x800/4a5568/ffffff?text=Livre',
  film: 'https://via.placeholder.com/800x450/2d3748/ffffff?text=Film',
  album: 'https://via.placeholder.com/600x600/805ad5/ffffff?text=Album',
  article: 'https://via.placeholder.com/800x400/3182ce/ffffff?text=Article',
  art: 'https://via.placeholder.com/600x800/d69e2e/ffffff?text=Art'
};

class OeuvreSeeder {
  constructor() {
    this.token = null;
    this.metadata = {};
    this.user = null;
  }

  // Authentification
  async authenticate() {
    try {
      console.log('🔐 Tentative de connexion...');
      console.log('   Email:', ADMIN_EMAIL);
      console.log('   URL:', `${API_BASE_URL}/users/login`);
      
      // Essayer de se connecter
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        
        this.token = loginResponse.data.data.token;
        this.user = loginResponse.data.data.user;
        console.log('✅ Connexion réussie:', this.user.email);
        return;
      } catch (error) {
        console.log('⚠️ Connexion échouée:', error.response?.data?.error || error.message);
        console.log('📝 Tentative de création d\'un compte professionnel...');
      }

      // Si la connexion échoue, créer un compte professionnel
      const registerResponse = await axios.post(`${API_BASE_URL}/users/register`, {
        nom: 'Seeder',
        prenom: 'Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        type_user: 'ecrivain', // Professionnel pour pouvoir créer des œuvres
        accepte_conditions: true,
        accepte_newsletter: false
      });

      this.token = registerResponse.data.data.token;
      this.user = registerResponse.data.data.user;
      console.log('✅ Compte créé:', this.user.email);
      console.log('   Type:', this.user.type_user);
      console.log('   Token reçu:', this.token ? 'Oui' : 'Non');

    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error.response?.data || error.message);
      if (error.response?.status === 409) {
        console.log('ℹ️  L\'utilisateur existe déjà mais la connexion a échoué.');
        console.log('   Vérifiez le mot de passe dans le fichier .env');
      }
      throw error;
    }
  }

  // Récupération des métadonnées
  async loadMetadata() {
    try {
      console.log('\n📋 Chargement des métadonnées...');
      console.log('   URL:', `${API_BASE_URL}/metadata/all`);
      
      const headers = this.token ? {
        'Authorization': `Bearer ${this.token}`
      } : {};
      
      const response = await axios.get(`${API_BASE_URL}/metadata/all`, { headers });
      
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      
      this.metadata = response.data.data || {};
      
      console.log('\n✅ Métadonnées chargées:');
      console.log(`  - ${this.metadata.langues?.length || 0} langues`);
      console.log(`  - ${this.metadata.categories?.length || 0} catégories`);
      console.log(`  - ${this.metadata.genres?.length || 0} genres`);
      console.log(`  - ${this.metadata.types_oeuvres?.length || 0} types d'œuvres`);
      console.log(`  - ${this.metadata.editeurs?.length || 0} éditeurs`);
      
      // Afficher les types d'œuvres disponibles
      if (this.metadata.types_oeuvres?.length > 0) {
        console.log('\n📚 Types d\'œuvres disponibles:');
        this.metadata.types_oeuvres.forEach(type => {
          console.log(`  - ${type.nom_type} (ID: ${type.id_type_oeuvre})`);
        });
      } else {
        console.log('\n⚠️  Aucun type d\'œuvre trouvé dans les métadonnées!');
        console.log('   Vérifiez que la table types_oeuvres contient des données.');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des métadonnées:');
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error || error.message);
      
      if (error.response?.status === 401) {
        console.error('   ℹ️  Erreur d\'authentification. Le token peut être invalide.');
      }
      
      // Continuer avec des métadonnées vides
      this.metadata = {
        langues: [],
        categories: [],
        genres: [],
        types_oeuvres: [],
        editeurs: []
      };
    }
  }

  // Générateurs de données selon le type
  generateLivreData() {
    const genres = ['Roman', 'Poésie', 'Théâtre', 'Essai', 'Nouvelle', 'Biographie'];
    
    return {
      titre: faker.lorem.words(faker.number.int({ min: 2, max: 5 })),
      description: faker.lorem.paragraphs(3),
      annee_creation: faker.number.int({ min: 1950, max: new Date().getFullYear() }),
      categories: faker.helpers.arrayElements(
        this.metadata.categories?.map(c => c.id_categorie) || [], 
        faker.number.int({ min: 1, max: 3 })
      ),
      tags: faker.helpers.arrayElements([
        'littérature', 'culture', 'algérie', 'maghreb', 'francophonie',
        'roman', 'histoire', 'société', 'tradition', 'modernité'
      ], faker.number.int({ min: 2, max: 5 })),
      editeurs: this.metadata.editeurs?.length > 0 ? [{
        id_editeur: faker.helpers.arrayElement(this.metadata.editeurs).id_editeur,
        role_editeur: 'principal',
        date_edition: faker.date.recent().toISOString().split('T')[0],
        isbn_editeur: faker.string.numeric(13),
        tirage: faker.number.int({ min: 500, max: 10000 }),
        prix_vente: faker.number.float({ min: 500, max: 3000, precision: 0.01 })
      }] : [],
      details_specifiques: {
        livre: {
          isbn: faker.string.numeric(13),
          nb_pages: faker.number.int({ min: 100, max: 600 }),
          id_genre: this.metadata.genres?.length > 0 
            ? faker.helpers.arrayElement(this.metadata.genres).id_genre 
            : null
        }
      }
    };
  }

  generateFilmData() {
    const realisateurs = [
      'Merzak Allouache', 'Nadir Moknèche', 'Djamila Sahraoui', 
      'Belkacem Hadjadj', 'Rabah Ameur-Zaïmeche'
    ];
    
    return {
      titre: faker.lorem.words(faker.number.int({ min: 2, max: 4 })),
      description: faker.lorem.paragraphs(2),
      annee_creation: faker.number.int({ min: 1970, max: new Date().getFullYear() }),
      categories: faker.helpers.arrayElements(
        this.metadata.categories?.map(c => c.id_categorie) || [], 
        faker.number.int({ min: 1, max: 2 })
      ),
      tags: faker.helpers.arrayElements([
        'cinéma', 'film', 'algérie', 'drame', 'documentaire',
        'court-métrage', 'long-métrage', 'festival', 'production'
      ], faker.number.int({ min: 2, max: 4 })),
      details_specifiques: {
        film: {
          duree_minutes: faker.number.int({ min: 20, max: 180 }),
          realisateur: faker.helpers.arrayElement(realisateurs),
          id_genre: this.metadata.genres?.length > 0 
            ? faker.helpers.arrayElement(this.metadata.genres).id_genre 
            : null
        }
      }
    };
  }

  generateAlbumData() {
    const labels = ['Dounia Production', 'Blue Note', 'Sawt Records', 'Atlas Music'];
    const artistes = ['Souad Massi', 'Khaled', 'Rachid Taha', 'Idir', 'Lounès Matoub'];
    
    return {
      titre: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
      description: faker.lorem.paragraph(),
      annee_creation: faker.number.int({ min: 1980, max: new Date().getFullYear() }),
      categories: faker.helpers.arrayElements(
        this.metadata.categories?.map(c => c.id_categorie) || [], 
        faker.number.int({ min: 1, max: 2 })
      ),
      tags: faker.helpers.arrayElements([
        'musique', 'album', 'rai', 'chaabi', 'kabyle',
        'fusion', 'traditionnel', 'moderne', 'world music'
      ], faker.number.int({ min: 2, max: 4 })),
      details_specifiques: {
        album: {
          duree: faker.number.int({ min: 30, max: 80 }),
          label: faker.helpers.arrayElement(labels),
          id_genre: this.metadata.genres?.length > 0 
            ? faker.helpers.arrayElement(this.metadata.genres).id_genre 
            : null
        }
      }
    };
  }

  generateArticleData() {
    const sources = ['El Watan', 'Liberté', 'Le Soir d\'Algérie', 'TSA', 'APS'];
    const auteurs = ['Ahmed Bencherif', 'Samira Hadj', 'Karim Mansouri', 'Leila Aït'];
    
    return {
      titre: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      annee_creation: faker.number.int({ min: 2010, max: new Date().getFullYear() }),
      categories: faker.helpers.arrayElements(
        this.metadata.categories?.map(c => c.id_categorie) || [], 
        faker.number.int({ min: 1, max: 2 })
      ),
      tags: faker.helpers.arrayElements([
        'presse', 'actualité', 'culture', 'société', 'analyse',
        'chronique', 'reportage', 'interview', 'opinion'
      ], faker.number.int({ min: 2, max: 4 })),
      details_specifiques: {
        article: {
          auteur: faker.helpers.arrayElement(auteurs),
          source: faker.helpers.arrayElement(sources),
          type_article: faker.helpers.arrayElement(['analyse', 'chronique', 'reportage', 'interview']),
          categorie: faker.helpers.arrayElement(['culture', 'société', 'politique', 'économie']),
          date_publication: faker.date.recent().toISOString().split('T')[0],
          url_source: faker.internet.url()
        }
      }
    };
  }

  generateOeuvreArtData() {
    const techniques = ['Peinture à l\'huile', 'Aquarelle', 'Acrylique', 'Technique mixte', 'Collage'];
    const supports = ['Toile', 'Papier', 'Bois', 'Métal', 'Tissu'];
    
    return {
      titre: faker.lorem.words(faker.number.int({ min: 1, max: 3 })),
      description: faker.lorem.paragraph(),
      annee_creation: faker.number.int({ min: 1960, max: new Date().getFullYear() }),
      categories: faker.helpers.arrayElements(
        this.metadata.categories?.map(c => c.id_categorie) || [], 
        faker.number.int({ min: 1, max: 2 })
      ),
      tags: faker.helpers.arrayElements([
        'art', 'peinture', 'contemporain', 'moderne', 'abstrait',
        'figuratif', 'calligraphie', 'miniature', 'berbère'
      ], faker.number.int({ min: 2, max: 4 })),
      details_specifiques: {
        oeuvre_art: {
          technique: faker.helpers.arrayElement(techniques),
          dimensions: `${faker.number.int({ min: 30, max: 200 })}x${faker.number.int({ min: 30, max: 200 })} cm`,
          support: faker.helpers.arrayElement(supports)
        }
      }
    };
  }

  // Création d'une œuvre
  async createOeuvre(oeuvreData, typeOeuvre) {
    try {
      console.log(`\n📝 Création d'une œuvre de type: ${typeOeuvre.nom_type}`);
      console.log(`   Titre: ${oeuvreData.titre}`);
      
      const response = await axios.post(
        `${API_BASE_URL}/oeuvres`,
        {
          ...oeuvreData,
          id_type_oeuvre: typeOeuvre.id_type_oeuvre,
          id_langue: faker.helpers.arrayElement(this.metadata.langues).id_langue
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Œuvre créée avec l'ID: ${response.data.data.id_oeuvre}`);
      return response.data.data;

    } catch (error) {
      console.error(`❌ Erreur lors de la création de l'œuvre:`, error.response?.data || error.message);
      return null;
    }
  }

  // Upload d'un média pour une œuvre
  async uploadMediaForOeuvre(oeuvreId, mediaType) {
    try {
      console.log(`   📸 Upload d'un média pour l'œuvre ${oeuvreId}...`);
      
      // Pour la démo, on simule avec une image placeholder
      // Dans un cas réel, vous devriez télécharger et utiliser de vraies images
      const placeholderUrl = PLACEHOLDER_IMAGES[mediaType] || PLACEHOLDER_IMAGES.livre;
      
      // Créer un fichier temporaire (simulé)
      const formData = new FormData();
      
      // Simuler l'ajout d'un fichier
      // En production, vous devriez utiliser de vrais fichiers
      formData.append('files', Buffer.from('fake-image-data'), {
        filename: `${mediaType}-${Date.now()}.jpg`,
        contentType: 'image/jpeg'
      });
      
      formData.append('titre', faker.lorem.words(3));
      formData.append('description', faker.lorem.sentence());
      formData.append('ordre', '1');

      const response = await axios.post(
        `${API_BASE_URL}/oeuvres/${oeuvreId}/medias/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            ...formData.getHeaders()
          }
        }
      );

      console.log(`   ✅ Média uploadé avec succès`);
      return response.data.data;

    } catch (error) {
      console.error(`   ❌ Erreur lors de l'upload du média:`, error.response?.data || error.message);
      return null;
    }
  }

  // Méthode principale pour générer les œuvres
  async generateOeuvres(count = 5) {
    try {
      console.log(`\n🚀 Début du processus de génération...`);
      
      // Authentification
      try {
        await this.authenticate();
      } catch (error) {
        console.error('\n❌ Impossible de s\'authentifier. Arrêt du script.');
        return;
      }
      
      // Charger les métadonnées
      await this.loadMetadata();

      // Vérifier les données essentielles
      if (!this.metadata.langues || this.metadata.langues.length === 0) {
        console.error('\n❌ Aucune langue disponible dans la base de données.');
        console.log('   Assurez-vous que la table "langues" contient des données.');
        return;
      }

      // Filtrer les types d'œuvres (exclure artisanat)
      const typesOeuvres = this.metadata.types_oeuvres?.filter(
        type => !type.nom_type.toLowerCase().includes('artisanat')
      ) || [];

      if (typesOeuvres.length === 0) {
        console.error('\n❌ Aucun type d\'œuvre disponible');
        console.log('   Solutions possibles:');
        console.log('   1. Vérifiez que la table "types_oeuvres" contient des données');
        console.log('   2. Exécutez les migrations/seeds de la base de données');
        console.log('   3. Ajoutez manuellement des types d\'œuvres dans la table');
        console.log('\n   Exemple SQL:');
        console.log('   INSERT INTO types_oeuvres (nom_type, description) VALUES');
        console.log('   (\'Livre\', \'Œuvre littéraire\'),');
        console.log('   (\'Film\', \'Œuvre cinématographique\'),');
        console.log('   (\'Album musical\', \'Œuvre musicale\'),');
        console.log('   (\'Article\', \'Article de presse ou blog\'),');
        console.log('   (\'Oeuvre art\', \'Œuvre d\'art visuel\');');
        return;
      }

      console.log(`\n🎨 Génération de ${count} œuvres...`);
      console.log(`   Types disponibles: ${typesOeuvres.map(t => t.nom_type).join(', ')}`);
      
      const results = {
        total: 0,
        success: 0,
        failed: 0,
        oeuvres: []
      };

      // Générateurs par type
      const generators = {
        'livre': this.generateLivreData.bind(this),
        'film': this.generateFilmData.bind(this),
        'album musical': this.generateAlbumData.bind(this),
        'album': this.generateAlbumData.bind(this),
        'article': this.generateArticleData.bind(this),
        'oeuvre art': this.generateOeuvreArtData.bind(this),
        'art': this.generateOeuvreArtData.bind(this)
      };

      for (let i = 0; i < count; i++) {
        results.total++;
        
        // Sélectionner un type d'œuvre aléatoire
        const typeOeuvre = faker.helpers.arrayElement(typesOeuvres);
        const typeName = typeOeuvre.nom_type.toLowerCase();
        
        // Trouver le générateur approprié
        let generator = null;
        for (const [key, gen] of Object.entries(generators)) {
          if (typeName.includes(key)) {
            generator = gen;
            break;
          }
        }
        
        if (!generator) {
          console.warn(`⚠️ Pas de générateur pour le type: ${typeOeuvre.nom_type}`);
          generator = this.generateLivreData.bind(this); // Fallback
        }

        // Générer les données
        const oeuvreData = generator();
        
        // Créer l'œuvre
        const oeuvre = await this.createOeuvre(oeuvreData, typeOeuvre);
        
        if (oeuvre) {
          results.success++;
          results.oeuvres.push(oeuvre);
          
          // Optionnel : Upload d'un média (commenté pour éviter les erreurs)
          // await this.uploadMediaForOeuvre(oeuvre.id_oeuvre, typeName);
        } else {
          results.failed++;
        }

        // Petite pause entre les créations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Rapport final
      console.log('\n📊 Rapport de génération:');
      console.log(`  Total tentatives: ${results.total}`);
      console.log(`  ✅ Succès: ${results.success}`);
      console.log(`  ❌ Échecs: ${results.failed}`);
      
      if (results.success > 0) {
        console.log(`\n📚 Types créés:`);
        const typesCreated = [...new Set(results.oeuvres.map(o => o.TypeOeuvre?.nom_type).filter(Boolean))];
        typesCreated.forEach(type => console.log(`  - ${type}`));
      }

      return results;

    } catch (error) {
      console.error('\n❌ Erreur fatale:', error.message);
      if (error.response) {
        console.error('   Response data:', error.response.data);
      }
      throw error;
    }
  }
}

// Exécution du script
async function main() {
  console.log('🚀 Démarrage du script de génération d\'œuvres');
  console.log(`📡 API URL: ${API_BASE_URL}`);
  console.log(`👤 Email: ${ADMIN_EMAIL}`);
  console.log(`🔒 Password: ${'*'.repeat(ADMIN_PASSWORD.length)}`);
  console.log('─'.repeat(50));
  
  const seeder = new OeuvreSeeder();
  
  try {
    // Récupérer le nombre d'œuvres à générer depuis les arguments
    const count = parseInt(process.argv[2]) || 10;
    
    await seeder.generateOeuvres(count);
    
    console.log('\n✨ Script terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (require.main === module) {
  main();
}

module.exports = OeuvreSeeder;