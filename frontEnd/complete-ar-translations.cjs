// complete-ar-translations.cjs
const fs = require('fs');
const path = require('path');

// Dictionnaire complet de traductions arabes
const translations = {
  // Contributors - Formes plurielles arabes
  "contributors.addedCount_zero": "لم تتم إضافة أي مساهم",
  "contributors.addedCount_one": "تمت إضافة مساهم واحد",
  "contributors.addedCount_two": "تمت إضافة مساهمين اثنين",
  "contributors.addedCount_few": "تمت إضافة {{count}} مساهمين",
  "contributors.addedCount_many": "تمت إضافة {{count}} مساهماً",
  "contributors.addedCount_other": "تمت إضافة {{count}} مساهم",
  
  // Errors
  "errors.generic.message": "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
  "errors.generic.title": "خطأ",
  "errors.loadingCraftsError": "فشل تحميل الحرف اليدوية",
  "errors.loadingError": "خطأ في التحميل",
  "errors.partialDataLoad": "تم تحميل البيانات جزئياً",
  
  // Events types
  "events.types.concert": "حفلة موسيقية",
  "events.types.conference": "مؤتمر",
  "events.types.exhibition": "معرض",
  "events.types.festival": "مهرجان",
  "events.types.literaryMeeting": "لقاء أدبي",
  "events.types.screening": "عرض فيلم",
  "events.types.show": "عرض",
  "events.types.workshop": "ورشة عمل",
  
  // Footer
  "footer.legal": "القانونية",
  "footer.links.faq": "الأسئلة الشائعة",
  "footer.links.legalNotices": "الإشعارات القانونية",
  "footer.links.userGuide": "دليل المستخدم",
  "footer.location": "الموقع",
  "footer.navigation": "التنقل",
  "footer.platform": "المنصة",
  "footer.resources": "الموارد",
  
  // Header
  "header.badges.admin": "مدير",
  "header.badges.pending": "قيد الانتظار",
  "header.badges.professional": "محترف",
  "header.nav.about": "حول",
  "header.nav.crafts": "الحرف اليدوية",
  "header.nav.events": "الفعاليات",
  "header.nav.heritage": "التراث",
  "header.nav.works": "الأعمال",
  "header.subtitle": "منصة الثقافة الأمازيغية",
  "header.title": "تمليليت ثقافة",
  "header.userMenu.addWork": "إضافة عمل",
  "header.userMenu.administration": "الإدارة",
  "header.userMenu.createEvent": "إنشاء فعالية",
  "header.userMenu.metadata": "البيانات الوصفية",
  "header.userMenu.myFavorites": "مفضلاتي",
  "header.userMenu.myProfile": "ملفي الشخصي",
  "header.userMenu.mySpace": "مساحتي",
  "header.userMenu.pendingValidations": "بانتظار التحقق",
  "header.userMenu.proDashboard": "لوحة تحكم المحترفين",
  
  // Home
  "home.explore.subtitle": "اكتشف ثراء الثقافة الأمازيغية",
  "home.explore.tabs.crafts": "الحرف",
  "home.explore.tabs.events": "الفعاليات",
  "home.explore.tabs.heritage": "التراث",
  "home.explore.tabs.map": "الخريطة",
  "home.explore.tabs.works": "الأعمال",
  "home.explore.title": "استكشف",
  "home.mission.description": "منصة مخصصة للحفاظ على التراث الثقافي الأمازيغي وتعزيزه",
  "home.mission.learnMore": "اعرف المزيد",
  "home.mission.title": "مهمتنا",
  "home.professionals.benefits": "استفد من رؤية أكبر لأعمالك وفعالياتك",
  "home.professionals.createWork": "أنشئ عملاً",
  "home.professionals.organizeEvent": "نظم فعالية",
  "home.professionals.subtitle": "انضم إلى مجتمعنا من الفنانين والحرفيين",
  "home.professionals.title": "للمحترفين",
  "home.resources.access": "الوصول إلى الموارد",
  "home.resources.calendar": "التقويم الثقافي",
  "home.resources.directory": "دليل المحترفين",
  "home.resources.guide": "دليل الممارسات",
  "home.resources.title": "الموارد",
  "home.stats.events": "فعالية",
  "home.stats.heritage": "موقع تراثي",
  "home.stats.members": "عضو",
  "home.stats.subtitle": "أرقام تتحدث عن نفسها",
  "home.stats.title": "منصة حية",
  "home.stats.works": "عمل",
  
  // Notifications
  "notifications.youHave_zero": "ليس لديك إشعارات",
  "notifications.youHave_one": "لديك إشعار واحد",
  "notifications.youHave_two": "لديك إشعاران",
  "notifications.youHave_few": "لديك {{count}} إشعارات",
  "notifications.youHave_many": "لديك {{count}} إشعاراً",
  "notifications.youHave_other": "لديك {{count}} إشعار",
  
  // Price
  "price.fixed": "سعر ثابت",
  "price.free": "مجاني",
  
  // Publishers
  "publishers.addedCount_zero": "لم تتم إضافة أي ناشر",
  "publishers.addedCount_one": "تمت إضافة ناشر واحد",
  "publishers.addedCount_two": "تمت إضافة ناشرين اثنين",
  "publishers.addedCount_few": "تمت إضافة {{count}} ناشرين",
  "publishers.addedCount_many": "تمت إضافة {{count}} ناشراً",
  "publishers.addedCount_other": "تمت إضافة {{count}} ناشر",
  "publishers.createNew": "إنشاء ناشر جديد",
  "publishers.isbn": "الرقم الدولي المعياري للكتاب",
  "publishers.noResultsFor": "لا توجد نتائج لـ",
  "publishers.pricePlaceholder": "أدخل السعر",
  "publishers.role": "الدور",
  "publishers.roles.coPublisher": "ناشر مشارك",
  "publishers.roles.distributor": "موزع",
  "publishers.roles.mainPublisher": "الناشر الرئيسي",
  "publishers.roles.originalPublisher": "الناشر الأصلي",
  "publishers.roles.translationPublisher": "ناشر الترجمة",
  "publishers.salePrice": "سعر البيع",
  "publishers.search": "بحث",
  "publishers.searchPlaceholder": "ابحث عن ناشر...",
  "publishers.status": "الحالة",
  "publishers.statuses.cancelled": "ملغى",
  "publishers.statuses.inProgress": "قيد التقدم",
  "publishers.statuses.outOfStock": "نفذ المخزون",
  "publishers.statuses.published": "منشور",
  "publishers.title": "الناشرون",
  
  // Sections - Crafts
  "sections.crafts.exploreAll": "استكشف الكل",
  "sections.crafts.noCrafts": "لا توجد حرف يدوية",
  "sections.crafts.onOrder": "عند الطلب",
  "sections.crafts.price.from": "ابتداءً من",
  "sections.crafts.price.range": "{{min}} - {{max}}",
  "sections.crafts.price.upTo": "حتى",
  "sections.crafts.seeDetails": "عرض التفاصيل",
  "sections.crafts.stock.inStock_zero": "نفذ المخزون",
  "sections.crafts.stock.inStock_one": "قطعة واحدة متوفرة",
  "sections.crafts.stock.inStock_two": "قطعتان متوفرتان",
  "sections.crafts.stock.inStock_few": "{{count}} قطع متوفرة",
  "sections.crafts.stock.inStock_many": "{{count}} قطعة متوفرة",
  "sections.crafts.stock.inStock_other": "{{count}} قطعة متوفرة",
  "sections.crafts.stock.outOfStock": "نفذ المخزون",
  "sections.crafts.subtitle": "اكتشف الحرف اليدوية الأمازيغية الأصيلة",
  "sections.crafts.title": "الحرف اليدوية",
  
  // Sections - Events
  "sections.events.dateToConfirm": "التاريخ قيد التأكيد",
  "sections.events.noEvents": "لا توجد فعاليات",
  "sections.events.register": "التسجيل",
  "sections.events.registration": "التسجيل",
  "sections.events.seeAllEvents": "عرض جميع الفعاليات",
  "sections.events.subtitle": "لا تفوت أي حدث ثقافي",
  "sections.events.title": "الفعاليات القادمة"
};

// Appliquer les traductions
console.log('🔄 Application des traductions arabes complètes...\n');

const file = path.join('i18n/locales/ar/translation.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));

let applied = 0;

function applyTranslations(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      if ((obj[key].includes('{{') || obj[key].includes('⵿⵿')) && translations[fullKey]) {
        obj[key] = translations[fullKey];
        console.log(`✅ ${fullKey}`);
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

// Statistiques finales
console.log('\n📊 Vérification finale:');
let stats = { total: 0, translated: 0, untranslated: 0 };

function countStats(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      stats.total++;
      if (obj[key].includes('{{') || obj[key].includes('⵿⵿')) {
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
console.log(`Traduites: ${stats.translated} (${Math.round(stats.translated/stats.total*100)}%)`);
console.log(`Non traduites: ${stats.untranslated} (${Math.round(stats.untranslated/stats.total*100)}%)`);

if (stats.untranslated > 0) {
  console.log('\n📋 Clés restantes (10 premières):');
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
  remaining.slice(0, 10).forEach(key => console.log(`  - ${key}`));
  if (remaining.length > 10) {
    console.log(`  ... et ${remaining.length - 10} autres`);
  }
}