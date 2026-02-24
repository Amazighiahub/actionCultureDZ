// seedOeuvres.js
require('dotenv').config();
const { faker } = require('@faker-js/faker/locale/fr');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const { initializeDatabase } = require('../models');
const sharp = require('sharp');
// Configuration faker
faker.locale = 'fr';

// Données de référence culturelles algériennes
const DONNEES_REFERENCE = {
  langues: [
    { nom: 'Arabe', code: 'ar' },
    { nom: 'Français', code: 'fr' },
    { nom: 'Tamazight', code: 'ber' },
    { nom: 'Anglais', code: 'en' }
  ],
  
  typesOeuvre: [
    { nom_type: 'Livre', description: 'Œuvre littéraire écrite' },
    { nom_type: 'Film', description: 'Œuvre cinématographique' },
    { nom_type: 'Album Musical', description: 'Œuvre musicale' },
    { nom_type: 'Article', description: 'Article de presse ou blog' },
    { nom_type: 'Article Scientifique', description: 'Publication scientifique' },
    { nom_type: 'Artisanat', description: 'Œuvre artisanale traditionnelle' },
    { nom_type: 'Art', description: 'Œuvre d\'art visuel' }
  ],
  
  genres: {
    livre: ['Roman', 'Nouvelle', 'Poésie', 'Essai', 'Théâtre', 'Conte', 'Biographie', 'Histoire'],
    film: ['Drame', 'Comédie', 'Documentaire', 'Court-métrage', 'Animation', 'Thriller'],
    musique: ['Chaâbi', 'Raï', 'Andalou', 'Kabyle', 'Gnawa', 'Moderne', 'Classique'],
    article: ['Culture', 'Société', 'Politique', 'Économie', 'Sport', 'Technologie'],
    artisanat: ['Poterie', 'Tissage', 'Bijouterie', 'Maroquinerie', 'Céramique', 'Vannerie']
  },
  
  categories: [
    { nom: 'Patrimoine culturel', description: 'Œuvres du patrimoine algérien', couleur: '#8B4513' },
    { nom: 'Art contemporain', description: 'Créations artistiques modernes', couleur: '#FF6347' },
    { nom: 'Littérature', description: 'Œuvres littéraires', couleur: '#4B0082' },
    { nom: 'Cinéma', description: 'Productions cinématographiques', couleur: '#DC143C' },
    { nom: 'Musique', description: 'Œuvres musicales', couleur: '#FF1493' },
    { nom: 'Artisanat traditionnel', description: 'Savoir-faire traditionnel', couleur: '#DAA520' },
    { nom: 'Recherche', description: 'Publications scientifiques', couleur: '#00CED1' }
  ],
  
  materiaux: [
    { nom: 'Argile', description: 'Matériau traditionnel pour la poterie' },
    { nom: 'Laine', description: 'Fibre naturelle pour le tissage' },
    { nom: 'Cuir', description: 'Matériau pour la maroquinerie' },
    { nom: 'Bois', description: 'Matériau pour la sculpture et l\'ébénisterie' },
    { nom: 'Cuivre', description: 'Métal pour l\'artisanat traditionnel' },
    { nom: 'Argent', description: 'Métal précieux pour la bijouterie' }
  ],
  
  techniques: [
    { nom: 'Tissage traditionnel', description: 'Technique ancestrale de tissage' },
    { nom: 'Poterie au tour', description: 'Façonnage de l\'argile au tour' },
    { nom: 'Gravure sur cuivre', description: 'Art de la dinanderie' },
    { nom: 'Broderie', description: 'Art de la broderie traditionnelle' },
    { nom: 'Tannage', description: 'Traitement du cuir' },
    { nom: 'Ciselure', description: 'Travail du métal' }
  ],
  
  tags: [
    'Culture algérienne', 'Patrimoine', 'Tradition', 'Modernité', 'Innovation',
    'Art populaire', 'Identité', 'Mémoire collective', 'Transmission', 'Savoir-faire',
    'Diversité culturelle', 'Création contemporaine', 'Héritage', 'Authenticité'
  ],
  
  editeurs: [
    { nom: 'Éditions Barzakh', ville: 'Alger', specialite: 'Littérature', type_editeur: 'maison_edition' },
    { nom: 'Éditions Casbah', ville: 'Alger', specialite: 'Général', type_editeur: 'maison_edition' },
    { nom: 'ENAG Éditions', ville: 'Alger', specialite: 'Scolaire et universitaire', type_editeur: 'editeur_scientifique' },
    { nom: 'Éditions Chihab', ville: 'Batna', specialite: 'Littérature arabe', type_editeur: 'maison_edition' },
    { nom: 'Éditions Alpha', ville: 'Alger', specialite: 'Sciences humaines', type_editeur: 'editeur_scientifique' },
    { nom: 'Éditions Dalimen', ville: 'Alger', specialite: 'Art et culture', type_editeur: 'maison_edition' }
  ]
};

