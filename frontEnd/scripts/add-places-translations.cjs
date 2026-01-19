#!/usr/bin/env node
/**
 * Ajoute toutes les traductions PLACES dans les 5 langues
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

// Traductions PLACES en français
const placesTranslationsFR = {
  "places": {
    "address": "Adresse",
    "addressPlaceholder": "Entrez l'adresse...",
    "addressSearch": "Rechercher une adresse",
    "addressSearchPlaceholder": "Rechercher un lieu...",
    "allTypes": "Tous les types",
    "coordinates": "Coordonnées",
    "coordinatesCopied": "Coordonnées copiées",
    "copyError": "Erreur de copie",
    "create": {
      "button": "Créer un lieu",
      "error": "Erreur lors de la création",
      "success": "Lieu créé avec succès"
    },
    "createNew": "Créer un nouveau lieu",
    "description": "Description",
    "descriptionPlaceholder": "Décrivez le lieu...",
    "duplicate": {
      "description": "Ce lieu existe déjà",
      "title": "Lieu en double"
    },
    "filterByType": "Filtrer par type",
    "geocoding": {
      "error": "Erreur de géocodage"
    },
    "mapInstructions": "Cliquez sur la carte pour sélectionner un lieu",
    "mapLocation": "Localisation sur la carte",
    "name": "Nom du lieu",
    "namePlaceholder": "Nom du lieu...",
    "noResults": "Aucun résultat",
    "search": {
      "placeholder": "Rechercher un lieu..."
    },
    "selectExisting": "Sélectionner un lieu existant",
    "selectThisLocation": "Sélectionner cet emplacement",
    "sortedByDistance": "Triés par distance",
    "type": "Type de lieu",
    "types": {
      "archaeologicalSite": "Site archéologique",
      "cinema": "Cinéma",
      "conferenceHall": "Salle de conférence",
      "culturalCenter": "Centre culturel",
      "culturalSpace": "Espace culturel",
      "cultureHouse": "Maison de la culture",
      "gallery": "Galerie",
      "historicalMonument": "Monument historique",
      "library": "Bibliothèque",
      "museum": "Musée",
      "other": "Autre",
      "outdoor": "Extérieur",
      "theater": "Théâtre",
      "theater2": "Salle de théâtre"
    },
    "useCurrentLocation": "Utiliser ma position actuelle"
  }
};

// Traductions PLACES en anglais
const placesTranslationsEN = {
  "places": {
    "address": "Address",
    "addressPlaceholder": "Enter address...",
    "addressSearch": "Search address",
    "addressSearchPlaceholder": "Search for a place...",
    "allTypes": "All types",
    "coordinates": "Coordinates",
    "coordinatesCopied": "Coordinates copied",
    "copyError": "Copy error",
    "create": {
      "button": "Create place",
      "error": "Error creating place",
      "success": "Place created successfully"
    },
    "createNew": "Create new place",
    "description": "Description",
    "descriptionPlaceholder": "Describe the place...",
    "duplicate": {
      "description": "This place already exists",
      "title": "Duplicate place"
    },
    "filterByType": "Filter by type",
    "geocoding": {
      "error": "Geocoding error"
    },
    "mapInstructions": "Click on the map to select a location",
    "mapLocation": "Map location",
    "name": "Place name",
    "namePlaceholder": "Place name...",
    "noResults": "No results",
    "search": {
      "placeholder": "Search for a place..."
    },
    "selectExisting": "Select existing place",
    "selectThisLocation": "Select this location",
    "sortedByDistance": "Sorted by distance",
    "type": "Place type",
    "types": {
      "archaeologicalSite": "Archaeological site",
      "cinema": "Cinema",
      "conferenceHall": "Conference hall",
      "culturalCenter": "Cultural center",
      "culturalSpace": "Cultural space",
      "cultureHouse": "House of culture",
      "gallery": "Gallery",
      "historicalMonument": "Historical monument",
      "library": "Library",
      "museum": "Museum",
      "other": "Other",
      "outdoor": "Outdoor",
      "theater": "Theater",
      "theater2": "Theater hall"
    },
    "useCurrentLocation": "Use my current location"
  }
};

// Traductions PLACES en arabe
const placesTranslationsAR = {
  "places": {
    "address": "العنوان",
    "addressPlaceholder": "أدخل العنوان...",
    "addressSearch": "البحث عن عنوان",
    "addressSearchPlaceholder": "البحث عن مكان...",
    "allTypes": "كل الأنواع",
    "coordinates": "الإحداثيات",
    "coordinatesCopied": "تم نسخ الإحداثيات",
    "copyError": "خطأ في النسخ",
    "create": {
      "button": "إنشاء مكان",
      "error": "خطأ في إنشاء المكان",
      "success": "تم إنشاء المكان بنجاح"
    },
    "createNew": "إنشاء مكان جديد",
    "description": "الوصف",
    "descriptionPlaceholder": "صف المكان...",
    "duplicate": {
      "description": "هذا المكان موجود بالفعل",
      "title": "مكان مكرر"
    },
    "filterByType": "تصفية حسب النوع",
    "geocoding": {
      "error": "خطأ في الترميز الجغرافي"
    },
    "mapInstructions": "انقر على الخريطة لتحديد موقع",
    "mapLocation": "الموقع على الخريطة",
    "name": "اسم المكان",
    "namePlaceholder": "اسم المكان...",
    "noResults": "لا توجد نتائج",
    "search": {
      "placeholder": "البحث عن مكان..."
    },
    "selectExisting": "اختر مكانًا موجودًا",
    "selectThisLocation": "اختر هذا الموقع",
    "sortedByDistance": "مرتب حسب المسافة",
    "type": "نوع المكان",
    "types": {
      "archaeologicalSite": "موقع أثري",
      "cinema": "سينما",
      "conferenceHall": "قاعة مؤتمرات",
      "culturalCenter": "مركز ثقافي",
      "culturalSpace": "فضاء ثقافي",
      "cultureHouse": "دار الثقافة",
      "gallery": "معرض",
      "historicalMonument": "نصب تاريخي",
      "library": "مكتبة",
      "museum": "متحف",
      "other": "آخر",
      "outdoor": "في الهواء الطلق",
      "theater": "مسرح",
      "theater2": "قاعة المسرح"
    },
    "useCurrentLocation": "استخدم موقعي الحالي"
  }
};

// Traductions PLACES en Tamazight Latin
const placesTranslationsTZLTN = {
  "places": {
    "address": "Tansa",
    "addressPlaceholder": "Sekcem tansa...",
    "addressSearch": "Nadi ɣef tansa",
    "addressSearchPlaceholder": "Nadi ɣef yiwen wadeg...",
    "allTypes": "Akk inawen",
    "coordinates": "Tisutiyin",
    "coordinatesCopied": "Tisutiyin ttwanɣelent",
    "copyError": "Tuccḍa n unɣel",
    "create": {
      "button": "Rnu adig",
      "error": "Tuccḍa deg tmerna n wadeg",
      "success": "Adig yettwarna akken iwata"
    },
    "createNew": "Rnu adig amaynu",
    "description": "Aglam",
    "descriptionPlaceholder": "Glem adig...",
    "duplicate": {
      "description": "Adig-a yella yakan",
      "title": "Adig yettuɣalen"
    },
    "filterByType": "Sizdeg s wanaw",
    "geocoding": {
      "error": "Tuccḍa n tikrut tarakalt"
    },
    "mapInstructions": "Sit ɣef ukarḍa akken ad tferneḍ adig",
    "mapLocation": "Adig ɣef ukarḍa",
    "name": "Isem n wadeg",
    "namePlaceholder": "Isem n wadeg...",
    "noResults": "Ulac igmaḍ",
    "search": {
      "placeholder": "Nadi ɣef yiwen wadeg..."
    },
    "selectExisting": "Fren adig yellan",
    "selectThisLocation": "Fren adig-a",
    "sortedByDistance": "Izemlen s lebɛed",
    "type": "Anaw n wadeg",
    "types": {
      "archaeologicalSite": "Asit arkiyulujik",
      "cinema": "Sinima",
      "conferenceHall": "Taxxamt n usideg",
      "culturalCenter": "Ammas adelsaman",
      "culturalSpace": "Tallunt tadelsant",
      "cultureHouse": "Axxam n yidlisen",
      "gallery": "Taɣerbast",
      "historicalMonument": "Adgan amezruy",
      "library": "Taɣerbast n yidlisen",
      "museum": "Asγel",
      "other": "Nniḍen",
      "outdoor": "Beṛṛa",
      "theater": "Atiatra",
      "theater2": "Taxxamt n teatra"
    },
    "useCurrentLocation": "Seqdec adig-iw tura"
  }
};

// Traductions PLACES en Tamazight Tifinagh
const placesTranslationsTZTFNG = {
  "places": {
    "address": "ⵜⴰⵏⵙⴰ",
    "addressPlaceholder": "ⵙⴻⴽⵛⴻⵎ ⵜⴰⵏⵙⴰ...",
    "addressSearch": "ⵏⴰⴷⵉ ⵖⴻⴼ ⵜⴰⵏⵙⴰ",
    "addressSearchPlaceholder": "ⵏⴰⴷⵉ ⵖⴻⴼ ⵢⵉⵡⴻⵏ ⵡⴰⴷⴻⴳ...",
    "allTypes": "ⴰⴽⴽ ⵉⵏⴰⵡⴻⵏ",
    "coordinates": "ⵜⵉⵙⵓⵜⵉⵢⵉⵏ",
    "coordinatesCopied": "ⵜⵉⵙⵓⵜⵉⵢⵉⵏ ⵜⵜⵡⴰⵏⵖⴻⵍⴻⵏⵜ",
    "copyError": "ⵜⵓⵛⵛⴹⴰ ⵏ ⵓⵏⵖⴻⵍ",
    "create": {
      "button": "ⵔⵏⵓ ⴰⴷⵉⴳ",
      "error": "ⵜⵓⵛⵛⴹⴰ ⴷⴻⴳ ⵜⵎⴻⵔⵏⴰ ⵏ ⵡⴰⴷⴻⴳ",
      "success": "ⴰⴷⵉⴳ ⵢⴻⵜⵜⵡⴰⵔⵏⴰ ⴰⴽⴻⵏ ⵉⵡⴰⵜⴰ"
    },
    "createNew": "ⵔⵏⵓ ⴰⴷⵉⴳ ⴰⵎⴰⵢⵏⵓ",
    "description": "ⴰⴳⵍⴰⵎ",
    "descriptionPlaceholder": "ⴳⵍⴻⵎ ⴰⴷⵉⴳ...",
    "duplicate": {
      "description": "ⴰⴷⵉⴳ-ⴰ ⵢⴻⵍⵍⴰ ⵢⴰⴽⴰⵏ",
      "title": "ⴰⴷⵉⴳ ⵢⴻⵜⵜⵓⵖⴰⵍⴻⵏ"
    },
    "filterByType": "ⵙⵉⵣⴷⴻⴳ ⵙ ⵡⴰⵏⴰⵡ",
    "geocoding": {
      "error": "ⵜⵓⵛⵛⴹⴰ ⵏ ⵜⵉⴽⵔⵓⵜ ⵜⴰⵔⴰⴽⴰⵍⵜ"
    },
    "mapInstructions": "ⵙⵉⵜ ⵖⴻⴼ ⵓⴽⴰⵔⴹⴰ ⴰⴽⴻⵏ ⴰⴷ ⵜⴼⴻⵔⵏⴻⴹ ⴰⴷⵉⴳ",
    "mapLocation": "ⴰⴷⵉⴳ ⵖⴻⴼ ⵓⴽⴰⵔⴹⴰ",
    "name": "ⵉⵙⴻⵎ ⵏ ⵡⴰⴷⴻⴳ",
    "namePlaceholder": "ⵉⵙⴻⵎ ⵏ ⵡⴰⴷⴻⴳ...",
    "noResults": "ⵓⵍⴰⵛ ⵉⴳⵎⴰⴹ",
    "search": {
      "placeholder": "ⵏⴰⴷⵉ ⵖⴻⴼ ⵢⵉⵡⴻⵏ ⵡⴰⴷⴻⴳ..."
    },
    "selectExisting": "ⴼⵔⴻⵏ ⴰⴷⵉⴳ ⵢⴻⵍⵍⴰⵏ",
    "selectThisLocation": "ⴼⵔⴻⵏ ⴰⴷⵉⴳ-ⴰ",
    "sortedByDistance": "ⵉⵣⴻⵎⵍⴻⵏ ⵙ ⵍⴻⴱⵄⴻⴷ",
    "type": "ⴰⵏⴰⵡ ⵏ ⵡⴰⴷⴻⴳ",
    "types": {
      "archaeologicalSite": "ⴰⵙⵉⵜ ⴰⵔⴽⵉⵢⵓⵍⵓⵊⵉⴽ",
      "cinema": "ⵙⵉⵏⵉⵎⴰ",
      "conferenceHall": "ⵜⴰⵅⵅⴰⵎⵜ ⵏ ⵓⵙⵉⴷⴻⴳ",
      "culturalCenter": "ⴰⵎⵎⴰⵙ ⴰⴷⴻⵍⵙⴰⵎⴰⵏ",
      "culturalSpace": "ⵜⴰⵍⵍⵓⵏⵜ ⵜⴰⴷⴻⵍⵙⴰⵏⵜ",
      "cultureHouse": "ⴰⵅⵅⴰⵎ ⵏ ⵢⵉⴷⵍⵉⵙⴻⵏ",
      "gallery": "ⵜⴰⵖⴻⵔⴱⴰⵙⵜ",
      "historicalMonument": "ⴰⴷⴳⴰⵏ ⴰⵎⴻⵣⵔⵓⵢ",
      "library": "ⵜⴰⵖⴻⵔⴱⴰⵙⵜ ⵏ ⵢⵉⴷⵍⵉⵙⴻⵏ",
      "museum": "ⴰⵙⵖⴻⵍ",
      "other": "ⵏⵏⵉⴹⴻⵏ",
      "outdoor": "ⴱⴻⵕⵕⴰ",
      "theater": "ⴰⵜⵉⴰⵜⵔⴰ",
      "theater2": "ⵜⴰⵅⵅⴰⵎⵜ ⵏ ⵜⴻⴰⵜⵔⴰ"
    },
    "useCurrentLocation": "ⵙⴻⵇⴷⴻⵛ ⴰⴷⵉⴳ-ⵉⵡ ⵜⵓⵔⴰ"
  }
};

// Fonction pour merger profondément les objets
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

// Appliquer les traductions à chaque langue
const languages = {
  'fr': placesTranslationsFR,
  'en': placesTranslationsEN,
  'ar': placesTranslationsAR,
  'tz-ltn': placesTranslationsTZLTN,
  'tz-tfng': placesTranslationsTZTFNG
};

let totalAdded = 0;

Object.entries(languages).forEach(([lang, translations]) => {
  const langPath = path.join(localesDir, lang, 'translation.json');

  console.log(`\n📝 Traitement de ${lang.toUpperCase()}...`);

  // Lire le fichier existant
  let data = {};
  try {
    const content = fs.readFileSync(langPath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${lang}:`, error.message);
    return;
  }

  // Merger les nouvelles traductions
  deepMerge(data, translations);

  // Sauvegarder
  fs.writeFileSync(langPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ ${lang.toUpperCase()} - Section PLACES ajoutée (43 clés)`);
  totalAdded += 43;
});

console.log('\n' + '='.repeat(60));
console.log(`\n🎉 SUCCÈS! ${totalAdded} traductions PLACES ajoutées (43 clés × 5 langues)`);
console.log('\n📊 Résumé de la session:');
console.log('  ✅ OEUVRE: 500 traductions (100 clés × 5 langues)');
console.log('  ✅ EVENT: 305 traductions (61 clés × 5 langues)');
console.log('  ✅ PLACES: 215 traductions (43 clés × 5 langues)');
console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🎯 TOTAL: 1020 nouvelles traductions ajoutées!');
console.log('\n');
