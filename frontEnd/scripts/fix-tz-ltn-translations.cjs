/**
 * Script pour corriger les traductions manquantes en Tamazight Latin (tz-ltn)
 * Remplace les placeholders {{key}} par de vraies traductions
 */

const fs = require('fs');
const path = require('path');

const tzLtnPath = path.join(__dirname, '../i18n/locales/tz-ltn/translation.json');

// Traductions à ajouter/corriger
const translations = {
  // Contributors
  contributors: {
    addedCount_one: "{{count}} amcarak yettwarna",
    addedCount_other: "{{count}} imcaraken ttwarnin",
    addedCount_many: "{{count}} imcaraken ttwarnin"
  },

  // Publishers
  publishers: {
    addedCount_one: "{{count}} asuffeɣ yettwarna",
    addedCount_other: "{{count}} isufaɣ ttwarnin",
    addedCount_many: "{{count}} isufaɣ ttwarnin",
    createNew: "Snulfu-d asuffeɣ amaynut",
    isbn: "ISBN",
    noResultsFor: "Ulac igmaḍ i",
    pricePlaceholder: "Amedya: 1500",
    role: "Amur",
    roles: {
      coPublisher: "Amcarak deg usuffeɣ",
      distributor: "Amferreq",
      mainPublisher: "Asuffeɣ agejdan",
      originalPublisher: "Asuffeɣ aneṣli",
      translationPublisher: "Asuffeɣ n usuqel"
    },
    salePrice: "Ssuma n tnezzut",
    search: "Nadi",
    searchPlaceholder: "Nadi asuffeɣ...",
    status: "Addad",
    statuses: {
      cancelled: "Yettwasefsex",
      inProgress: "Iteddu",
      outOfStock: "Ulac deg usekker",
      published: "Yettwasuffeɣ"
    },
    title: "Isufaɣ"
  },

  // Sections
  sections: {
    crafts: {
      exploreAll: "Snirem meṛṛa tiḥuna",
      noCrafts: "Ulac tiḥuna i wakka",
      onOrder: "Ɣef uṭṭleb",
      seeDetails: "Wali talqayt",
      stock: {
        inStock_one: "{{count}} deg usekker",
        inStock_other: "{{count}} deg usekker",
        inStock_many: "{{count}} deg usekker"
      }
    },
    events: {
      dateToConfirm: "Azemz ad yettwasnettem",
      noEvents: "Ulac tidyanin i wakka",
      register: "Jerred",
      registration: "Ajerred"
    },
    heritage: {
      discover: "Af-d",
      interactiveMap: "Takarḍa tamyigawt",
      mapDescription: "Af-d imukan n ugemmay ɣef tkarḍa",
      reviews: "Tiktiwin"
    },
    works: {
      actions: {
        readArticle: "Ɣer amagrad"
      },
      createdIn: "Yettwaxleq deg",
      details: "Talqayt",
      exploreLibrary: "Snirem tamkarḍit",
      info: {
        featuredCount_one: "{{count}} yettwasmel",
        featuredCount_other: "{{count}} ttwasemlen",
        featuredCount_many: "{{count}} ttwasemlen",
        newCount_one: "{{count}} amaynut",
        newCount_other: "{{count}} imaynuten",
        newCount_many: "{{count}} imaynuten",
        popularCount_one: "{{count}} yettwassnen",
        popularCount_other: "{{count}} ttwassnen",
        popularCount_many: "{{count}} ttwassnen",
        recommendedCount_one: "{{count}} yettwawṣṣa",
        recommendedCount_other: "{{count}} ttwawṣṣan",
        recommendedCount_many: "{{count}} ttwawṣṣan"
      },
      noWorks: "Ulac tiẓuriyin i wakka",
      preview: "Ɛaynet",
      results: {
        count_one: "{{count}} agmaḍ",
        count_other: "{{count}} igmaḍ",
        count_many: "{{count}} igmaḍ"
      },
      stats: {
        classics_one: "{{count}} aklasik",
        classics_other: "{{count}} iklasiken",
        classics_many: "{{count}} iklasiken",
        new_one: "{{count}} amaynut",
        new_other: "{{count}} imaynuten",
        new_many: "{{count}} imaynuten",
        recent_one: "{{count}} atraran",
        recent_other: "{{count}} itraran",
        recent_many: "{{count}} itraran",
        total_one: "{{count}} asemday",
        total_other: "{{count}} isemday",
        total_many: "{{count}} isemday"
      }
    }
  },

  // Works
  works: {
    album: {
      tracksCount_one: "{{count}} tazlat",
      tracksCount_other: "{{count}} tizlatin",
      tracksCount_many: "{{count}} tizlatin"
    },
    duration: {
      minutes_one: "{{count}} tasdat",
      minutes_other: "{{count}} tisdatin",
      minutes_many: "{{count}} tisdatin"
    },
    fields: {
      isbn: "ISBN",
      pages: "Isebtar"
    },
    pricing: {
      free: "Baṭel"
    },
    sections: {
      synopsis: "Agzul"
    },
    stats: {
      listensCount_one: "{{count}} asel",
      listensCount_other: "{{count}} islan",
      listensCount_many: "{{count}} islan",
      readingTime: "Akud n tɣuri",
      readingTimeValue: "{{minutes}} tisdatin",
      reviewsCount_one: "{{count}} tikti",
      reviewsCount_other: "{{count}} tiktiwin",
      reviewsCount_many: "{{count}} tiktiwin",
      views: "Timuɣliwin"
    }
  }
};

// Fonction pour fusionner profondément les objets
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

try {
  // Lire le fichier existant
  const content = fs.readFileSync(tzLtnPath, 'utf-8');
  const data = JSON.parse(content);

  // Fusionner les traductions
  deepMerge(data, translations);

  // Écrire le fichier mis à jour
  fs.writeFileSync(tzLtnPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log('✅ Traductions tz-ltn corrigées avec succès!');
  console.log('Sections mises à jour:');
  console.log('  - contributors');
  console.log('  - publishers');
  console.log('  - sections.crafts');
  console.log('  - sections.events');
  console.log('  - sections.heritage');
  console.log('  - sections.works');
  console.log('  - works');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
