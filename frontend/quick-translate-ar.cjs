// quick-translate-ar.cjs
const fs = require('fs');
const path = require('path');

// Dictionnaire de traductions courantes arabe
const translations = {
  // Auth
  "auth.mustBeConnected": "يجب أن تكون متصلاً",
  "auth.required": "مطلوب",
  
  // Common
  "common.backToDashboard": "العودة إلى لوحة التحكم",
  "common.chooseFile": "اختر ملف",
  "common.chooseFiles": "اختر الملفات",
  "common.city": "المدينة",
  "common.dragDropImage": "اسحب وأفلت الصورة هنا",
  "common.featureInDevelopment": "هذه الميزة قيد التطوير",
  "common.imageFormats": "الصيغ المدعومة: JPG, PNG, GIF",
  "common.invalidDate": "تاريخ غير صالح",
  "common.noDescription": "لا يوجد وصف",
  "common.selectCity": "اختر المدينة",
  "common.selectType": "اختر النوع",
  "common.viewAll": "عرض الكل",
  
  // Contributors
  "contributors.addedCount": "تمت الإضافة",
  "contributors.alreadyAdded": "تمت الإضافة مسبقاً",
  "contributors.createNew": "إنشاء جديد",
  "contributors.errors.searchError": "خطأ في البحث",
  "contributors.externalContributor": "مساهم خارجي",
  "contributors.mainContributors": "المساهمون الرئيسيون",
  "contributors.new": "جديد",
  "contributors.noContributors": "لا يوجد مساهمون",
  "contributors.noResultsFor": "لا توجد نتائج لـ",
  "contributors.otherContributors": "مساهمون آخرون",
  "contributors.registeredMember": "عضو مسجل",
  "contributors.searchExisting": "البحث في الموجود",
  "contributors.searchPlaceholder": "ابحث عن مساهم...",
  "contributors.selectRole": "اختر الدور",
  "contributors.title": "المساهمون",
  
  // Events
  "events.create.addAfterEvent": "إضافة بعد الحدث",
  "events.create.datesAndTimes": "التواريخ والأوقات",
  "events.create.descriptionPlaceholder": "صف الحدث...",
  "events.create.draftSaved": "تم حفظ المسودة",
  "events.create.endDate": "تاريخ الانتهاء",
  "events.create.endTime": "وقت الانتهاء",
  "events.create.eventImage": "صورة الحدث",
  "events.create.eventName": "اسم الحدث",
  "events.create.eventNamePlaceholder": "أدخل اسم الحدث",
  "events.create.eventType": "نوع الحدث",
  "events.create.exactLocation": "الموقع الدقيق",
  "events.create.freeEvent": "حدث مجاني",
  "events.create.generalInfo": "معلومات عامة",
  "events.create.imageAndMedia": "الصور والوسائط",
  "events.create.locationPlaceholder": "أدخل الموقع",
  "events.create.maxParticipants": "العدد الأقصى للمشاركين",
  "events.create.maxParticipantsPlaceholder": "أدخل العدد الأقصى",
  "events.create.participationAndPricing": "المشاركة والتسعير",
  "events.create.postEventMedia": "وسائط ما بعد الحدث",
  "events.create.postEventMediaDesc": "إضافة صور وفيديوهات بعد انتهاء الحدث",
  "events.create.price": "السعر",
  "events.create.pricePlaceholder": "أدخل السعر",
  "events.create.publishEvent": "نشر الحدث",
  "events.create.saveAsDraft": "حفظ كمسودة",
  "events.create.startDate": "تاريخ البداية",
  "events.create.startTime": "وقت البداية",
  "events.create.subtitle": "أنشئ حدثاً ثقافياً جديداً",
  "events.create.title": "إضافة حدث جديد",
  "events.create.willBeAvailableSoon": "ستكون متاحة قريباً"
};

// Appliquer les traductions
console.log('🔄 Application des traductions arabes...\n');

const file = path.join('i18n/locales/ar/translation.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));

let applied = 0;

function applyTranslations(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      if ((obj[key].includes('{{') || obj[key].includes('⵿⵿')) && translations[fullKey]) {
        obj[key] = translations[fullKey];
        console.log(`✅ ${fullKey}: "${translations[fullKey]}"`);
        applied++;
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
} else {
  console.log('ℹ️  Aucune nouvelle traduction à appliquer.');
}

// Montrer les clés qui restent à traduire
console.log('\n📋 Clés restantes à traduire:');
let remaining = [];
function findRemaining(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'string' && (obj[key].includes('{{') || obj[key].includes('⵿⵿'))) {
      remaining.push(fullKey);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      findRemaining(obj[key], fullKey);
    }
  }
}
findRemaining(content);

if (remaining.length > 0) {
  console.log(`Il reste ${remaining.length} clés à traduire.`);
  remaining.slice(0, 10).forEach(key => console.log(`  - ${key}`));
  if (remaining.length > 10) {
    console.log(`  ... et ${remaining.length - 10} autres`);
  }
}