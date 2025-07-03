// complete-tzltn-translations.cjs
const fs = require('fs');
const path = require('path');

// Traductions complètes pour Tamazight Latin
const tzLtnTranslations = {
  // Auth
  "auth.mustBeConnected": "Ilaq ad tilid tettwasenṭ",
  "auth.required": "Ilaq",
  
  // Common
  "common.backToDashboard": "Aɣul ɣer tfelwit",
  "common.chooseFile": "Fren afaylu",
  "common.chooseFiles": "Fren ifuyla",
  "common.city": "Tamdint",
  "common.dragDropImage": "Zuɣed tesresed tugna da",
  "common.featureInDevelopment": "Tamahilt-a tella deg usbugel",
  "common.imageFormats": "Imasalen ittwaqbalen: JPG, PNG, GIF",
  "common.invalidDate": "Asakud ur iɣed ara",
  "common.noDescription": "Ulac aglam",
  "common.selectCity": "Fren tamdint",
  "common.selectType": "Fren anaw",
  "common.viewAll": "Wali akk",
  
  // Contributors
  "contributors.addedCount_one": "{{count}} amarag yettwarna",
  "contributors.addedCount_other": "{{count}} imuragen ttwarna",
  "contributors.alreadyAdded": "Yettwarna yakan",
  "contributors.createNew": "Snulfu-d amaynut",
  "contributors.errors.searchError": "Tuccḍa deg unadi",
  "contributors.externalContributor": "Amarag azɣaray",
  "contributors.mainContributors": "Imuragen igejdanen",
  "contributors.new": "Amaynut",
  "contributors.noContributors": "Ulac imuragen",
  "contributors.noResultsFor": "Ulac igmaḍ i",
  "contributors.otherContributors": "Imuragen nniḍen",
  "contributors.registeredMember": "Aεeggal yettwakelsen",
  "contributors.searchExisting": "Nadi deg wayen yellan",
  "contributors.searchPlaceholder": "Nadi amarag...",
  "contributors.selectRole": "Fren tamlilt",
  "contributors.title": "Imuragen",
  
  // Errors
  "errors.generic.message": "Tella-d tuccḍa ur nettwaṛǧi ara. Ma ulac aɣilif, εreḍ tikkelt-nniḍen.",
  "errors.generic.title": "Tuccḍa",
  "errors.loadingCraftsError": "Asali n tḥuna ur yeddi ara",
  "errors.loadingError": "Tuccḍa deg usali",
  "errors.partialDataLoad": "Isefka slan-d s wacemma",
  
  // Events
  "events.create.addAfterEvent": "Rnu deffir tadyant",
  "events.create.datesAndTimes": "Izemzan d wakuden",
  "events.create.descriptionPlaceholder": "Seglem tadyant...",
  "events.create.draftSaved": "Arewway yettwasekles",
  "events.create.endDate": "Azemz n tagara",
  "events.create.endTime": "Akud n tagara",
  "events.create.eventImage": "Tugna n tedyant",
  "events.create.eventName": "Isem n tedyant",
  "events.create.eventNamePlaceholder": "Sekcem isem n tedyant",
  "events.create.eventType": "Anaw n tedyant",
  "events.create.exactLocation": "Amḍiq leqqayen",
  "events.create.freeEvent": "Tadyant tabaṭelt",
  "events.create.generalInfo": "Talɣut tamatut",
  "events.create.imageAndMedia": "Tugniwin d wallalen",
  "events.create.locationPlaceholder": "Sekcem amḍiq",
  "events.create.maxParticipants": "Amḍan afellay n yimttekkiyen",
  "events.create.maxParticipantsPlaceholder": "Sekcem amḍan afellay",
  "events.create.participationAndPricing": "Attekki d ssuma",
  "events.create.postEventMedia": "Allalen deffir tadyant",
  "events.create.postEventMediaDesc": "Rnu tugniwin d tvidyutin deffir tadyant",
  "events.create.price": "Ssuma",
  "events.create.pricePlaceholder": "Sekcem ssuma",
  "events.create.publishEvent": "Suffeɣ-d tadyant",
  "events.create.saveAsDraft": "Sekles d arewway",
  "events.create.startDate": "Azemz n tazwara",
  "events.create.startTime": "Akud n tazwara",
  "events.create.subtitle": "Snulfu-d tadyant tadelsant tamaynut",
  "events.create.title": "Rnu tadyant",
  "events.create.willBeAvailableSoon": "Ad tili tewjed ɣer zdat",
  
  // Event types
  "events.types.concert": "Aḥebbi",
  "events.types.conference": "Asarag",
  "events.types.exhibition": "Asumer",
  "events.types.festival": "Tafaska",
  "events.types.literaryMeeting": "Tamlilit taseklant",
  "events.types.screening": "Askan",
  "events.types.show": "Asaḥḥa",
  "events.types.workshop": "Amahil",
  
  // Price
  "price.fixed": "Ssuma tukkist",
  "price.free": "Baṭel",
  
  // Works actions
  "works.actions.favorites": "Inurifen",
  "works.actions.listenNow": "Sel tura",
  "works.actions.myList": "Tabdart-iw",
  "works.actions.preview": "Taskant",
  "works.actions.readExcerpt": "Ɣer aḥric",
  "works.actions.readNow": "Ɣer tura",
  "works.actions.trailer": "Tanazayt",
  "works.actions.watchNow": "Wali tura",
  
  // Works types
  "works.types.album": "Album",
  "works.types.book": "Adlis",
  "works.types.film": "Asaru",
  
  // Sections
  "sections.crafts.title": "Tiḥuna",
  "sections.crafts.subtitle": "Af tiḥuna timaziɣin tilsanin",
  "sections.events.title": "Tidyanin i d-iteddun",
  "sections.events.subtitle": "Ur ttaǧǧa ara tadyant tadelsant",
  "sections.works.title": "Tiẓuriyin",
  "sections.works.subtitle": "Af tisnulfuyin tidelsanin"
};

