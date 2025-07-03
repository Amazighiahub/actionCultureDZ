// final-ar-translations.cjs
const fs = require('fs');
const path = require('path');

// Dernier lot de traductions arabes
const translations = {
  // Footer manquants
  "footer.legal": "القانونية",
  "footer.links.faq": "الأسئلة الشائعة",
  "footer.links.legalNotices": "الإشعارات القانونية", 
  "footer.links.userGuide": "دليل المستخدم",
  "footer.location": "الموقع",
  "footer.navigation": "التنقل",
  "footer.platform": "المنصة",
  "footer.resources": "الموارد",
  
  // Header manquants
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
  
  // Price
  "price.free": "مجاني",
  
  // Sections - Crafts manquants
  "sections.crafts.stock.outOfStock": "نفذ المخزون",
  "sections.crafts.subtitle": "اكتشف الحرف اليدوية الأمازيغية الأصيلة",
  "sections.crafts.title": "الحرف اليدوية",
  
  // Sections - Events manquants
  "sections.events.seeAllEvents": "عرض جميع الفعاليات",
  "sections.events.subtitle": "لا تفوت أي حدث ثقافي",
  "sections.events.title": "الفعاليات القادمة",
  
  // Sections - Heritage
  "sections.heritage.discover": "اكتشف",
  "sections.heritage.filters.allRegions": "جميع المناطق",
  "sections.heritage.filters.archaeological": "أثري",
  "sections.heritage.filters.monuments": "معالم",
  "sections.heritage.filters.traditional": "تقليدي",
  "sections.heritage.interactiveMap": "خريطة تفاعلية",
  "sections.heritage.map.explore": "استكشف الخريطة",
  "sections.heritage.mapDescription": "اكتشف المواقع التراثية على الخريطة التفاعلية",
  "sections.heritage.noResults": "لا توجد نتائج",
  "sections.heritage.otherSites": "مواقع أخرى",
  "sections.heritage.planVisit.description": "خطط لزيارتك مع دليلنا التفصيلي",
  "sections.heritage.planVisit.guide": "الدليل السياحي",
  "sections.heritage.planVisit.start": "ابدأ التخطيط",
  "sections.heritage.planVisit.title": "خطط لزيارتك",
  "sections.heritage.reviews": "التقييمات",
  "sections.heritage.seeAll": "عرض الكل",
  "sections.heritage.subtitle": "استكشف كنوز التراث الأمازيغي",
  "sections.heritage.title": "التراث",
  
  // Sections - Works
  "sections.works.actions.readArticle": "قراءة المقال",
  "sections.works.actions.view": "عرض",
  "sections.works.ageLabels.classic": "كلاسيكي",
  "sections.works.ageLabels.recent": "حديث",
  "sections.works.badges.classic": "كلاسيكي",
  "sections.works.badges.new": "جديد",
  "sections.works.badges.popular": "شائع",
  "sections.works.createdIn": "أُنشئ في",
  "sections.works.details": "التفاصيل",
  "sections.works.empty.noFeatured": "لا توجد أعمال مميزة",
  "sections.works.empty.noNew": "لا توجد أعمال جديدة",
  "sections.works.empty.noPopular": "لا توجد أعمال شائعة",
  "sections.works.empty.noRecommended": "لا توجد أعمال موصى بها",
  "sections.works.empty.noSearch": "لا توجد نتائج للبحث",
  "sections.works.empty.noType": "لا توجد أعمال من هذا النوع",
  "sections.works.empty.noWorks": "لا توجد أعمال",
  "sections.works.exploreLibrary": "استكشف المكتبة",
  "sections.works.filters.all": "الكل",
  "sections.works.filters.allTypes": "جميع الأنواع",
  "sections.works.filters.featured": "مميز",
  "sections.works.filters.new": "جديد",
  "sections.works.filters.popular": "شائع",
  "sections.works.filters.recommended": "موصى به",
  "sections.works.info.classicsDesc": "الأعمال الكلاسيكية التي صمدت عبر الزمن",
  "sections.works.info.featuredCount_zero": "لا توجد أعمال مميزة",
  "sections.works.info.featuredCount_one": "عمل مميز واحد",
  "sections.works.info.featuredCount_two": "عملان مميزان",
  "sections.works.info.featuredCount_few": "{{count}} أعمال مميزة",
  "sections.works.info.featuredCount_many": "{{count}} عملاً مميزاً",
  "sections.works.info.featuredCount_other": "{{count}} عمل مميز",
  "sections.works.info.newCount_zero": "لا توجد أعمال جديدة",
  "sections.works.info.newCount_one": "عمل جديد واحد",
  "sections.works.info.newCount_two": "عملان جديدان",
  "sections.works.info.newCount_few": "{{count}} أعمال جديدة",
  "sections.works.info.newCount_many": "{{count}} عملاً جديداً",
  "sections.works.info.newCount_other": "{{count}} عمل جديد",
  "sections.works.info.popularCount_zero": "لا توجد أعمال شائعة",
  "sections.works.info.popularCount_one": "عمل شائع واحد",
  "sections.works.info.popularCount_two": "عملان شائعان",
  "sections.works.info.popularCount_few": "{{count}} أعمال شائعة",
  "sections.works.info.popularCount_many": "{{count}} عملاً شائعاً",
  "sections.works.info.popularCount_other": "{{count}} عمل شائع",
  "sections.works.info.recommendedCount_zero": "لا توجد أعمال موصى بها",
  "sections.works.info.recommendedCount_one": "عمل موصى به واحد",
  "sections.works.info.recommendedCount_two": "عملان موصى بهما",
  "sections.works.info.recommendedCount_few": "{{count}} أعمال موصى بها",
  "sections.works.info.recommendedCount_many": "{{count}} عملاً موصى به",
  "sections.works.info.recommendedCount_other": "{{count}} عمل موصى به",
  "sections.works.loading": "جاري التحميل...",
  "sections.works.noTitle": "بدون عنوان",
  "sections.works.noWorks": "لا توجد أعمال",
  "sections.works.preview": "معاينة",
  "sections.works.rateLimit.cache": "ذاكرة التخزين المؤقت",
  "sections.works.rateLimit.clearCache": "مسح ذاكرة التخزين المؤقت",
  "sections.works.rateLimit.currentDelay": "التأخير الحالي",
  "sections.works.rateLimit.entries": "مدخلات",
  "sections.works.rateLimit.health.critical": "حرج",
  "sections.works.rateLimit.health.good": "جيد",
  "sections.works.rateLimit.health.slow": "بطيء",
  "sections.works.rateLimit.health.warning": "تحذير",
  "sections.works.rateLimit.hits": "الزيارات",
  "sections.works.rateLimit.normalMode": "الوضع العادي",
  "sections.works.rateLimit.queue": "قائمة الانتظار",
  "sections.works.rateLimit.requestsPerMinute": "طلبات في الدقيقة",
  "sections.works.rateLimit.slowMode": "الوضع البطيء",
  "sections.works.rateLimit.status": "الحالة",
  "sections.works.rateLimit.title": "حد المعدل",
  "sections.works.results.count_zero": "لا توجد نتائج",
  "sections.works.results.count_one": "نتيجة واحدة",
  "sections.works.results.count_two": "نتيجتان",
  "sections.works.results.count_few": "{{count}} نتائج",
  "sections.works.results.count_many": "{{count}} نتيجة",
  "sections.works.results.count_other": "{{count}} نتيجة",
  "sections.works.searchPlaceholder": "ابحث عن عمل...",
  "sections.works.stats.classics_zero": "لا توجد أعمال كلاسيكية",
  "sections.works.stats.classics_one": "عمل كلاسيكي واحد",
  "sections.works.stats.classics_two": "عملان كلاسيكيان",
  "sections.works.stats.classics_few": "{{count}} أعمال كلاسيكية",
  "sections.works.stats.classics_many": "{{count}} عملاً كلاسيكياً",
  "sections.works.stats.classics_other": "{{count}} عمل كلاسيكي",
  "sections.works.stats.new_zero": "لا توجد أعمال جديدة",
  "sections.works.stats.new_one": "عمل جديد واحد",
  "sections.works.stats.new_two": "عملان جديدان",
  "sections.works.stats.new_few": "{{count}} أعمال جديدة",
  "sections.works.stats.new_many": "{{count}} عملاً جديداً",
  "sections.works.stats.new_other": "{{count}} عمل جديد",
  "sections.works.stats.recent_zero": "لا توجد أعمال حديثة",
  "sections.works.stats.recent_one": "عمل حديث واحد",
  "sections.works.stats.recent_two": "عملان حديثان",
  "sections.works.stats.recent_few": "{{count}} أعمال حديثة",
  "sections.works.stats.recent_many": "{{count}} عملاً حديثاً",
  "sections.works.stats.recent_other": "{{count}} عمل حديث",
  "sections.works.stats.total_zero": "لا توجد أعمال",
  "sections.works.stats.total_one": "عمل واحد",
  "sections.works.stats.total_two": "عملان",
  "sections.works.stats.total_few": "{{count}} أعمال",
  "sections.works.stats.total_many": "{{count}} عملاً",
  "sections.works.stats.total_other": "{{count}} عمل",
  "sections.works.subtitle": "اكتشف الإبداعات الثقافية",
  "sections.works.title": "الأعمال",
  
  // Works
  "works.actions.favorites": "المفضلة",
  "works.actions.listenNow": "استمع الآن",
  "works.actions.myList": "قائمتي",
  "works.actions.preview": "معاينة",
  "works.actions.readExcerpt": "قراءة مقتطف",
  "works.actions.readNow": "اقرأ الآن",
  "works.actions.trailer": "المقطع الدعائي",
  "works.actions.watchNow": "شاهد الآن",
  "works.album.tracksCount_zero": "لا توجد مقاطع",
  "works.album.tracksCount_one": "مقطع واحد",
  "works.album.tracksCount_two": "مقطعان",
  "works.album.tracksCount_few": "{{count}} مقاطع",
  "works.album.tracksCount_many": "{{count}} مقطعاً",
  "works.album.tracksCount_other": "{{count}} مقطع",
  "works.duration.minutes_zero": "أقل من دقيقة",
  "works.duration.minutes_one": "دقيقة واحدة",
  "works.duration.minutes_two": "دقيقتان",
  "works.duration.minutes_few": "{{count}} دقائق",
  "works.duration.minutes_many": "{{count}} دقيقة",
  "works.duration.minutes_other": "{{count}} دقيقة",
  "works.fields.isbn": "الرقم الدولي المعياري للكتاب",
  "works.fields.pages": "الصفحات",
  "works.pricing.free": "مجاني",
  "works.sections.synopsis": "الملخص",
  "works.stats.listensCount_zero": "لم يستمع أحد",
  "works.stats.listensCount_one": "استماع واحد",
  "works.stats.listensCount_two": "استماعان",
  "works.stats.listensCount_few": "{{count}} استماعات",
  "works.stats.listensCount_many": "{{count}} استماعاً",
  "works.stats.listensCount_other": "{{count}} استماع",
  "works.stats.readingTime": "وقت القراءة",
  "works.stats.readingTimeValue": "{{minutes}} دقيقة",
  "works.stats.reviewsCount_zero": "لا توجد تقييمات",
  "works.stats.reviewsCount_one": "تقييم واحد",
  "works.stats.reviewsCount_two": "تقييمان",
  "works.stats.reviewsCount_few": "{{count}} تقييمات",
  "works.stats.reviewsCount_many": "{{count}} تقييماً",
  "works.stats.reviewsCount_other": "{{count}} تقييم",
  "works.stats.views": "المشاهدات",
  "works.types.album": "ألبوم",
  "works.types.book": "كتاب",
  "works.types.film": "فيلم"
};