// Œuvres culturelles algériennes réelles
const OEUVRES_REELLES = {
  livres: [
    {
      titre: 'Nedjma',
      auteur: { 
        nom: 'Yacine', 
        prenom: 'Kateb',
        date_naissance: '1929-08-02',
        lieu_naissance: 'Constantine, Algérie',
        date_deces: '1989-10-28',
        lieu_deces: 'Grenoble, France',
        prix_distinctions: [
          {nom: 'Grand Prix national des Lettres', annee: 1987}
        ]
      },
      annee: 1956,
      description: 'Roman majeur de la littérature algérienne, œuvre complexe et poétique sur l\'Algérie coloniale',
      genre: 'Roman'
    },
    {
      titre: 'Le Fils du pauvre',
      auteur: { 
        nom: 'Feraoun', 
        prenom: 'Mouloud',
        date_naissance: '1913-03-08',
        lieu_naissance: 'Tizi Hibel, Algérie',
        date_deces: '1962-03-15',
        lieu_deces: 'Alger, Algérie',
        biographie: 'Écrivain et enseignant kabyle, assassiné par l\'OAS'
      },
      annee: 1950,
      description: 'Roman autobiographique décrivant la vie en Kabylie au début du XXe siècle',
      genre: 'Roman'
    },
    {
      titre: 'La Grande Maison',
      auteur: { 
        nom: 'Dib', 
        prenom: 'Mohammed',
        date_naissance: '1920-07-21',
        lieu_naissance: 'Tlemcen, Algérie',
        date_deces: '2003-05-02',
        lieu_deces: 'La Celle-Saint-Cloud, France',
        prix_distinctions: [
          {nom: 'Grand Prix de la Francophonie', annee: 1994}
        ]
      },
      annee: 1952,
      description: 'Premier volet de la trilogie Algérie, chronique de la vie à Tlemcen',
      genre: 'Roman'
    },
    {
      titre: 'L\'Opium et le Bâton',
      auteur: { 
        nom: 'Mammeri', 
        prenom: 'Mouloud',
        date_naissance: '1917-12-28',
        lieu_naissance: 'Taourirt Mimoun, Algérie',
        date_deces: '1989-02-26',
        lieu_deces: 'Aïn Defla, Algérie'
      },
      annee: 1965,
      description: 'Roman sur la guerre d\'indépendance algérienne',
      genre: 'Roman'
    },
    {
      titre: 'Que la terre te soit légère',
      auteur: { 
        nom: 'Zaoui', 
        prenom: 'Amin',
        date_naissance: '1956-11-25',
        lieu_naissance: 'Beni Saf, Algérie',
        specialites: ['Roman', 'Nouvelle', 'Essai']
      },
      annee: 2018,
      description: 'Roman contemporain sur l\'exil et la mémoire',
      genre: 'Roman'
    }
  ],
  
  films: [
    {
      titre: 'La Bataille d\'Alger',
      realisateur: { 
        nom: 'Pontecorvo', 
        prenom: 'Gillo',
        date_naissance: '1919-11-19',
        lieu_naissance: 'Pise, Italie',
        date_deces: '2006-10-12',
        lieu_deces: 'Rome, Italie',
        pays_origine: 'Italie'
      },
      annee: 1966,
      description: 'Film historique sur la bataille d\'Alger pendant la guerre d\'indépendance',
      genre: 'Drame'
    },
    {
      titre: 'Chronique des années de braise',
      realisateur: { 
        nom: 'Lakhdar-Hamina', 
        prenom: 'Mohammed',
        date_naissance: '1934-02-26',
        lieu_naissance: 'M\'sila, Algérie',
        prix_distinctions: [
          {nom: 'Palme d\'Or - Festival de Cannes', annee: 1975}
        ]
      },
      annee: 1975,
      description: 'Palme d\'Or à Cannes, fresque historique sur l\'Algérie coloniale',
      genre: 'Drame'
    },
    {
      titre: 'Omar Gatlato',
      realisateur: { 
        nom: 'Allouache', 
        prenom: 'Merzak',
        date_naissance: '1940-10-06',
        lieu_naissance: 'Alger, Algérie'
      },
      annee: 1976,
      description: 'Portrait de la jeunesse algéroise des années 70',
      genre: 'Comédie'
    }
  ],
  
  albums: [
    {
      titre: 'El Menfi',
      artiste: { 
        nom: 'El Anka', 
        prenom: 'El Hadj M\'Hamed',
        date_naissance: '1907-05-20',
        lieu_naissance: 'Casbah d\'Alger, Algérie',
        date_deces: '1978-11-23',
        lieu_deces: 'Alger, Algérie',
        titre_professionnel: 'El Hadj',
        biographie: 'Le cardinal du Chaâbi algérois'
      },
      annee: 1950,
      description: 'Album mythique du maître du Chaâbi algérois',
      genre: 'Chaâbi'
    },
    {
      titre: 'Ya Rayah',
      artiste: { 
        nom: 'Khaled', 
        prenom: 'Cheb',
        date_naissance: '1960-02-29',
        lieu_naissance: 'Oran, Algérie',
        biographie: 'Le roi du Raï moderne'
      },
      annee: 1988,
      description: 'Album emblématique du Raï moderne',
      genre: 'Raï'
    }
  ],
  
  artisanat: [
    {
      titre: 'Tapis des Ait Hichem',
      artisan: { 
        nom: 'Collective', 
        prenom: 'Femmes Ait Hichem',
        organisation: 'Coopérative des tisseuses Ait Hichem',
        specialites: ['Tissage', 'Tapis berbère']
      },
      description: 'Tapis berbère traditionnel de Kabylie aux motifs géométriques',
      type: 'Tissage'
    },
    {
      titre: 'Poterie de Maâtkas',
      artisan: { 
        nom: 'Artisans', 
        prenom: 'Maâtkas',
        organisation: 'Village de potiers de Maâtkas',
        specialites: ['Poterie', 'Céramique traditionnelle']
      },
      description: 'Poterie kabyle traditionnelle décorée de motifs berbères',
      type: 'Poterie'
    }
  ],
  
  articles: [
    {
      titre: 'Le patrimoine architectural de la Casbah d\'Alger',
      auteur: { 
        nom: 'Belkacem', 
        prenom: 'Nabila',
        specialites: ['Architecture', 'Patrimoine'],
        titre_professionnel: 'Dr.'
      },
      description: 'Étude sur la préservation du patrimoine UNESCO de la Casbah',
      type: 'Culture'
    },
    {
      titre: 'La nouvelle génération du cinéma algérien',
      auteur: { 
        nom: 'Hamidi', 
        prenom: 'Karim',
        specialites: ['Cinéma', 'Critique']
      },
      description: 'Analyse du renouveau cinématographique algérien post-2000',
      type: 'Cinéma'
    }
  ],
  
  oeuvresArt: [
    {
      titre: 'Les Femmes d\'Alger dans leur appartement',
      artiste: { 
        nom: 'Racim', 
        prenom: 'Mohammed',
        date_naissance: '1896-06-24',
        lieu_naissance: 'Alger, Algérie',
        date_deces: '1975-03-30',
        lieu_deces: 'Alger, Algérie',
        biographie: 'Fondateur de l\'école algérienne de miniature',
        prix_distinctions: [
          {nom: 'Grand Prix artistique de l\'Algérie', annee: 1933}
        ]
      },
      annee: 1940,
      description: 'Miniature de l\'école d\'Alger',
      type: 'Miniature'
    },
    {
      titre: 'La Ville',
      artiste: { 
        nom: 'Issiakhem', 
        prenom: 'M\'hamed',
        date_naissance: '1928-06-17',
        lieu_naissance: 'Douar Ait Djennad, Algérie',
        date_deces: '1985-12-01',
        lieu_deces: 'Alger, Algérie',
        biographie: 'Peintre expressionniste, cofondateur de l\'Union nationale des arts plastiques'
      },
      annee: 1970,
      description: 'Peinture expressionniste sur la condition humaine',
      type: 'Peinture'
    }
  ]
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

// Récupérer l'utilisateur admin existant
async function getAdmin(models) {
  try {
    if (!models.User) {
      throw new Error('Le modèle User n\'est pas chargé.');
    }
    
    // L'admin existe déjà avec id_user = 2
    const admin = await models.User.findByPk(8);
    
    if (!admin) {
      throw new Error('Admin non trouvé! Assurez-vous que l\'utilisateur avec id=2 existe.');
    }
    
    console.log('✓ Admin trouvé:', admin.email);
    return admin;
  } catch (error) {
    console.error('Erreur récupération admin:', error);
    throw error;
  }
}

// Créer les données de référence
async function creerDonneesReference(models) {
  console.log('Création des données de référence...');
  
  // Langues
  for (const langue of DONNEES_REFERENCE.langues) {
    await models.Langue.findOrCreate({ where: { nom: langue.nom }, defaults: langue });
  }
  
  // Types d'œuvre
  for (const type of DONNEES_REFERENCE.typesOeuvre) {
    await models.TypeOeuvre.findOrCreate({ where: { nom_type: type.nom_type }, defaults: type });
  }
  
  // Genres
  for (const [typeKey, genres] of Object.entries(DONNEES_REFERENCE.genres)) {
    for (const genreName of genres) {
      await models.Genre.findOrCreate({
        where: { nom: genreName },
        defaults: {
          nom: genreName,
          description: `Genre ${genreName}`,
          couleur: faker.color.rgb({ format: 'hex' }),
          actif: true
        }
      });
    }
  }
  
  // Catégories
  for (const cat of DONNEES_REFERENCE.categories) {
    await models.Categorie.findOrCreate({ where: { nom: cat.nom }, defaults: cat });
  }
  
  // Matériaux et techniques
  for (const mat of DONNEES_REFERENCE.materiaux) {
    await models.Materiau.findOrCreate({ where: { nom: mat.nom }, defaults: mat });
  }
  
  for (const tech of DONNEES_REFERENCE.techniques) {
    await models.Technique.findOrCreate({ where: { nom: tech.nom }, defaults: tech });
  }
  
  // Tags
  for (const tagName of DONNEES_REFERENCE.tags) {
    await models.TagMotCle.findOrCreate({ where: { nom: tagName } });
  }
  
  // Éditeurs
  for (const editeur of DONNEES_REFERENCE.editeurs) {
    await models.Editeur.findOrCreate({
      where: { nom: editeur.nom },
      defaults: {
        nom: editeur.nom,
        ville: editeur.ville,
        pays: 'Algérie',
        type_editeur: editeur.type_editeur,
        description: editeur.specialite,
        actif: true
      }
    });
  }
  
  console.log('✓ Données de référence créées');
}

// Créer les médias pour une œuvre
// Correction de la fonction creerMediasPourOeuvre
// IMPORTANT: Cette fonction prend seulement 'oeuvre' en paramètre, pas 'models'

async function creerMediasPourOeuvre(db,oeuvre) {
  const nbImages = faker.number.int({ min: 2, max: 5 });
  const nbDocuments = faker.number.int({ min: 1, max: 3 });
  const medias = [];
  
  // Chemins de base
  const baseUploadPath = path.join(__dirname, '../uploads/oeuvres');
  
  // Images
  for (let i = 0; i < nbImages; i++) {
    const nomFichier = `${oeuvre.id_oeuvre}_${i + 1}.jpg`;
    const nomThumb = `${oeuvre.id_oeuvre}_${i + 1}_thumb.jpg`;
    
    // Chemins complets des fichiers
    const cheminImage = path.join(baseUploadPath, 'images', nomFichier);
    const cheminThumb = path.join(baseUploadPath, 'images/thumbs', nomThumb);
    
    // Créer une image placeholder avec Sharp
    const largeur = 800;
    const hauteur = 600;
    const couleurFond = faker.helpers.arrayElement(['#8B4513', '#D2691E', '#A0522D', '#CD853F']);
    
    // SVG pour l'image placeholder
    const svg = `
      <svg width="${largeur}" height="${hauteur}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${largeur}" height="${hauteur}" fill="${couleurFond}"/>
        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">
          ${oeuvre.titre.substring(0, 30)}
        </text>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle">
          Image ${i + 1}
        </text>
        <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">
          Action Culture
        </text>
      </svg>
    `;
    
    try {
      // Créer l'image principale
      await sharp(Buffer.from(svg))
        .jpeg({ quality: 85 })
        .toFile(cheminImage);
      
      // Créer la miniature
      await sharp(Buffer.from(svg))
        .resize(200, 150)
        .jpeg({ quality: 80 })
        .toFile(cheminThumb);
        
    } catch (error) {
      console.log(`⚠️  Erreur création image: ${error.message}`);
      // Créer une image simple si erreur avec SVG
      await sharp({
        create: {
          width: largeur,
          height: hauteur,
          channels: 3,
          background: { r: 139, g: 69, b: 19 }
        }
      })
      .jpeg({ quality: 85 })
      .toFile(cheminImage);
      
      // Miniature simple
      await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 139, g: 69, b: 19 }
        }
      })
      .jpeg({ quality: 80 })
      .toFile(cheminThumb);
    }
    
    // Créer l'entrée en base de données
    // IMPORTANT: Utiliser 'db' qui est la variable globale, pas 'models'
    const media = await db.Media.create({
      id_oeuvre: oeuvre.id_oeuvre,
      type_media: 'image',
      url: `uploads/oeuvres/images/${nomFichier}`,
      titre: `Image ${i + 1} - ${oeuvre.titre}`,
      description: `Vue ${faker.helpers.arrayElement(['principale', 'détaillée', 'en contexte', 'artistique'])} de l'œuvre`,
      visible_public: true,
      ordre: i,
      thumbnail_url: `uploads/oeuvres/images/thumbs/${nomThumb}`,
      mime_type: 'image/jpeg',
      qualite: faker.helpers.arrayElement(['haute', 'originale']),
      droits_usage: faker.helpers.arrayElement(['libre', 'commercial', 'educatif']),
      alt_text: `${oeuvre.titre} - Image ${i + 1}`,
      credit: faker.helpers.arrayElement(['© Action Culture', '© Photographe officiel', '© Archives nationales']),
      tags: faker.helpers.arrayElements(['couverture', 'détail', 'contexte', 'patrimoine', 'archive'], 2)
    });
    medias.push(media);
  }
  
  // Documents
  for (let i = 0; i < nbDocuments; i++) {
    const docType = 'txt'; // Utiliser txt pour simplifier
    const docTitle = faker.helpers.arrayElement(['Fiche technique', 'Documentation', 'Analyse critique', 'Dossier de presse']);
    const nomFichier = `${oeuvre.id_oeuvre}_${docTitle.toLowerCase().replace(/ /g, '_')}.${docType}`;
    
    // Chemin complet du document
    const cheminDoc = path.join(baseUploadPath, 'documents', nomFichier);
    
    // Créer le contenu du document
    const contenuDocument = `
${docTitle.toUpperCase()}
${oeuvre.titre}
${'='.repeat(50)}

Type d'œuvre: ${oeuvre.TypeOeuvre ? oeuvre.TypeOeuvre.nom_type : 'Non spécifié'}
Année de création: ${oeuvre.annee_creation || 'Non spécifiée'}

DESCRIPTION:
${oeuvre.description}

INFORMATIONS COMPLÉMENTAIRES:
${faker.lorem.paragraphs(3)}

NOTES TECHNIQUES:
${faker.lorem.paragraphs(2)}

---
Document généré le ${new Date().toLocaleDateString('fr-FR')}
Action Culture - Plateforme du Patrimoine Culturel Algérien
    `.trim();
    
    // Écrire le fichier
    await fs.writeFile(cheminDoc, contenuDocument, 'utf8');
    
    // Obtenir la taille du fichier
    const stats = await fs.stat(cheminDoc);
    
    // Créer l'entrée en base de données
    const media = await db.Media.create({
      id_oeuvre: oeuvre.id_oeuvre,
      type_media: 'document',
      url: `uploads/oeuvres/documents/${nomFichier}`,
      titre: `${docTitle} - ${oeuvre.titre}`,
      description: `Document ${docTitle.toLowerCase()} de l'œuvre`,
      visible_public: true,
      ordre: nbImages + i,
      mime_type: 'text/plain',
      taille_fichier: stats.size,
      droits_usage: 'educatif',
      tags: ['documentation', 'référence']
    });
    medias.push(media);
  }
  
  return medias;
}