console.log('🔧 Ajout des traductions Tamazight Latin manquantes...\n');

const file = path.join('i18n/locales/tz-ltn/translation.json');

try {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  let added = 0;
  let updated = 0;
  let checked = 0;
  
  // Parcourir toutes les traductions
  for (const [key, value] of Object.entries(tzLtnTranslations)) {
    const keys = key.split('.');
    let obj = content;
    
    // Créer la structure si nécessaire
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    checked++;
    
    // Ajouter ou mettre à jour la traduction
    if (!obj[lastKey]) {
      obj[lastKey] = value;
      console.log(`✅ Ajouté: ${key}`);
      added++;
    } else if (obj[lastKey].includes('{{') && !obj[lastKey].includes('{{count}}')) {
      obj[lastKey] = value;
      console.log(`🔄 Mis à jour: ${key}`);
      updated++;
    }
  }
  
  if (added > 0 || updated > 0) {
    fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
    console.log(`\n💾 Résultat:`);
    console.log(`  - ${added} nouvelles traductions ajoutées`);
    console.log(`  - ${updated} traductions mises à jour`);
    console.log(`  - ${checked} clés vérifiées au total`);
  } else {
    console.log(`\n✅ Toutes les traductions sont déjà présentes`);
  }
  
  // Compter les traductions finales
  let totalKeys = 0;
  let translatedKeys = 0;
  
  function countTranslations(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        totalKeys++;
        if (!obj[key].includes('{{') || obj[key].includes('{{count}}') || obj[key].includes('{{min}}')) {
          translatedKeys++;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        countTranslations(obj[key]);
      }
    }
  }
  
  countTranslations(content);
  
  const percentage = Math.round((translatedKeys / totalKeys) * 100);
  console.log(`\n📊 Statistiques finales:`);
  console.log(`  - Total: ${totalKeys} clés`);
  console.log(`  - Traduites: ${translatedKeys} (${percentage}%)`);
  console.log(`  - Non traduites: ${totalKeys - translatedKeys}`);
  
} catch (error) {
  console.error(`❌ Erreur: ${error.message}`);
}