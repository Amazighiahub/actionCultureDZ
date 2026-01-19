// complete-fr-translations.cjs
const fs = require('fs');
const path = require('path');

// Dictionnaire complet de traductions françaises
const translations = {
  // Auth
  "auth.mustBeConnected": "Vous devez être connecté",
  "auth.required": "Requis",
  
  // Categories
  "categories.heritageTypes.berber": "Architecture amazighe",
  "categories.heritageTypes.ethnographic": "Musée ethnographique",
  "categories.heritageTypes.modern": "Monument moderne",
  "categories.workTypes.unknown": "Type inconnu",
  
  // Common
  "common.about": "À propos",
  "common.backToDashboard": "Retour au tableau de bord",
  "common.by": "Par",
  "common.chooseFile": "Choisir un fichier",
  "common.chooseFiles": "Choisir des fichiers",
  "common.city": "Ville",
  "common.contact": "Contact",
  "common.copyright": "Tous droits réservés",
  "common.description": "Description",
  "common.dragDropImage": "Glissez-déposez l'image ici",
  "common.featureInDevelopment": "Cette fonctionnalité est en cours de développement",
  "common.followUs": "Suivez-nous",
  "common.imageFormats": "Formats acceptés : JPG, PNG, GIF",
  "common.invalidDate": "Date invalide",
  "common.language": "Langue",
  "common.login": "Connexion",
  "common.logout": "Déconnexion",
  "common.noDescription": "Aucune description",
  "common.privacy": "Politique de confidentialité",
  "common.retry": "Réessayer",
  "common.search": "Rechercher...",
  "common.selectCity": "Sélectionner une ville",
  "common.selectType": "Sélectionner un type",
  "common.signup": "Créer un compte",
  "common.terms": "Conditions d'utilisation",
  "common.viewAll": "Voir tout",
  
  // Contributors
  "contributors.addedCount_one": "{{count}} contributeur ajouté",
  "contributors.addedCount_other": "{{count}} contributeurs ajoutés",
  "contributors.alreadyAdded": "Déjà ajouté",
  "contributors.createNew": "Créer nouveau",
  "contributors.errors.searchError": "Erreur de recherche",
  "contributors.externalContributor": "Contributeur externe",
  "contributors.mainContributors": "Contributeurs principaux",
  "contributors.new": "Nouveau",
  "contributors.noContributors": "Aucun contributeur",
  "contributors.noResultsFor": "Aucun résultat pour",
  "contributors.otherContributors": "Autres contributeurs",
  "contributors.registeredMember": "Membre inscrit",
  "contributors.searchExisting": "Rechercher dans l'existant",
  "contributors.searchPlaceholder": "Rechercher un contributeur...",
  "contributors.selectRole": "Sélectionner un rôle",
  "contributors.title": "Contributeurs",
  
  // Errors
  "errors.generic.message": "Une erreur inattendue s'est produite. Veuillez réessayer.",
  "errors.generic.title": "Erreur",
  "errors.loadingCraftsError": "Échec du chargement des artisanats",
  "errors.loadingError": "Erreur de chargement",
  "errors.partialDataLoad": "Données partiellement chargées",
  
  // Events - Create
  "events.create.addAfterEvent": "Ajouter après l'événement",
  "events.create.datesAndTimes": "Dates et horaires",
  "events.create.descriptionPlaceholder": "Décrivez l'événement...",
  "events.create.draftSaved": "Brouillon enregistré",
  "events.create.endDate": "Date de fin",
  "events.create.endTime": "Heure de fin",
  "events.create.eventImage": "Image de l'événement",
  "events.create.eventName": "Nom de l'événement",
  "events.create.eventNamePlaceholder": "Entrez le nom de l'événement",
  "events.create.eventType": "Type d'événement",
  "events.create.exactLocation": "Lieu exact",
  "events.create.freeEvent": "Événement gratuit",
  "events.create.generalInfo": "Informations générales",
  "events.create.imageAndMedia": "Images et médias",
  "events.create.locationPlaceholder": "Entrez le lieu",
  "events.create.maxParticipants": "Nombre maximum de participants",
  "events.create.maxParticipantsPlaceholder": "Entrez le nombre maximum",
  "events.create.participationAndPricing": "Participation et tarification",
  "events.create.postEventMedia": "Médias post-événement",
  "events.create.postEventMediaDesc": "Ajouter des photos et vidéos après l'événement",
  "events.create.price": "Prix",
  "events.create.pricePlaceholder": "Entrez le prix",
  "events.create.publishEvent": "Publier l'événement",
  "events.create.saveAsDraft": "Enregistrer comme brouillon",
  "events.create.startDate": "Date de début",
  "events.create.startTime": "Heure de début",
  "events.create.subtitle": "Créez un nouvel événement culturel",
  "events.create.title": "Ajouter un événement",
  "events.create.willBeAvailableSoon": "Sera disponible bientôt",
  
  // Events - Types
  "events.types.concert": "Concert",
  "events.types.conference": "Conférence",
  "events.types.exhibition": "Exposition",
  "events.types.festival": "Festival",
  "events.types.literaryMeeting": "Rencontre littéraire",
  "events.types.screening": "Projection",
  "events.types.show": "Spectacle",
  "events.types.workshop": "Atelier",
  
  // Footer
  "footer.legal": "Mentions légales",
  "footer.links.faq": "FAQ",
  "footer.links.legalNotices": "Mentions légales",
  "footer.links.userGuide": "Guide utilisateur",
  "footer.location": "Localisation",
  "footer.navigation": "Navigation",
  "footer.platform": "Plateforme",
  "footer.resources": "Ressources",
  
  // Header
  "header.badges.admin": "Admin",
  "header.badges.pending": "En attente",
  "header.badges.professional": "Professionnel",
  "header.nav.about": "À propos",
  "header.nav.crafts": "Artisanat",
  "header.nav.events": "Événements",
  "header.nav.heritage": "Patrimoine",
  "header.nav.works": "Œuvres",
  "header.subtitle": "Plateforme de la culture amazighe",
  "header.title": "Tamlilit Culture",
  "header.userMenu.addWork": "Ajouter une œuvre",
  "header.userMenu.administration": "Administration",
  "header.userMenu.createEvent": "Créer un événement",
  "header.userMenu.metadata": "Métadonnées",
  "header.userMenu.myFavorites": "Mes favoris",
  "header.userMenu.myProfile": "Mon profil",
  "header.userMenu.mySpace": "Mon espace",
  "header.userMenu.pendingValidations": "Validations en attente",
  "header.userMenu.proDashboard": "Tableau de bord Pro",
  
  // Home
  "home.explore.subtitle": "Découvrez la richesse de la culture amazighe",
  "home.explore.tabs.crafts": "Artisanat",
  "home.explore.tabs.events": "Événements",
  "home.explore.tabs.heritage": "Patrimoine",
  "home.explore.tabs.map": "Carte",
  "home.explore.tabs.works": "Œuvres",
  "home.explore.title": "Explorer",
  "home.mission.description": "Une plateforme dédiée à la préservation et à la valorisation du patrimoine culturel amazigh",
  "home.mission.learnMore": "En savoir plus",
  "home.mission.title": "Notre mission",
  "home.professionals.benefits": "Bénéficiez d'une meilleure visibilité pour vos œuvres et événements",
  "home.professionals.createWork": "Créer une œuvre",
  "home.professionals.organizeEvent": "Organiser un événement",
  "home.professionals.subtitle": "Rejoignez notre communauté d'artistes et d'artisans",
  "home.professionals.title": "Pour les professionnels",
  "home.resources.access": "Accéder aux ressources",
  "home.resources.calendar": "Calendrier culturel",
  "home.resources.directory": "Annuaire des professionnels",
  "home.resources.guide": "Guide des pratiques",
  "home.resources.title": "Ressources",
  "home.stats.events": "événements",
  "home.stats.heritage": "sites patrimoniaux",
  "home.stats.members": "membres",
  "home.stats.subtitle": "Des chiffres qui parlent",
  "home.stats.title": "Une plateforme vivante",
  "home.stats.works": "œuvres",
  
  // Notifications
  "notifications.youHave_one": "Vous avez {{count}} notification",
  "notifications.youHave_other": "Vous avez {{count}} notifications",
  
  // Price
  "price.fixed": "Prix fixe",
  "price.free": "Gratuit",
  
  // Publishers
  "publishers.addedCount_one": "{{count}} éditeur ajouté",
  "publishers.addedCount_other": "{{count}} éditeurs ajoutés",
  "publishers.createNew": "Créer un nouvel éditeur",
  "publishers.isbn": "ISBN",
  "publishers.noResultsFor": "Aucun résultat pour",
  "publishers.pricePlaceholder": "Entrez le prix",
  "publishers.role": "Rôle",
  "publishers.roles.coPublisher": "Co-éditeur",
  "publishers.roles.distributor": "Distributeur",
  "publishers.roles.mainPublisher": "Éditeur principal",
  "publishers.roles.originalPublisher": "Éditeur original",
  "publishers.roles.translationPublisher": "Éditeur de la traduction",
  "publishers.salePrice": "Prix de vente",
  "publishers.search": "Rechercher",
  "publishers.searchPlaceholder": "Rechercher un éditeur...",
  "publishers.status": "Statut",
  "publishers.statuses.cancelled": "Annulé",
  "publishers.statuses.inProgress": "En cours",
  "publishers.statuses.outOfStock": "Rupture de stock",
  "publishers.statuses.published": "Publié",
  "publishers.title": "Éditeurs",
  
  // Sections - Crafts
  "sections.crafts.exploreAll": "Explorer tout",
  "sections.crafts.noCrafts": "Aucun artisanat",
  "sections.crafts.onOrder": "Sur commande",
  "sections.crafts.price.from": "À partir de",
  "sections.crafts.price.range": "{{min}} - {{max}}",
  "sections.crafts.price.upTo": "Jusqu'à",
  "sections.crafts.seeDetails": "Voir les détails",
  "sections.crafts.stock.inStock_one": "{{count}} pièce en stock",
  "sections.crafts.stock.inStock_other": "{{count}} pièces en stock",
  "sections.crafts.stock.outOfStock": "Rupture de stock",
  "sections.crafts.subtitle": "Découvrez l'artisanat amazigh authentique",
  "sections.crafts.title": "Artisanat",
  
  // Sections - Events
  "sections.events.dateToConfirm": "Date à confirmer",
  "sections.events.noEvents": "Aucun événement",
  "sections.events.register": "S'inscrire",
  "sections.events.registration": "Inscription",
  "sections.events.seeAllEvents": "Voir tous les événements",
  "sections.events.subtitle": "Ne manquez aucun événement culturel",
  "sections.events.title": "Événements à venir",
  
  // Sections - Heritage
  "sections.heritage.discover": "Découvrir",
  "sections.heritage.filters.allRegions": "Toutes les régions",
  "sections.heritage.filters.archaeological": "Archéologique",
  "sections.heritage.filters.monuments": "Monuments",
  "sections.heritage.filters.traditional": "Traditionnel",
  "sections.heritage.interactiveMap": "Carte interactive",
  "sections.heritage.map.explore": "Explorer la carte",
  "sections.heritage.mapDescription": "Découvrez les sites patrimoniaux sur la carte interactive",
  "sections.heritage.noResults": "Aucun résultat",
  "sections.heritage.otherSites": "Autres sites",
  "sections.heritage.planVisit.description": "Planifiez votre visite avec notre guide détaillé",
  "sections.heritage.planVisit.guide": "Guide touristique",
  "sections.heritage.planVisit.start": "Commencer la planification",
  "sections.heritage.planVisit.title": "Planifiez votre visite",
  "sections.heritage.reviews": "Avis",
  "sections.heritage.seeAll": "Voir tout",
  "sections.heritage.subtitle": "Explorez les trésors du patrimoine amazigh",
  "sections.heritage.title": "Patrimoine",
  
  // Sections - Works
  "sections.works.actions.readArticle": "Lire l'article",
  "sections.works.actions.view": "Voir",
  "sections.works.ageLabels.classic": "Classique",
  "sections.works.ageLabels.recent": "Récent",
  "sections.works.badges.classic": "Classique",
  "sections.works.badges.new": "Nouveau",
  "sections.works.badges.popular": "Populaire",
  "sections.works.createdIn": "Créé en",
  "sections.works.details": "Détails",
  "sections.works.empty.noFeatured": "Aucune œuvre mise en avant",
  "sections.works.empty.noNew": "Aucune nouvelle œuvre",
  "sections.works.empty.noPopular": "Aucune œuvre populaire",
  "sections.works.empty.noRecommended": "Aucune œuvre recommandée",
  "sections.works.empty.noSearch": "Aucun résultat de recherche",
  "sections.works.empty.noType": "Aucune œuvre de ce type",
  "sections.works.empty.noWorks": "Aucune œuvre",
  "sections.works.exploreLibrary": "Explorer la bibliothèque",
  "sections.works.filters.all": "Tout",
  "sections.works.filters.allTypes": "Tous les types",
  "sections.works.filters.featured": "Mis en avant",
  "sections.works.filters.new": "Nouveau",
  "sections.works.filters.popular": "Populaire",
  "sections.works.filters.recommended": "Recommandé",
  "sections.works.info.classicsDesc": "Les œuvres classiques qui ont traversé le temps",
  "sections.works.info.featuredCount_one": "{{count}} œuvre mise en avant",
  "sections.works.info.featuredCount_other": "{{count}} œuvres mises en avant",
  "sections.works.info.newCount_one": "{{count}} nouvelle œuvre",
  "sections.works.info.newCount_other": "{{count}} nouvelles œuvres",
  "sections.works.info.popularCount_one": "{{count}} œuvre populaire",
  "sections.works.info.popularCount_other": "{{count}} œuvres populaires",
  "sections.works.info.recommendedCount_one": "{{count}} œuvre recommandée",
  "sections.works.info.recommendedCount_other": "{{count}} œuvres recommandées",
  "sections.works.loading": "Chargement...",
  "sections.works.noTitle": "Sans titre",
  "sections.works.noWorks": "Aucune œuvre",
  "sections.works.preview": "Aperçu",
  "sections.works.rateLimit.cache": "Cache",
  "sections.works.rateLimit.clearCache": "Vider le cache",
  "sections.works.rateLimit.currentDelay": "Délai actuel",
  "sections.works.rateLimit.entries": "entrées",
  "sections.works.rateLimit.health.critical": "Critique",
  "sections.works.rateLimit.health.good": "Bon",
  "sections.works.rateLimit.health.slow": "Lent",
  "sections.works.rateLimit.health.warning": "Attention",
  "sections.works.rateLimit.hits": "Requêtes",
  "sections.works.rateLimit.normalMode": "Mode normal",
  "sections.works.rateLimit.queue": "File d'attente",
  "sections.works.rateLimit.requestsPerMinute": "requêtes par minute",
  "sections.works.rateLimit.slowMode": "Mode lent",
  "sections.works.rateLimit.status": "Statut",
  "sections.works.rateLimit.title": "Limite de taux",
  "sections.works.results.count_one": "{{count}} résultat",
  "sections.works.results.count_other": "{{count}} résultats",
  "sections.works.searchPlaceholder": "Rechercher une œuvre...",
  "sections.works.stats.classics_one": "{{count}} œuvre classique",
  "sections.works.stats.classics_other": "{{count}} œuvres classiques",
  "sections.works.stats.new_one": "{{count}} nouvelle œuvre",
  "sections.works.stats.new_other": "{{count}} nouvelles œuvres",
  "sections.works.stats.recent_one": "{{count}} œuvre récente",
  "sections.works.stats.recent_other": "{{count}} œuvres récentes",
  "sections.works.stats.total_one": "{{count}} œuvre",
  "sections.works.stats.total_other": "{{count}} œuvres",
  "sections.works.subtitle": "Découvrez les créations culturelles",
  "sections.works.title": "Œuvres",
  
  // Works
  "works.actions.favorites": "Favoris",
  "works.actions.listenNow": "Écouter maintenant",
  "works.actions.myList": "Ma liste",
  "works.actions.preview": "Aperçu",
  "works.actions.readExcerpt": "Lire un extrait",
  "works.actions.readNow": "Lire maintenant",
  "works.actions.trailer": "Bande-annonce",
  "works.actions.watchNow": "Regarder maintenant",
  "works.album.tracksCount_one": "{{count}} piste",
  "works.album.tracksCount_other": "{{count}} pistes",
  "works.duration.minutes_one": "{{count}} minute",
  "works.duration.minutes_other": "{{count}} minutes",
  "works.fields.isbn": "ISBN",
  "works.fields.pages": "Pages",
  "works.pricing.free": "Gratuit",
  "works.sections.synopsis": "Synopsis",
  "works.stats.listensCount_one": "{{count}} écoute",
  "works.stats.listensCount_other": "{{count}} écoutes",
  "works.stats.readingTime": "Temps de lecture",
  "works.stats.readingTimeValue": "{{minutes}} minutes",
  "works.stats.reviewsCount_one": "{{count}} avis",
  "works.stats.reviewsCount_other": "{{count}} avis",
  "works.stats.views": "Vues",
  "works.types.album": "Album",
  "works.types.book": "Livre",
  "works.types.film": "Film"
};