// IMPORTANT: Dans toutes les fonctions de création d'œuvres,
// appeler creerMediasPourOeuvre avec seulement l'oeuvre en paramètre :

// Exemple dans creerLivreReel :
// await creerMediasPourOeuvre(oeuvre);  // PAS creerMediasPourOeuvre(models, oeuvre)

// Exemple dans creerFilmReel :
// await creerMediasPourOeuvre(oeuvre);  // PAS creerMediasPourOeuvre(models, oeuvre)

// etc...
// Créer ou récupérer un intervenant réel
async function creerOuRecupererIntervenant(models, data) {
  if (!data.nom || !data.prenom) return null;
  
  const [intervenant] = await models.Intervenant.findOrCreate({
    where: { 
      nom: data.nom,
      prenom: data.prenom 
    },
    defaults: {
      nom: data.nom,
      prenom: data.prenom,
      biographie: data.biographie || `${data.prenom} ${data.nom} est une figure majeure de la culture algérienne.`,
      pays_origine: data.pays_origine || 'Algérie',
      langues_parlees: ['ar', 'fr'],
      specialites: data.specialites || [],
      actif: true,
      verifie: true,
      date_naissance: data.date_naissance || null,
      lieu_naissance: data.lieu_naissance || 'Algérie',
      date_deces: data.date_deces || null,
      lieu_deces: data.lieu_deces || null,
      prix_distinctions: data.prix_distinctions || [],
      titre_professionnel: data.titre_professionnel || null,
      organisation: data.organisation || null
    }
  });
  
  return intervenant;
}