// D'abord, vérifions les doublons
console.log('🔍 Vérification des clés en double...\n');

const file = path.join('i18n/locales/ar/translation.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));

// Rechercher toutes les occurrences de clés non traduites
let allUntranslated = [];
function findAllUntranslated(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'string' && (obj[key].includes('{{') || obj[key].includes('⵿⵿'))) {
      allUntranslated.push(fullKey);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      findAllUntranslated(obj[key], fullKey);
    }
  }
}
findAllUntranslated(content);

console.log(`Trouvé ${allUntranslated.length} clés non traduites\n`);

// Appliquer les traductions
let applied = 0;
let notFound = [];

function applyTranslations(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'string') {
      if ((obj[key].includes('{{') || obj[key].includes('⵿⵿'))) {
        if (translations[fullKey]) {
          obj[key] = translations[fullKey];
          console.log(`✅ ${fullKey}`);
          applied++;
        } else {
          notFound.push(fullKey);
        }
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

// Afficher les clés non trouvées dans notre dictionnaire
if (notFound.length > 0) {
  console.log(`\n⚠️  ${notFound.length} clés non traduites dans notre dictionnaire:`);
  notFound.slice(0, 20).forEach(key => console.log(`  - ${key}`));
  if (notFound.length > 20) {
    console.log(`  ... et ${notFound.length - 20} autres`);
  }
}

// Statistiques finales
console.log('\n📊 Statistiques finales:');
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
console.log(`✅ Traduites: ${stats.translated} (${Math.round(stats.translated/stats.total*100)}%)`);
console.log(`⚠️  Non traduites: ${stats.untranslated} (${Math.round(stats.untranslated/stats.total*100)}%)`);