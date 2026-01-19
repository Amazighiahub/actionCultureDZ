#!/usr/bin/env node
/**
 * Ajoute toutes les traductions EVENT dans les 5 langues
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

// Traductions EVENT en français
const eventTranslationsFR = {
  "event": {
    "accessibility": "Accessibilité",
    "backToList": "Retour à la liste",
    "browseAllEvents": "Parcourir tous les événements",
    "capacity": "Capacité",
    "certificate": "Certificat",
    "certificateDelivered": "Certificat délivré",
    "contact": "Contact",
    "description": "Description",
    "endDate": "Date de fin",
    "getDirections": "Obtenir l'itinéraire",
    "location": "Lieu",
    "mainOrganizer": "Organisateur principal",
    "minimumAge": "Âge minimum",
    "moreEvents": "Plus d'événements",
    "noDescription": "Aucune description disponible",
    "noOrganizers": "Aucun organisateur",
    "noRelatedEvents": "Aucun événement associé",
    "notFound": "Événement non trouvé",
    "organizers": "Organisateurs",
    "partners": "Partenaires",
    "practicalInfo": "Infos pratiques",
    "pricing": "Tarification",
    "registration": {
      "alreadyRegistered": "Vous êtes déjà inscrit",
      "cancel": "Annuler l'inscription",
      "cancelled": "Inscription annulée",
      "cancelledDesc": "Votre inscription a été annulée avec succès",
      "closed": "Inscriptions fermées",
      "comment": "Commentaire",
      "commentPlaceholder": "Ajoutez un commentaire ou des questions...",
      "confirm": "Confirmer l'inscription",
      "confirmed": "Inscription confirmée",
      "date": "Date d'inscription",
      "deadline": "Date limite d'inscription",
      "dialogTitle": "Inscription à l'événement",
      "event": "Événement",
      "eventPast": "Cet événement est passé",
      "fewPlaces": "Places limitées",
      "full": "Complet",
      "loginToRegister": "Connectez-vous pour vous inscrire",
      "numberOfPeople": "Nombre de personnes",
      "participants": "Participants",
      "pending": "En attente",
      "people": "personne(s)",
      "perPerson": "par personne",
      "questions": "Questions",
      "register": "S'inscrire",
      "required": "Inscription requise",
      "success": "Inscription réussie",
      "successDesc": "Votre inscription a été confirmée",
      "title": "Inscription",
      "total": "Total",
      "unavailable": "Inscription indisponible",
      "waitingList": "Liste d'attente"
    },
    "registrationDeadline": "Date limite d'inscription",
    "relatedEvents": "Événements associés",
    "startDate": "Date de début",
    "tabs": {
      "comments": "Commentaires",
      "gallery": "Galerie",
      "info": "Informations",
      "program": "Programme"
    },
    "viewOnMap": "Voir sur la carte"
  }
};

// Traductions EVENT en anglais
const eventTranslationsEN = {
  "event": {
    "accessibility": "Accessibility",
    "backToList": "Back to list",
    "browseAllEvents": "Browse all events",
    "capacity": "Capacity",
    "certificate": "Certificate",
    "certificateDelivered": "Certificate delivered",
    "contact": "Contact",
    "description": "Description",
    "endDate": "End date",
    "getDirections": "Get directions",
    "location": "Location",
    "mainOrganizer": "Main organizer",
    "minimumAge": "Minimum age",
    "moreEvents": "More events",
    "noDescription": "No description available",
    "noOrganizers": "No organizers",
    "noRelatedEvents": "No related events",
    "notFound": "Event not found",
    "organizers": "Organizers",
    "partners": "Partners",
    "practicalInfo": "Practical info",
    "pricing": "Pricing",
    "registration": {
      "alreadyRegistered": "You are already registered",
      "cancel": "Cancel registration",
      "cancelled": "Registration cancelled",
      "cancelledDesc": "Your registration has been cancelled successfully",
      "closed": "Registration closed",
      "comment": "Comment",
      "commentPlaceholder": "Add a comment or questions...",
      "confirm": "Confirm registration",
      "confirmed": "Registration confirmed",
      "date": "Registration date",
      "deadline": "Registration deadline",
      "dialogTitle": "Event registration",
      "event": "Event",
      "eventPast": "This event is over",
      "fewPlaces": "Limited places",
      "full": "Full",
      "loginToRegister": "Log in to register",
      "numberOfPeople": "Number of people",
      "participants": "Participants",
      "pending": "Pending",
      "people": "person(s)",
      "perPerson": "per person",
      "questions": "Questions",
      "register": "Register",
      "required": "Registration required",
      "success": "Registration successful",
      "successDesc": "Your registration has been confirmed",
      "title": "Registration",
      "total": "Total",
      "unavailable": "Registration unavailable",
      "waitingList": "Waiting list"
    },
    "registrationDeadline": "Registration deadline",
    "relatedEvents": "Related events",
    "startDate": "Start date",
    "tabs": {
      "comments": "Comments",
      "gallery": "Gallery",
      "info": "Information",
      "program": "Program"
    },
    "viewOnMap": "View on map"
  }
};

// Traductions EVENT en arabe
const eventTranslationsAR = {
  "event": {
    "accessibility": "إمكانية الوصول",
    "backToList": "العودة إلى القائمة",
    "browseAllEvents": "تصفح جميع الأحداث",
    "capacity": "السعة",
    "certificate": "الشهادة",
    "certificateDelivered": "تم تسليم الشهادة",
    "contact": "اتصل",
    "description": "الوصف",
    "endDate": "تاريخ الانتهاء",
    "getDirections": "الحصول على الاتجاهات",
    "location": "الموقع",
    "mainOrganizer": "المنظم الرئيسي",
    "minimumAge": "الحد الأدنى للسن",
    "moreEvents": "المزيد من الأحداث",
    "noDescription": "لا يوجد وصف متاح",
    "noOrganizers": "لا يوجد منظمون",
    "noRelatedEvents": "لا توجد أحداث مرتبطة",
    "notFound": "الحدث غير موجود",
    "organizers": "المنظمون",
    "partners": "الشركاء",
    "practicalInfo": "معلومات عملية",
    "pricing": "التسعير",
    "registration": {
      "alreadyRegistered": "أنت مسجل بالفعل",
      "cancel": "إلغاء التسجيل",
      "cancelled": "تم إلغاء التسجيل",
      "cancelledDesc": "تم إلغاء تسجيلك بنجاح",
      "closed": "التسجيل مغلق",
      "comment": "تعليق",
      "commentPlaceholder": "أضف تعليقًا أو أسئلة...",
      "confirm": "تأكيد التسجيل",
      "confirmed": "تم تأكيد التسجيل",
      "date": "تاريخ التسجيل",
      "deadline": "الموعد النهائي للتسجيل",
      "dialogTitle": "التسجيل في الحدث",
      "event": "الحدث",
      "eventPast": "هذا الحدث قد انتهى",
      "fewPlaces": "أماكن محدودة",
      "full": "ممتلئ",
      "loginToRegister": "سجل الدخول للتسجيل",
      "numberOfPeople": "عدد الأشخاص",
      "participants": "المشاركون",
      "pending": "قيد الانتظار",
      "people": "شخص (أشخاص)",
      "perPerson": "لكل شخص",
      "questions": "أسئلة",
      "register": "سجل",
      "required": "التسجيل مطلوب",
      "success": "نجح التسجيل",
      "successDesc": "تم تأكيد تسجيلك",
      "title": "التسجيل",
      "total": "المجموع",
      "unavailable": "التسجيل غير متاح",
      "waitingList": "قائمة الانتظار"
    },
    "registrationDeadline": "الموعد النهائي للتسجيل",
    "relatedEvents": "الأحداث المرتبطة",
    "startDate": "تاريخ البدء",
    "tabs": {
      "comments": "التعليقات",
      "gallery": "المعرض",
      "info": "المعلومات",
      "program": "البرنامج"
    },
    "viewOnMap": "عرض على الخريطة"
  }
};

// Traductions EVENT en Tamazight Latin
const eventTranslationsTZLTN = {
  "event": {
    "accessibility": "Tuffra",
    "backToList": "Uɣal ɣer tebdart",
    "browseAllEvents": "Snirem akk ineḍruyen",
    "capacity": "Tazmert",
    "certificate": "Aselken",
    "certificateDelivered": "Aselken yettwafken",
    "contact": "Nermes",
    "description": "Aglam",
    "endDate": "Azemz n tagara",
    "getDirections": "Awi abrid",
    "location": "Adig",
    "mainOrganizer": "Amsuddes agejdan",
    "minimumAge": "Awtay adday",
    "moreEvents": "Ugar n yineḍruyen",
    "noDescription": "Ulac aglam",
    "noOrganizers": "Ulac imseddisen",
    "noRelatedEvents": "Ulac ineḍruyen icudden",
    "notFound": "Aneḍru ur yettwaf ara",
    "organizers": "Imseddisen",
    "partners": "Imendiden",
    "practicalInfo": "Talɣut tifawtin",
    "pricing": "Ssuma",
    "registration": {
      "alreadyRegistered": "Tettwajerrḍeḍ yakan",
      "cancel": "Sefsex ajerred",
      "cancelled": "Ajerred yettwasefsex",
      "cancelledDesc": "Ajerred-inek yettwasefsex akken iwata",
      "closed": "Ajerred yemdel",
      "comment": "Awennit",
      "commentPlaceholder": "Rnu awennit neɣ isteqsiyen...",
      "confirm": "Sentem ajerred",
      "confirmed": "Ajerred yettwasenten",
      "date": "Azemz n ujerred",
      "deadline": "Talast tagejdant n ujerred",
      "dialogTitle": "Ajerred deg uneḍru",
      "event": "Aneḍru",
      "eventPast": "Aneḍru-ya iεedda",
      "fewPlaces": "Idigen imeẓẓyanen",
      "full": "Yeččur",
      "loginToRegister": "Kcem akken ad tjerrḍeḍ",
      "numberOfPeople": "Amḍan n yimdanen",
      "participants": "Imttekkiyen",
      "pending": "Deg uṛaǧu",
      "people": "amdan (imdanen)",
      "perPerson": "i umdan",
      "questions": "Isteqsiyen",
      "register": "Jerreḍ",
      "required": "Ajerred ilaq",
      "success": "Ajerred yedda",
      "successDesc": "Ajerred-inek yettwasenten",
      "title": "Ajerred",
      "total": "Amḍan",
      "unavailable": "Ajerred ulac-it",
      "waitingList": "Tabdart n uṛaǧu"
    },
    "registrationDeadline": "Talast tagejdant n ujerred",
    "relatedEvents": "Ineḍruyen icudden",
    "startDate": "Azemz n tazwara",
    "tabs": {
      "comments": "Iwenniten",
      "gallery": "Taγerbast",
      "info": "Talɣut",
      "program": "Ahil"
    },
    "viewOnMap": "Wali deg ukarḍa"
  }
};

// Traductions EVENT en Tamazight Tifinagh
const eventTranslationsTZTFNG = {
  "event": {
    "accessibility": "ⵜⵓⴼⴼⵔⴰ",
    "backToList": "ⵓⵖⴰⵍ ⵖⵔ ⵜⴻⴱⴷⴰⵔⵜ",
    "browseAllEvents": "ⵙⵏⵉⵔⴻⵎ ⴰⴽⴽ ⵉⵏⴻⴹⵔⵓⵢⴻⵏ",
    "capacity": "ⵜⴰⵣⵎⴻⵔⵜ",
    "certificate": "ⴰⵙⴻⵍⴽⴻⵏ",
    "certificateDelivered": "ⴰⵙⴻⵍⴽⴻⵏ ⵢⴻⵜⵜⵡⴰⴼⴽⴻⵏ",
    "contact": "ⵏⴻⵔⵎⴻⵙ",
    "description": "ⴰⴳⵍⴰⵎ",
    "endDate": "ⴰⵣⴻⵎⵣ ⵏ ⵜⴰⴳⴰⵔⴰ",
    "getDirections": "ⴰⵡⵉ ⴰⴱⵔⵉⴷ",
    "location": "ⴰⴷⵉⴳ",
    "mainOrganizer": "ⴰⵎⵙⵓⴷⴷⴻⵙ ⴰⴳⴻⵊⴷⴰⵏ",
    "minimumAge": "ⴰⵡⵜⴰⵢ ⴰⴷⴷⴰⵢ",
    "moreEvents": "ⵓⴳⴰⵔ ⵏ ⵢⵉⵏⴻⴹⵔⵓⵢⴻⵏ",
    "noDescription": "ⵓⵍⴰⵛ ⴰⴳⵍⴰⵎ",
    "noOrganizers": "ⵓⵍⴰⵛ ⵉⵎⵙⴻⴷⴷⵉⵙⴻⵏ",
    "noRelatedEvents": "ⵓⵍⴰⵛ ⵉⵏⴻⴹⵔⵓⵢⴻⵏ ⵉⵛⵓⴷⴷⴻⵏ",
    "notFound": "ⴰⵏⴻⴹⵔⵓ ⵓⵔ ⵢⴻⵜⵜⵡⴰⴼ ⴰⵔⴰ",
    "organizers": "ⵉⵎⵙⴻⴷⴷⵉⵙⴻⵏ",
    "partners": "ⵉⵎⴻⵏⴷⵉⴷⴻⵏ",
    "practicalInfo": "ⵜⴰⵍⵖⵓⵜ ⵜⵉⴼⴰⵡⵜⵉⵏ",
    "pricing": "ⵙⵙⵓⵎⴰ",
    "registration": {
      "alreadyRegistered": "ⵜⴻⵜⵜⵡⴰⵊⴻⵔⵔⴹⴻⴹ ⵢⴰⴽⴰⵏ",
      "cancel": "ⵙⴻⴼⵙⴻⵅ ⴰⵊⴻⵔⵔⴻⴷ",
      "cancelled": "ⴰⵊⴻⵔⵔⴻⴷ ⵢⴻⵜⵜⵡⴰⵙⴻⴼⵙⴻⵅ",
      "cancelledDesc": "ⴰⵊⴻⵔⵔⴻⴷ-ⵉⵏⴻⴽ ⵢⴻⵜⵜⵡⴰⵙⴻⴼⵙⴻⵅ ⴰⴽⴽⴻⵏ ⵉⵡⴰⵜⴰ",
      "closed": "ⴰⵊⴻⵔⵔⴻⴷ ⵢⴻⵎⴷⴻⵍ",
      "comment": "ⴰⵡⴻⵏⵏⵉⵜ",
      "commentPlaceholder": "ⵔⵏⵓ ⴰⵡⴻⵏⵏⵉⵜ ⵏⴻⵖ ⵉⵙⵜⴻⵇⵙⵉⵢⴻⵏ...",
      "confirm": "ⵙⴻⵏⵜⴻⵎ ⴰⵊⴻⵔⵔⴻⴷ",
      "confirmed": "ⴰⵊⴻⵔⵔⴻⴷ ⵢⴻⵜⵜⵡⴰⵙⴻⵏⵜⴻⵎ",
      "date": "ⴰⵣⴻⵎⵣ ⵏ ⵓⵊⴻⵔⵔⴻⴷ",
      "deadline": "ⵜⴰⵍⴰⵙⵜ ⵜⴰⴳⴻⵊⴷⴰⵏⵜ ⵏ ⵓⵊⴻⵔⵔⴻⴷ",
      "dialogTitle": "ⴰⵊⴻⵔⵔⴻⴷ ⴷⴻⴳ ⵓⵏⴻⴹⵔⵓ",
      "event": "ⴰⵏⴻⴹⵔⵓ",
      "eventPast": "ⴰⵏⴻⴹⵔⵓ-ⵢⴰ ⵉⵄⴻⴷⴷⴰ",
      "fewPlaces": "ⵉⴷⵉⴳⴻⵏ ⵉⵎⴻⵥⵥⵢⴰⵏⴻⵏ",
      "full": "ⵢⴻⵛⵛⵓⵔ",
      "loginToRegister": "ⴽⵛⴻⵎ ⴰⴽⴽⴻⵏ ⴰⴷ ⵜⵊⴻⵔⵔⴹⴻⴹ",
      "numberOfPeople": "ⴰⵎⴹⴰⵏ ⵏ ⵢⵉⵎⴷⴰⵏⴻⵏ",
      "participants": "ⵉⵎⵜⵜⴻⴽⴽⵉⵢⴻⵏ",
      "pending": "ⴷⴻⴳ ⵓⵕⴰⵊⵓ",
      "people": "ⴰⵎⴷⴰⵏ (ⵉⵎⴷⴰⵏⴻⵏ)",
      "perPerson": "ⵉ ⵓⵎⴷⴰⵏ",
      "questions": "ⵉⵙⵜⴻⵇⵙⵉⵢⴻⵏ",
      "register": "ⵊⴻⵔⵔⴻⴹ",
      "required": "ⴰⵊⴻⵔⵔⴻⴷ ⵉⵍⴰⵇ",
      "success": "ⴰⵊⴻⵔⵔⴻⴷ ⵢⴻⴷⴷⴰ",
      "successDesc": "ⴰⵊⴻⵔⵔⴻⴷ-ⵉⵏⴻⴽ ⵢⴻⵜⵜⵡⴰⵙⴻⵏⵜⴻⵎ",
      "title": "ⴰⵊⴻⵔⵔⴻⴷ",
      "total": "ⴰⵎⴹⴰⵏ",
      "unavailable": "ⴰⵊⴻⵔⵔⴻⴷ ⵓⵍⴰⵛ-ⵉⵜ",
      "waitingList": "ⵜⴰⴱⴷⴰⵔⵜ ⵏ ⵓⵕⴰⵊⵓ"
    },
    "registrationDeadline": "ⵜⴰⵍⴰⵙⵜ ⵜⴰⴳⴻⵊⴷⴰⵏⵜ ⵏ ⵓⵊⴻⵔⵔⴻⴷ",
    "relatedEvents": "ⵉⵏⴻⴹⵔⵓⵢⴻⵏ ⵉⵛⵓⴷⴷⴻⵏ",
    "startDate": "ⴰⵣⴻⵎⵣ ⵏ ⵜⴰⵣⵡⴰⵔⴰ",
    "tabs": {
      "comments": "ⵉⵡⴻⵏⵏⵉⵜⴻⵏ",
      "gallery": "ⵜⴰⵖⴻⵔⴱⴰⵙⵜ",
      "info": "ⵜⴰⵍⵖⵓⵜ",
      "program": "ⴰⵀⵉⵍ"
    },
    "viewOnMap": "ⵡⴰⵍⵉ ⴷⴻⴳ ⵓⴽⴰⵔⴹⴰ"
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
  'fr': eventTranslationsFR,
  'en': eventTranslationsEN,
  'ar': eventTranslationsAR,
  'tz-ltn': eventTranslationsTZLTN,
  'tz-tfng': eventTranslationsTZTFNG
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

  console.log(`✅ ${lang.toUpperCase()} - Section EVENT ajoutée (61 clés)`);
  totalAdded += 61;
});

console.log('\n' + '='.repeat(60));
console.log(`\n🎉 SUCCÈS! ${totalAdded} traductions EVENT ajoutées (61 clés × 5 langues)`);
console.log('\n📊 Prochaine étape:');
console.log('  - PLACES: 43 clés × 5 langues = 215 traductions');
console.log('\n');