// =============================================================================
// FONCTIONS DE CRÉATION D'ŒUVRES
// =============================================================================

// Créer un livre réel
async function creerLivreReel(models, admin, oeuvreData, langues, genres, categories, tags, editeurs) {
  const langueFr = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Livre' } });
  
  // Créer l'œuvre
  const oeuvre = await models.Oeuvre.create({
    titre: oeuvreData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langueFr.id_langue,
    annee_creation: oeuvreData.annee,
    description: oeuvreData.description,
    prix: faker.number.float({ min: 1500, max: 3500, precision: 0.01 }),
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  // Créer les détails du livre
  const genreLivre = genres.find(g => g.nom === oeuvreData.genre) || genres.find(g => g.nom === 'Roman');
  await models.Livre.create({
    id_oeuvre: oeuvre.id_oeuvre,
    isbn: faker.helpers.replaceSymbols('978-####-##-###-#'),
    nb_pages: faker.number.int({ min: 200, max: 400 }),
    id_genre: genreLivre.id_genre
  });
  
  // Créer l'intervenant (auteur)
  const auteur = await creerOuRecupererIntervenant(models, oeuvreData.auteur);
  if (auteur) {
    const typeAuteur = await models.TypeUser.findOne({ where: { nom_type: 'auteur' } });
    if (typeAuteur) {
      await models.OeuvreIntervenant.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_intervenant: auteur.id_intervenant,
        id_type_user: typeAuteur.id_type_user,
        role_principal: true,
        ordre_apparition: 1
      });
    }
  }
  
  // Ajouter les associations
  const categoriesLivre = categories.filter(c => ['Littérature', 'Patrimoine culturel'].includes(c.nom));
  await oeuvre.addCategories(faker.helpers.arrayElements(categoriesLivre, { min: 1, max: 2 }));
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags, { min: 2, max: 4 }));
  
  // Ajouter un éditeur
  const editeur = faker.helpers.arrayElement(editeurs);
  await models.OeuvreEditeur.create({
    id_oeuvre: oeuvre.id_oeuvre,
    id_editeur: editeur.id_editeur,
    role_editeur: 'editeur_principal',
    date_edition: new Date(oeuvreData.annee, 0, 1),
    statut_edition: 'publie',
    tirage: faker.number.int({ min: 1000, max: 5000 }),
    prix_vente: oeuvre.prix
  });
  
  // Créer les médias
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Livre créé: "${oeuvreData.titre}" par ${oeuvreData.auteur.prenom} ${oeuvreData.auteur.nom}`);
  return oeuvre;
}

// Créer un film réel
async function creerFilmReel(models, admin, filmData, langues, genres, categories, tags) {
  const langueFr = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Film' } });
  
  const oeuvre = await models.Oeuvre.create({
    titre: filmData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langueFr.id_langue,
    annee_creation: filmData.annee,
    description: filmData.description,
    prix: 0,
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  const genreFilm = genres.find(g => g.nom === filmData.genre) || genres.find(g => g.nom === 'Drame');
  await models.Film.create({
    id_oeuvre: oeuvre.id_oeuvre,
    duree_minutes: faker.number.int({ min: 90, max: 150 }),
    realisateur: `${filmData.realisateur.prenom} ${filmData.realisateur.nom}`,
    id_genre: genreFilm.id_genre
  });
  
  // Créer l'intervenant (réalisateur)
  const realisateur = await creerOuRecupererIntervenant(models, filmData.realisateur);
  if (realisateur) {
    const typeRealisateur = await models.TypeUser.findOne({ where: { nom_type: 'realisateur' } });
    if (typeRealisateur) {
      await models.OeuvreIntervenant.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_intervenant: realisateur.id_intervenant,
        id_type_user: typeRealisateur.id_type_user,
        role_principal: true,
        ordre_apparition: 1
      });
    }
  }
  
  const categoriesFilm = categories.filter(c => ['Cinéma', 'Patrimoine culturel'].includes(c.nom));
  await oeuvre.addCategories(faker.helpers.arrayElements(categoriesFilm, { min: 1, max: 2 }));
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags, { min: 2, max: 4 }));
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Film créé: "${filmData.titre}" par ${filmData.realisateur.prenom} ${filmData.realisateur.nom}`);
  return oeuvre;
}