// Appliquer toutes les traductions
console.log('🇫🇷 Application des traductions françaises complètes...\n');

const file = path.join('i18n/locales/fr/translation.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));

let applied = 0;
let skipped = 0;

function applyTranslations(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      if ((obj[key].includes('{{') || obj[key].includes('⵿⵿')) && translations[fullKey]) {
        obj[key] = translations[fullKey];
        console.log(`✅ ${fullKey}`);
        applied++;
      } else if (obj[key].includes('{{') || obj[key].includes('⵿⵿')) {
        skipped++;
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      applyTranslations(obj[key], fullKey);
    }
  }
}

applyTranslations(content);

if (applied > 0) {
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  console.log(`\n✅ ${applied} traductions appliquées et sauvegardées!`);
}

if (skipped > 0) {
  console.log(`⚠️  ${skipped} clés non trouvées dans le dictionnaire`);
}

// Statistiques finales
console.log('\n📊 Statistiques finales:');
let stats = { total: 0, translated: 0, untranslated: 0 };

function countStats(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      stats.total++;
      // Ne pas compter les placeholders de variables comme non traduits
      if (obj[key].includes('{{') && 
          !obj[key].includes('{{count}}') && 
          !obj[key].includes('{{min}}') && 
          !obj[key].includes('{{max}}') && 
          !obj[key].includes('{{name}}') &&
          !obj[key].includes('{{minutes}}')) {
        stats.untranslated++;
      } else {
        stats.translated++;
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      countStats(obj[key]);
    }
  }
}

countStats(content);

console.log(`Total: ${stats.total} clés`);
console.log(`✅ Traduites: ${stats.translated} (${Math.round(stats.translated/stats.total*100)}%)`);
console.log(`⚠️  Non traduites: ${stats.untranslated} (${Math.round(stats.untranslated/stats.total*100)}%)`);

// Afficher les clés restantes
if (stats.untranslated > 0) {
  console.log('\n📋 Clés restantes à traduire:');
  let remaining = [];
  function findRemaining(obj, prefix = '') {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'string' && 
          obj[key].includes('{{') && 
          !obj[key].includes('{{count}}') && 
          !obj[key].includes('{{min}}') && 
          !obj[key].includes('{{max}}') &&
          !obj[key].includes('{{name}}') &&
          !obj[key].includes('{{minutes}}')) {
        remaining.push(fullKey);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        findRemaining(obj[key], fullKey);
      }
    }
  }
  findRemaining(content);
  remaining.forEach(key => console.log(`  - ${key}`));
}