// Créer un album musical réel
async function creerAlbumReel(models, admin, albumData, langues, genres, categories, tags) {
  const langue = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Album Musical' } });
  
  const oeuvre = await models.Oeuvre.create({
    titre: albumData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langue.id_langue,
    annee_creation: albumData.annee,
    description: albumData.description,
    prix: faker.number.float({ min: 500, max: 2000, precision: 0.01 }),
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  const genreMusique = genres.find(g => g.nom === albumData.genre) || genres.find(g => g.nom === 'Moderne');
  await models.AlbumMusical.create({
    id_oeuvre: oeuvre.id_oeuvre,
    duree: faker.number.int({ min: 40, max: 70 }),
    id_genre: genreMusique.id_genre,
    label: faker.helpers.arrayElement(['Production Nationale', 'Label Indépendant', 'Autoproduction'])
  });
  
  // Créer l'intervenant (artiste)
  if (albumData.artiste.nom) {
    const artiste = await creerOuRecupererIntervenant(models, albumData.artiste);
    if (artiste) {
      const typeInterprete = await models.TypeUser.findOne({ where: { nom_type: 'interprete' } });
      if (typeInterprete) {
        await models.OeuvreIntervenant.create({
          id_oeuvre: oeuvre.id_oeuvre,
          id_intervenant: artiste.id_intervenant,
          id_type_user: typeInterprete.id_type_user,
          role_principal: true,
          ordre_apparition: 1
        });
      }
    }
  }
  
  const categoriesMusique = categories.filter(c => ['Musique', 'Patrimoine culturel'].includes(c.nom));
  await oeuvre.addCategories(faker.helpers.arrayElements(categoriesMusique, { min: 1, max: 2 }));
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags, { min: 2, max: 4 }));
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Album créé: "${albumData.titre}" par ${albumData.artiste.prenom || ''} ${albumData.artiste.nom}`);
  return oeuvre;
}

// Créer une œuvre d'artisanat réelle
async function creerArtisanatReel(models, admin, artisanatData, langues, categories, tags, materiaux, techniques) {
  const langue = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Artisanat' } });
  
  const oeuvre = await models.Oeuvre.create({
    titre: artisanatData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langue.id_langue,
    annee_creation: faker.number.int({ min: 2018, max: 2024 }),
    description: artisanatData.description,
    prix: faker.number.float({ min: 2000, max: 50000, precision: 0.01 }),
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  // Trouver le matériau et la technique appropriés
  let materiau, technique;
  
  switch(artisanatData.type) {
    case 'Tissage':
      materiau = materiaux.find(m => m.nom === 'Laine');
      technique = techniques.find(t => t.nom === 'Tissage traditionnel');
      break;
    case 'Poterie':
      materiau = materiaux.find(m => m.nom === 'Argile');
      technique = techniques.find(t => t.nom === 'Poterie au tour');
      break;
    default:
      materiau = materiaux[0];
      technique = techniques[0];
  }
  
  await models.Artisanat.create({
    id_oeuvre: oeuvre.id_oeuvre,
    id_materiau: materiau ? materiau.id_materiau : materiaux[0].id_materiau,
    id_technique: technique ? technique.id_technique : techniques[0].id_technique,
    dimensions: faker.helpers.arrayElement(['30x40 cm', '50x70 cm', '20x20x15 cm', '100x150 cm']),
    poids: faker.number.float({ min: 0.5, max: 5, precision: 0.1 }),
    prix: oeuvre.prix,
    date_creation: faker.date.recent({ days: 365 })
  });
  
  const categoriesArtisanat = categories.filter(c => ['Artisanat traditionnel', 'Patrimoine culturel'].includes(c.nom));
  await oeuvre.addCategories(categoriesArtisanat);
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags.filter(t => ['Tradition', 'Savoir-faire', 'Authenticité', 'Patrimoine'].includes(t.nom)), { min: 2, max: 4 }));
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Artisanat créé: "${artisanatData.titre}"`);
  return oeuvre;
}

// Créer une œuvre d'art réelle
async function creerOeuvreArtReelle(models, admin, oeuvreArtData, langues, categories, tags) {
  const langue = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Art' } });
  
  const oeuvre = await models.Oeuvre.create({
    titre: oeuvreArtData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langue.id_langue,
    annee_creation: oeuvreArtData.annee,
    description: oeuvreArtData.description,
    prix: faker.number.float({ min: 10000, max: 100000, precision: 0.01 }),
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  await models.OeuvreArt.create({
    id_oeuvre: oeuvre.id_oeuvre,
    technique: oeuvreArtData.type,
    dimensions: faker.helpers.arrayElement(['100x80 cm', '120x100 cm', '50x40 cm', '200x150 cm']),
    support: faker.helpers.arrayElement(['Toile', 'Papier', 'Bois', 'Mur'])
  });
  
  // Créer l'intervenant (artiste)
  const artiste = await creerOuRecupererIntervenant(models, oeuvreArtData.artiste);
  if (artiste) {
    const typeArtiste = await models.TypeUser.findOne({ where: { nom_type: 'artiste' } });
    if (typeArtiste) {
      await models.OeuvreIntervenant.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_intervenant: artiste.id_intervenant,
        id_type_user: typeArtiste.id_type_user,
        role_principal: true,
        ordre_apparition: 1
      });
    }
  }
  
  const categoriesArt = categories.filter(c => ['Art contemporain', 'Patrimoine culturel'].includes(c.nom));
  await oeuvre.addCategories(categoriesArt);
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags, { min: 2, max: 4 }));
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Œuvre d'art créée: "${oeuvreArtData.titre}" par ${oeuvreArtData.artiste.prenom} ${oeuvreArtData.artiste.nom}`);
  return oeuvre;
}

// Créer un article réel
async function creerArticleReel(models, admin, articleData, langues, genres, categories, tags) {
  const langue = langues.find(l => l.code === 'fr') || langues[0];
  const typeOeuvre = await models.TypeOeuvre.findOne({ where: { nom_type: 'Article' } });
  
  const oeuvre = await models.Oeuvre.create({
    titre: articleData.titre,
    id_type_oeuvre: typeOeuvre.id_type_oeuvre,
    id_langue: langue.id_langue,
    annee_creation: faker.number.int({ min: 2020, max: 2024 }),
    description: articleData.description,
    prix: 0,
    saisi_par: admin.id_user,
    statut: 'publie',
    date_validation: faker.date.recent({ days: 30 }),
    validateur_id: admin.id_user
  });
  
  const genreArticle = genres.find(g => g.nom === articleData.type) || genres.find(g => g.nom === 'Culture');
  const contenu = faker.lorem.paragraphs(faker.number.int({ min: 5, max: 8 }));
  const nbMots = contenu.split(' ').length;
  
  await models.Article.create({
    id_oeuvre: oeuvre.id_oeuvre,
    id_genre: genreArticle ? genreArticle.id_genre : null,
    auteur: `${articleData.auteur.prenom} ${articleData.auteur.nom}`,
    source: 'Action Culture Magazine',
    sous_titre: faker.lorem.sentence(),
    date_publication: faker.date.recent({ days: 90 }),
    resume: faker.lorem.paragraph(),
    contenu_complet: contenu,
    statut: 'publie',
    langue_contenu: 'fr',
    nb_mots: nbMots,
    temps_lecture: Math.ceil(nbMots / 200),
    niveau_credibilite: 'tres_fiable',
    fact_checked: true,
    nb_vues: faker.number.int({ min: 500, max: 10000 }),
    nb_partages: faker.number.int({ min: 50, max: 1000 })
  });
  
  // Créer l'intervenant auteur
  const auteur = await creerOuRecupererIntervenant(models, articleData.auteur);
  if (auteur) {
    const typeAuteur = await models.TypeUser.findOne({ where: { nom_type: 'auteur' } });
    if (typeAuteur) {
      await models.OeuvreIntervenant.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_intervenant: auteur.id_intervenant,
        id_type_user: typeAuteur.id_type_user,
        role_principal: true,
        ordre_apparition: 1
      });
    }
  }
  
  await oeuvre.addCategories(faker.helpers.arrayElements(categories, { min: 1, max: 2 }));
  await oeuvre.addTagMotCles(faker.helpers.arrayElements(tags, { min: 3, max: 5 }));
  await creerMediasPourOeuvre(models, oeuvre);
  
  console.log(`✓ Article créé: "${articleData.titre}" par ${articleData.auteur.prenom} ${articleData.auteur.nom}`);
  return oeuvre;
}

// =============================================================================
// FONCTION PRINCIPALE DE SEEDING
// =============================================================================

async function seedOeuvres(models) {
  try {
    console.log('\n📚 Démarrage du seeding des œuvres culturelles...\n');
    
    // Vérifier que les modèles essentiels sont chargés
    const modelsRequired = ['User', 'Oeuvre', 'Intervenant', 'TypeOeuvre', 'Langue'];
    const missingModels = modelsRequired.filter(model => !models[model]);
    
    if (missingModels.length > 0) {
      throw new Error(`Modèles manquants: ${missingModels.join(', ')}.`);
    }
    
    // Récupérer l'admin existant
    const admin = await getAdmin(models);
    
    // Créer les données de référence
    await creerDonneesReference(models);
    
    // Récupérer les données créées
    const langues = await models.Langue.findAll();
    const genres = await models.Genre.findAll();
    const categories = await models.Categorie.findAll();
    const tags = await models.TagMotCle.findAll();
    const editeurs = await models.Editeur.findAll();
    const materiaux = await models.Materiau.findAll();
    const techniques = await models.Technique.findAll();
    
    console.log('\nCréation des œuvres culturelles réelles...\n');
    
    const oeuvres = [];
    
    // Créer les livres réels
    console.log('📚 Création des livres...');
    for (const livreData of OEUVRES_REELLES.livres.slice(0, 5)) {
      const livre = await creerLivreReel(models, admin, livreData, langues, genres, categories, tags, editeurs);
      oeuvres.push(livre);
    }
    
    // Créer les films réels
    console.log('\n🎬 Création des films...');
    for (const filmData of OEUVRES_REELLES.films.slice(0, 3)) {
      const film = await creerFilmReel(models, admin, filmData, langues, genres, categories, tags);
      oeuvres.push(film);
    }
    
    // Créer les albums musicaux réels
    console.log('\n🎵 Création des albums musicaux...');
    for (const albumData of OEUVRES_REELLES.albums.slice(0, 2)) {
      const album = await creerAlbumReel(models, admin, albumData, langues, genres, categories, tags);
      oeuvres.push(album);
    }
    
    // Créer les œuvres d'artisanat réelles
    console.log('\n🏺 Création des œuvres d\'artisanat...');
    for (const artisanatData of OEUVRES_REELLES.artisanat.slice(0, 2)) {
      const artisanat = await creerArtisanatReel(models, admin, artisanatData, langues, categories, tags, materiaux, techniques);
      oeuvres.push(artisanat);
    }
    
    // Créer les œuvres d'art réelles
    console.log('\n🎨 Création des œuvres d\'art...');
    for (const oeuvreArtData of OEUVRES_REELLES.oeuvresArt.slice(0, 2)) {
      const oeuvreArt = await creerOeuvreArtReelle(models, admin, oeuvreArtData, langues, categories, tags);
      oeuvres.push(oeuvreArt);
    }
    
    // Créer les articles
    console.log('\n📰 Création des articles...');
    for (const articleData of OEUVRES_REELLES.articles.slice(0, 2)) {
      const article = await creerArticleReel(models, admin, articleData, langues, genres, categories, tags);
      oeuvres.push(article);
    }
    
    console.log('\n✅ Seeding terminé avec succès!');
    console.log(`Total d'œuvres créées: ${oeuvres.length}`);
    console.log('\n📊 Résumé:');
    console.log(`- ${OEUVRES_REELLES.livres.slice(0, 5).length} Livres`);
    console.log(`- ${OEUVRES_REELLES.films.slice(0, 3).length} Films`);
    console.log(`- ${OEUVRES_REELLES.albums.slice(0, 2).length} Albums musicaux`);
    console.log(`- ${OEUVRES_REELLES.artisanat.slice(0, 2).length} Œuvres d'artisanat`);
    console.log(`- ${OEUVRES_REELLES.oeuvresArt.slice(0, 2).length} Œuvres d'art`);
    console.log(`- ${OEUVRES_REELLES.articles.slice(0, 2).length} Articles`);
    console.log(`\nToutes les œuvres ont été créées avec le statut "publié" par l'admin (ID: ${admin.id_user})`);
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding des œuvres:', error);
    throw error;
  }
}

// =============================================================================
// POINT D'ENTRÉE PRINCIPAL
// =============================================================================

const main = async () => {
  let sequelize = null;
  
  try {
    // Configuration de la base de données
    const config = {
      database: process.env.DB_NAME || 'actionculture',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      logging: false // Mettre à true pour debug
    };
    
    console.log('🚀 Connexion à la base de données...');
    
    // Initialiser la base de données
    const { sequelize: db, models } = await initializeDatabase(config);
    sequelize = db;
    
    console.log('✅ Base de données connectée');
    console.log(`📦 ${Object.keys(models).length} modèles chargés\n`);
    
    // Lancer le seeding
    await seedOeuvres(models);
    
    console.log('\n✨ Script terminé avec succès!');
    
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message);
    console.error(error);
  } finally {
    // Toujours fermer la connexion
    if (sequelize) {
      await sequelize.close();
      console.log('\n🔌 Connexion fermée');
    }
    process.exit(0);
  }
};

// Exécuter si le script est appelé directement
if (require.main === module) {
  main();
}

module.exports = { seedOeuvres };