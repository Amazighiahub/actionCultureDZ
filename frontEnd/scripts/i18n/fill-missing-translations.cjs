/**
 * Script to fill missing translation keys across all 5 languages
 * Reference: FR (2088 keys) -> fills AR, EN, TZ-LTN, TZ-TFNG
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../i18n/locales');

// Deep set a value in an object by dot-separated key path
function deepSet(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ============================================================
// ARABIC TRANSLATIONS (112 missing keys)
// ============================================================
const arTranslations = {
  "auth.login.tabTitle": "تسجيل الدخول",
  "auth.login.emailPlaceholder": "votre.email@exemple.com",
  "auth.login.rememberMe": "تذكرني",
  "auth.login.forgotPassword": "نسيت كلمة المرور؟",
  "auth.login.loggingIn": "جاري تسجيل الدخول...",
  "auth.register.professionalNote.title": "ملاحظة مهمة:",
  "auth.register.professionalNote.description": "الحسابات المهنية تخضع للتحقق من طرف فريقنا خلال 24-48 ساعة.",
  "auth.register.acceptTerms.prefix": "أوافق على",
  "auth.register.acceptTerms.terms": "شروط الاستخدام",
  "auth.register.acceptTerms.and": "و",
  "auth.register.acceptTerms.privacy": "سياسة الخصوصية",
  "auth.errors.confirmPasswordRequired": "يرجى تأكيد كلمة المرور",
  "auth.forgotPassword.title": "نسيت كلمة المرور",
  "auth.forgotPassword.description": "أدخل عنوان بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.",
  "auth.forgotPassword.emailLabel": "البريد الإلكتروني",
  "auth.forgotPassword.emailPlaceholder": "votre.email@exemple.com",
  "auth.forgotPassword.submit": "إرسال الرابط",
  "auth.forgotPassword.sending": "جاري الإرسال...",
  "auth.forgotPassword.backToLogin": "العودة لتسجيل الدخول",
  "auth.forgotPassword.successTitle": "تم إرسال البريد",
  "auth.forgotPassword.successDescription": "إذا كان هذا العنوان موجوداً في نظامنا، ستتلقى بريداً إلكترونياً.",
  "auth.forgotPassword.emailSentTitle": "تم إرسال البريد!",
  "auth.forgotPassword.emailSentDescription": "إذا كان هذا البريد مرتبطاً بحساب، ستتلقى رابط إعادة التعيين خلال دقائق.",
  "auth.forgotPassword.checkSpam": "تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تتلقَ البريد.",
  "auth.forgotPassword.didntReceive": "لم تتلقَ البريد؟",
  "auth.forgotPassword.tryAgain": "إعادة المحاولة",
  "auth.resetPassword.title": "كلمة مرور جديدة",
  "auth.resetPassword.description": "اختر كلمة مرور آمنة جديدة لحسابك.",
  "auth.resetPassword.newPassword": "كلمة المرور الجديدة",
  "auth.resetPassword.confirmPassword": "تأكيد كلمة المرور",
  "auth.resetPassword.passwordHint": "8 أحرف كحد أدنى مع حرف كبير وحرف صغير ورقم.",
  "auth.resetPassword.passwordRequirements": "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم على الأقل",
  "auth.resetPassword.submit": "إعادة تعيين كلمة المرور",
  "auth.resetPassword.resetting": "جاري إعادة التعيين...",
  "auth.resetPassword.backToLogin": "العودة لتسجيل الدخول",
  "auth.resetPassword.successTitle": "تم تغيير كلمة المرور",
  "auth.resetPassword.successDescription": "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.",
  "auth.resetPassword.redirecting": "سيتم توجيهك إلى صفحة تسجيل الدخول...",
  "auth.resetPassword.goToLogin": "الذهاب لتسجيل الدخول",
  "auth.resetPassword.error": "خطأ أثناء إعادة تعيين كلمة المرور",
  "auth.resetPassword.invalidToken": "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.",
  "auth.resetPassword.invalidTokenTitle": "رابط غير صالح",
  "auth.resetPassword.invalidTokenDescription": "رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.",
  "auth.resetPassword.requestNewLink": "طلب رابط جديد",
  "categories.workTypes.articles": "مقالات",
  "categories.workTypes.cinema": "سينما",
  "categories.workTypes.literature": "أدب",
  "categories.workTypes.musicalAlbum": "ألبوم موسيقي",
  "categories.workTypes.scientificArticle": "مقال علمي",
  "categories.workTypes.art": "فن",
  "categories.workTypes.artwork": "عمل فني",
  "categories.workTypes.artworks": "أعمال فنية",
  "categories.workTypes.music": "موسيقى",
  "categories.workTypes.musicalAlbums": "ألبومات موسيقية",
  "categories.workTypes.scientificArticles": "مقالات علمية",
  "common.reset": "إعادة تعيين",
  "common.results": "نتائج",
  "common.allStatuses": "جميع الحالات",
  "common.allRoles": "جميع الأدوار",
  "common.notes": "ملاحظات",
  "common.works": "أعمال",
  "common.moreOptions": "خيارات أخرى",
  "common.clearSearch": "مسح البحث",
  "common.type": "النوع",
  "common.more": "أخرى",
  "events.create.eventFormat": "شكل الحدث",
  "events.create.inPerson": "حضوري",
  "events.create.inPersonDesc": "حدث فعلي مع مكان ومنظمة",
  "events.create.virtual": "افتراضي / عبر الإنترنت",
  "events.create.virtualDesc": "ندوة عبر الإنترنت، بث مباشر، مؤتمر إلكتروني",
  "events.create.organisation": "المنظمة",
  "events.create.selectOrganisation": "اختر منظمتك",
  "events.create.selectOrganisationPlaceholder": "اختيار منظمة",
  "sections.heritage.search": "البحث عن موقع...",
  "sections.heritage.tryDifferentSearch": "جرب بحثاً آخر أو أعد تعيين المرشحات",
  "dashboardpro.ajouter": "إضافة",
  "dashboardpro.artisanat": "حرف يدوية",
  "dashboardpro.nouveau_patrimoine": "تراث جديد",
  "dashboardpro.mes_artisanats": "حرفي اليدوية",
  "dashboardpro.nouvel_artisanat": "حرفة يدوية جديدة",
  "dashboardpro.aucun_artisanat": "لا توجد حرف يدوية",
  "dashboardpro.creer_premier_artisanat": "إنشاء أول حرفة يدوية",
  "dashboardpro.non_defini": "غير محدد",
  "dashboardpro.en_stock": "متوفر",
  "dashboardpro.sur_commande": "حسب الطلب",
  "dashboardpro.indisponible": "غير متاح",
  "dashboardpro.manage": "إدارة",
  "dashboardpro.manage_event": "إدارة البرامج والأعمال",
  "common_cartepatrimoine.circuit_algerois": "مسار جزائري",
  "common_cartepatrimoine.route_romaine": "الطريق الروماني",
  "common_cartepatrimoine.patrimoine_unesco": "تراث اليونسكو",
  "common_cartepatrimoine.facile": "سهل",
  "common_cartepatrimoine.modere": "معتدل",
  "common_cartepatrimoine.aventurier": "مغامر",
  "admin.services.searchPlaceholder": "البحث عن خدمة...",
  "admin.services.noServices": "لا توجد خدمات",
  "admin.services.types.tourGuide": "مرشد سياحي",
  "admin.services.types.transport": "نقل",
  "admin.services.types.accommodation": "إقامة",
  "admin.services.types.workshop": "ورشة",
  "admin.patrimoine.filters.all": "الكل",
  "pro.participants.viewProfile": "عرض الملف",
  "pro.participants.registeredOn": "مسجل في",
  "pro.participants.worksSubmitted": "عمل (أعمال) مقدمة",
  "pro.participants.eventRegistration": "التسجيل في هذا الحدث",
  "pro.participants.submittedWorks": "الأعمال المقدمة لهذا الحدث",
  "pro.participants.portfolio": "معرض الأعمال",
  "pro.participants.participationHistory": "سجل المشاركات",
  "pro.participants.loadError": "تعذر تحميل الملف الشخصي",
  "patrimoine.filters.all": "الكل",
  "patrimoine.filters.allTypes": "جميع الأنواع",
  "patrimoine.filters.allWilayas": "جميع الولايات"
};

// ============================================================
// ENGLISH TRANSLATIONS (80 missing keys)
// ============================================================
const enTranslations = {
  "auth.login.tabTitle": "Login",
  "auth.login.emailPlaceholder": "your.email@example.com",
  "auth.login.rememberMe": "Remember me",
  "auth.login.forgotPassword": "Forgot password?",
  "auth.login.loggingIn": "Logging in...",
  "auth.register.professionalNote.title": "Important note:",
  "auth.register.professionalNote.description": "Professional accounts are subject to validation by our team within 24-48 hours.",
  "auth.register.acceptTerms.prefix": "I accept the",
  "auth.register.acceptTerms.terms": "terms of use",
  "auth.register.acceptTerms.and": "and the",
  "auth.register.acceptTerms.privacy": "privacy policy",
  "categories.workTypes.articles": "Articles",
  "categories.workTypes.cinema": "Cinema",
  "categories.workTypes.literature": "Literature",
  "categories.workTypes.musicalAlbum": "Musical Album",
  "categories.workTypes.scientificArticle": "Scientific Article",
  "categories.workTypes.art": "Art",
  "categories.workTypes.artwork": "Artwork",
  "categories.workTypes.artworks": "Artworks",
  "categories.workTypes.music": "Music",
  "categories.workTypes.musicalAlbums": "Musical Albums",
  "categories.workTypes.scientificArticles": "Scientific Articles",
  "common.reset": "Reset",
  "common.results": "results",
  "common.allStatuses": "All statuses",
  "common.allRoles": "All roles",
  "common.notes": "Notes",
  "common.works": "works",
  "common.moreOptions": "More options",
  "common.clearSearch": "Clear search",
  "common.type": "Type",
  "common.more": "more",
  "events.create.eventFormat": "Event format",
  "events.create.inPerson": "In person",
  "events.create.inPersonDesc": "Physical event with a venue and organization",
  "events.create.virtual": "Virtual / Online",
  "events.create.virtualDesc": "Webinar, streaming, online conference",
  "events.create.organisation": "Organization",
  "events.create.selectOrganisation": "Select your organization",
  "events.create.selectOrganisationPlaceholder": "Choose an organization",
  "events.create.location": "Location",
  "sections.heritage.search": "Search for a site...",
  "sections.heritage.tryDifferentSearch": "Try a different search or reset filters",
  "dashboardpro.ajouter": "Add",
  "dashboardpro.artisanat": "Crafts",
  "dashboardpro.nouveau_patrimoine": "New heritage",
  "dashboardpro.mes_artisanats": "My crafts",
  "dashboardpro.nouvel_artisanat": "New craft",
  "dashboardpro.aucun_artisanat": "No crafts created",
  "dashboardpro.creer_premier_artisanat": "Create my first craft",
  "dashboardpro.non_defini": "Not defined",
  "dashboardpro.en_stock": "in stock",
  "dashboardpro.sur_commande": "Made to order",
  "dashboardpro.indisponible": "Unavailable",
  "dashboardpro.manage": "Manage",
  "dashboardpro.manage_event": "Manage programs and works",
  "common_cartepatrimoine.circuit_algerois": "Algiers Circuit",
  "common_cartepatrimoine.route_romaine": "Roman Route",
  "common_cartepatrimoine.patrimoine_unesco": "UNESCO Heritage",
  "common_cartepatrimoine.facile": "Easy",
  "common_cartepatrimoine.modere": "Moderate",
  "common_cartepatrimoine.aventurier": "Adventurous",
  "admin.services.searchPlaceholder": "Search for a service...",
  "admin.services.noServices": "No services",
  "admin.services.types.tourGuide": "Tour guide",
  "admin.services.types.transport": "Transport",
  "admin.services.types.accommodation": "Accommodation",
  "admin.services.types.workshop": "Workshop",
  "admin.patrimoine.filters.all": "All",
  "pro.participants.viewProfile": "View profile",
  "pro.participants.registeredOn": "Registered on",
  "pro.participants.worksSubmitted": "work(s) submitted",
  "pro.participants.eventRegistration": "Event registration",
  "pro.participants.submittedWorks": "Works submitted for this event",
  "pro.participants.portfolio": "Portfolio",
  "pro.participants.participationHistory": "Participation history",
  "pro.participants.loadError": "Unable to load profile",
  "patrimoine.filters.all": "All",
  "patrimoine.filters.allTypes": "All types",
  "patrimoine.filters.allWilayas": "All wilayas"
};

// ============================================================
// TAMAZIGHT LATIN TRANSLATIONS (275 missing keys)
// ============================================================
const tzLtnTranslations = {
  "auth.login.tabTitle": "Anekcum",
  "auth.login.emailPlaceholder": "imayl-ik@amedya.com",
  "auth.login.rememberMe": "Cfu fell-i",
  "auth.login.forgotPassword": "Tettuḍ awal n uɛeddi?",
  "auth.login.loggingIn": "Anekcum iteddu...",
  "auth.register.professionalNote.title": "Tamawt tamuqrant:",
  "auth.register.professionalNote.description": "Imiḍanen imahilen ad ten-isenqed uγref-nneγ deg 24-48 n yisragen.",
  "auth.register.acceptTerms.prefix": "Qebleγ",
  "auth.register.acceptTerms.terms": "tiwtilin n useqdec",
  "auth.register.acceptTerms.and": "d",
  "auth.register.acceptTerms.privacy": "tasertit n tbaḍnit",
  "auth.errors.userNotFound": "Ulac amiḍan s yimayl-agi",
  "auth.errors.wrongPassword": "Awal n uɛeddi d arameγtu",
  "auth.errors.accountNotVerified": "Senqed imayl-ik uqbel ad tkecmeḍ",
  "auth.errors.accountDisabled": "Amiḍan-ik yettwakkes. Nermes anedbal.",
  "auth.errors.accountPending": "Amiḍan-ik amahil yettraju asenqed",
  "auth.errors.accountSuspended": "Amiḍan-ik yettwaseḥbes. Nermes anedbal.",
  "auth.errors.accountBanned": "Amiḍan-ik yettwagdel",
  "auth.errors.tooManyAttempts": "Aṭas n tegratin n unekcum. Ɛreḍ tikkelt-nniḍen.",
  "auth.errors.confirmPasswordRequired": "Sentem awal n uɛeddi",
  "auth.errors.emailExistsDescription": "Yella yakan umiḍan s tansa-agi. Kcm neɣ seqdec tansa-nniḍen.",
  "auth.errors.emailNotVerified": "Imayl ur yettwasneqd ara",
  "auth.errors.pleaseVerifyEmail": "Senqed imayl-ik uqbel ad tkecmeḍ. Wali taboḍt-ik n yiznan.",
  "auth.errors.contactSupport": "Amiḍan-ik yettwaseḥbes. Nermes tallalt i wugar n telγut.",
  "auth.errors.passwordError": "Awal n uɛeddi ur iḥerrez ara ilugan n tɣellist (adasil 8 n yisekkilen)",
  "auth.forgotPassword.title": "Tettuḍ awal n uɛeddi",
  "auth.forgotPassword.description": "Sekcem tansa n yimayl-ik, ad ak-d-nazen aseγwen i uɛawed n usbeddi.",
  "auth.forgotPassword.emailLabel": "Tansa imayl",
  "auth.forgotPassword.emailPlaceholder": "imayl-ik@amedya.com",
  "auth.forgotPassword.submit": "Azen aseγwen",
  "auth.forgotPassword.sending": "Tuzna iteddu...",
  "auth.forgotPassword.backToLogin": "Uγal γer unekcum",
  "auth.forgotPassword.successTitle": "Imayl yettwazen",
  "auth.forgotPassword.successDescription": "Ma yella tansa-agi tella deg unagraw-nneγ, ad tremseḍ imayl.",
  "auth.forgotPassword.emailSentTitle": "Imayl yettwazen!",
  "auth.forgotPassword.emailSentDescription": "Ma yella imayl-agi yeqqen γer umiḍan, ad d-tremseḍ aseγwen n uɛawed deg kra n tesdatin.",
  "auth.forgotPassword.checkSpam": "Wali deg umeskar n yiznan inuḍafen ma ur d-yewwiḍ ara yimayl.",
  "auth.forgotPassword.didntReceive": "Ur d-yewwiḍ ara yimayl?",
  "auth.forgotPassword.tryAgain": "Ɛreḍ tikkelt-nniḍen",
  "auth.resetPassword.title": "Awal n uɛeddi amaynut",
  "auth.resetPassword.description": "Fren awal n uɛeddi amaynut yettwaḥerzen i umiḍan-ik.",
  "auth.resetPassword.newPassword": "Awal n uɛeddi amaynut",
  "auth.resetPassword.confirmPassword": "Sentem awal n uɛeddi",
  "auth.resetPassword.passwordHint": "Adasil 8 n yisekkilen akked usekkil ameqqran, ameẓyan, d uṭṭun.",
  "auth.resetPassword.passwordRequirements": "Awal n uɛeddi ilaq ad yesɛu usekkil ameqqran, ameẓyan, d uṭṭun",
  "auth.resetPassword.submit": "Ales asbeddi n wawal n uɛeddi",
  "auth.resetPassword.resetting": "Ales asbeddi iteddu...",
  "auth.resetPassword.backToLogin": "Uγal γer unekcum",
  "auth.resetPassword.successTitle": "Awal n uɛeddi yettwabeddel",
  "auth.resetPassword.successDescription": "Awal n uɛeddi yettwabeddel akken iwata. Tzemreḍ ad tkecmeḍ tura.",
  "auth.resetPassword.redirecting": "Ad ak-nawi γer usebter n unekcum...",
  "auth.resetPassword.goToLogin": "Ddu γer unekcum",
  "auth.resetPassword.error": "Tuccḍa deg uɛawed n usbeddi n wawal n uɛeddi",
  "auth.resetPassword.invalidToken": "Aseγwen n uɛawed n usbeddi d arameγtu neγ yemmet.",
  "auth.resetPassword.invalidTokenTitle": "Aseγwen arameγtu",
  "auth.resetPassword.invalidTokenDescription": "Aseγwen-agi n uɛawed n usbeddi d arameγtu neγ yemmet. Suter aseγwen amaynut.",
  "auth.resetPassword.requestNewLink": "Suter aseγwen amaynut",
  "categories.workTypes.articles": "Imagraden",
  "categories.workTypes.cinema": "Sinima",
  "categories.workTypes.literature": "Tasekla",
  "categories.workTypes.musicalAlbum": "Album aẓawan",
  "categories.workTypes.scientificArticle": "Amagrad usnan",
  "categories.workTypes.art": "Taẓuri",
  "categories.workTypes.artwork": "Axeddim n tẓuri",
  "categories.workTypes.artworks": "Ixeddimen n tẓuri",
  "categories.workTypes.music": "Aẓawan",
  "categories.workTypes.musicalAlbums": "Albumen iẓawanen",
  "categories.workTypes.scientificArticles": "Imagraden usnanen",
  "common.reset": "Ales asbeddi",
  "common.results": "igmaḍ",
  "common.allStatuses": "Akk addaden",
  "common.allRoles": "Akk tisurag",
  "common.notes": "Tizmilin",
  "common.works": "ixeddimen",
  "common.moreOptions": "Ugar n textiṛiyin",
  "common.clearSearch": "Sfeḍ anadi",
  "common.type": "Anaw",
  "common.more": "wiyaḍ",
  "events.create.eventFormat": "Tamṣukt n tedyant",
  "events.create.inPerson": "S udem",
  "events.create.inPersonDesc": "Tadyant tamaddayt akked adeg d tnudbelt",
  "events.create.virtual": "Anmaway / Srid",
  "events.create.virtualDesc": "Asegzawal srid, asizwer, anemgal srid",
  "events.create.organisation": "Tanudba",
  "events.create.selectOrganisation": "Fren tanudba-ik",
  "events.create.selectOrganisationPlaceholder": "Fren tanudba",
  "events.create.location": "Adeg",
  "events.participants": "imttekkiyen",
  "events.full": "Yeččur",
  "events.free": "Baṭel",
  "home.hero.badge": "Issin ayla adelsan azzayri",
  "home.hero.subtitle": "Snirem, ḥrez, bḍu ayla adelsan n Lezzayer",
  "home.hero.explore": "Snirem ayla",
  "home.hero.contribute": "Ttekki",
  "sections.heritage.search": "Nadi γef usit...",
  "sections.heritage.tryDifferentSearch": "Ɛreḍ anadi-nniḍen neγ ales asbeddi n yimzizdigen",
  "dashboardpro.ajouter": "Rnu",
  "dashboardpro.artisanat": "Taẓuri tafessast",
  "dashboardpro.nouveau_patrimoine": "Ayla amaynut",
  "dashboardpro.mes_artisanats": "Tizeγ-inu tifesnasin",
  "dashboardpro.nouvel_artisanat": "Taẓuri tafessast tamaynut",
  "dashboardpro.aucun_artisanat": "Ulac taẓuri tafessast",
  "dashboardpro.creer_premier_artisanat": "Snulfu taẓuri-inu tamezwarut",
  "dashboardpro.non_defini": "Ur yettwabder ara",
  "dashboardpro.en_stock": "yella",
  "dashboardpro.sur_commande": "S uḍalab",
  "dashboardpro.indisponible": "Ulac-it",
  "dashboardpro.manage": "Sefrek",
  "dashboardpro.manage_event": "Sefrek ahilen d yixeddimen",
  "common_cartepatrimoine.circuit_algerois": "Tawwurt tazzayrit",
  "common_cartepatrimoine.route_romaine": "Abrid arumi",
  "common_cartepatrimoine.patrimoine_unesco": "Ayla n UNESCO",
  "common_cartepatrimoine.facile": "Fessus",
  "common_cartepatrimoine.modere": "Alemmas",
  "common_cartepatrimoine.aventurier": "Aɛessas",
  "admin.services.searchPlaceholder": "Nadi γef umeẓlu...",
  "admin.services.noServices": "Ulac imeẓla",
  "admin.services.types.tourGuide": "Amsnizwer",
  "admin.services.types.transport": "Assiweḍ",
  "admin.services.types.accommodation": "Ansayen",
  "admin.services.types.workshop": "Tanezduγt n umahil",
  "admin.patrimoine.filters.all": "Akk",
  "event.registration.submitWorks": "Ixeddimen i usumer",
  "event.registration.worksRequired": "Fren ixeddimen i tebγiḍ ad d-tessekneḍ (ilaq)",
  "event.registration.worksOptional": "Fren ixeddimen i tebγiḍ ad d-tessekneḍ (d afran)",
  "event.registration.maxWorks": "Afellay: {{max}} n yixeddimen",
  "event.registration.acceptedTypes": "Anwan iqublen:",
  "event.registration.noWorks": "Ur tesɛiḍ ara ixeddimen i yemsasen d wanaw-agi n tedyant",
  "event.registration.createWork": "Snulfu axeddim",
  "event.registration.selectedWorks": "Ixeddimen ifranin:",
  "event.registration.worksSubmitted": "Ixeddimen yettwasumren",
  "event.registration.oeuvresRequired": "Fren xarsum yiwen n uxeddim i usumer",
  "event.registration.professionalOnly": "Asumer n yixeddimen i yimahilen kan",
  "event.registration.upgradeToPro": "Ɛeddi γer umiḍan amahil i usumer n yixeddimen-ik",
  "event.registration.becomePro": "Ili d amahil",
  "event.registration.interestedVisitor": "Yesseḥbiberek-d tedyant-agi?",
  "event.registration.connectToParticipate": "Kcm i ujerred neγ rnu γer yismenyifen",
  "event.registration.addToFavorites": "Rnu γer yismenyifen",
  "event.registration.removeFromFavorites": "Kkes seg yismenyifen",
  "event.roles.organisateur_principal": "Amasay agejdan",
  "event.roles.co_organisateur": "Amtekki deg unudeb",
  "event.roles.organisateur": "Amasay",
  "event.roles.partenaire": "Amcerik",
  "event.roles.sponsor": "Amaẓlay",
  "event.roles.intervenant": "Ameskan",
  "event.roles.moderateur": "Anemhal",
  "event.roles.animateur": "Amesḍukel",
  "event.roles.benevole": "Aɛawni",
  "event.roles.staff": "Agraw",
  "ajouterService.title": "Rnu ameẓlu n tẓuri tafessast",
  "ajouterService.subtitle": "Sumer tisnulfuyin-ik tifesnasin",
  "ajouterService.basicInfo": "Tilγa tigejdanin",
  "ajouterService.basicInfoDesc": "Glem aferdis-ik neγ ameẓlu-ik afesnas",
  "ajouterService.nom": "Isem n uferdis/umeẓlu",
  "ajouterService.nomPlaceholder": "Am: Tafexart taqbaylit tamensayt",
  "ajouterService.description": "Aglam",
  "ajouterService.descriptionPlaceholder": "Glem asnulfu-ik, amezruy-is, ineẓrufen-is...",
  "ajouterService.materiau": "Amawal",
  "ajouterService.selectMateriau": "Fren amawal",
  "ajouterService.technique": "Tatiknikt",
  "ajouterService.selectTechnique": "Fren tatiknikt",
  "ajouterService.pricingTitle": "Ssuma d tɣara",
  "ajouterService.prixMin": "Ssuma tadasilt (DZD)",
  "ajouterService.prixMax": "Ssuma tafellayt (DZD)",
  "ajouterService.delaiFabrication": "Amur n usnulfu (ussan)",
  "ajouterService.delaiFabricationPlaceholder": "Am: 7",
  "ajouterService.enStock": "Amḍan yella",
  "ajouterService.surCommande": "S uḍalab",
  "ajouterService.tagsTitle": "Awalen n tnila",
  "ajouterService.tagPlaceholder": "Rnu awal n tnila...",
  "ajouterService.mediasTitle": "Tiwlafin",
  "ajouterService.mediasDesc": "Rnu tiwlafin n usnulfu-ik",
  "ajouterService.mediasUploadText": "Sit neγ zuγer tiwlafin-ik da",
  "ajouterService.submit": "Suffeγ ameẓlu",
  "ajouterService.submitting": "Asuffeγ iteddu...",
  "ajouterService.success": "Ameẓlu-ik yettwarna akken iwata!",
  "ajouterService.errors.nomRequired": "Isem ilaq",
  "ajouterService.errors.materiauRequired": "Fren amawal",
  "ajouterService.errors.techniqueRequired": "Fren tatiknikt",
  "ajouterService.errors.createFailed": "Tuccḍa deg usnulfu n umeẓlu",
  "ajouterPatrimoine.title": "Rnu asit n wayla",
  "ajouterPatrimoine.subtitle": "Ttekki deg usileγ n wayla azzayri",
  "ajouterPatrimoine.basicInfo": "Tilγa tigejdanin",
  "ajouterPatrimoine.basicInfoDesc": "Glem asit n wayla",
  "ajouterPatrimoine.nom": "Isem n usit",
  "ajouterPatrimoine.nomPlaceholder": "Am: Lqesba n Lezzayer",
  "ajouterPatrimoine.description": "Aglam",
  "ajouterPatrimoine.descriptionPlaceholder": "Glem amezruy d yineẓrufen n usit...",
  "ajouterPatrimoine.type": "Anaw n wayla",
  "ajouterPatrimoine.selectType": "Fren anaw",
  "ajouterPatrimoine.epoque": "Taqbuṛt tamezruyt",
  "ajouterPatrimoine.selectEpoque": "Fren taqbuṛt",
  "ajouterPatrimoine.locationTitle": "Adeg",
  "ajouterPatrimoine.wilaya": "Tamnaḍt",
  "ajouterPatrimoine.selectWilaya": "Fren tamnaḍt",
  "ajouterPatrimoine.adresse": "Tansa",
  "ajouterPatrimoine.adressePlaceholder": "Tansa tummidt n usit",
  "ajouterPatrimoine.latitude": "Taγzi",
  "ajouterPatrimoine.longitude": "Tehri",
  "ajouterPatrimoine.statusTitle": "Addad d usemsel",
  "ajouterPatrimoine.statut": "Addad amiran",
  "ajouterPatrimoine.classement": "Asemsel n wayla",
  "ajouterPatrimoine.selectClassement": "Fren asemsel",
  "ajouterPatrimoine.dateClassement": "Azemz n usemsel",
  "ajouterPatrimoine.visiteVirtuelle": "URL n trezzift tanmawawt (d afran)",
  "ajouterPatrimoine.mediasTitle": "Tiwlafin",
  "ajouterPatrimoine.mediasDesc": "Rnu tiwlafin n usit",
  "ajouterPatrimoine.mediasUploadText": "Sit neγ zuγer tiwlafin-ik da",
  "ajouterPatrimoine.submit": "Suffeγ asit",
  "ajouterPatrimoine.submitting": "Asuffeγ iteddu...",
  "ajouterPatrimoine.success": "Asit n wayla yettwarna akken iwata!",
  "ajouterPatrimoine.errors.nomRequired": "Isem ilaq",
  "ajouterPatrimoine.errors.typeRequired": "Fren anaw",
  "ajouterPatrimoine.errors.wilayaRequired": "Fren tamnaḍt",
  "ajouterPatrimoine.errors.createFailed": "Tuccḍa deg usnulfu n usit",
  "pro.participants.viewProfile": "Wali amaγnu",
  "pro.participants.registeredOn": "Yettwajerred deg",
  "pro.participants.worksSubmitted": "axeddim yettwasumer",
  "pro.participants.eventRegistration": "Ajerred γer tedyant-agi",
  "pro.participants.submittedWorks": "Ixeddimen yettwasumren i tedyant-agi",
  "pro.participants.portfolio": "Aγbalu n yixeddimen",
  "pro.participants.participationHistory": "Amezruy n yittekkiyen",
  "pro.participants.loadError": "D awezγi asali n umaγnu",
  "programmePages.actions.backToEvents": "Uγal γer tedyanin",
  "programmePages.actions.backToEvent": "Uγal γer tedyant",
  "programmePages.actions.edit": "Ẓreg",
  "programmePages.actions.delete": "Kkes",
  "programmePages.status.loadingProgram": "Asali n wahil...",
  "programmePages.errors.prefix": "Tuccḍa",
  "programmePages.errors.generic": "Tella-d tuccḍa",
  "programmePages.errors.eventIdMissing": "ID n tedyant ur yettwabder ara",
  "programmePages.errors.programmeIdMissing": "ID n wahil ur yettwabder ara",
  "programmePages.errors.eventOrProgrammeIdMissing": "ID n tedyant neγ n wahil ur yettwabder ara",
  "programmePages.errors.eventIdMissingWithPrefix": "Tuccḍa: ID n tedyant ur yettwabder ara",
  "programmePages.errors.eventOrProgrammeIdMissingWithPrefix": "Tuccḍa: ID n tedyant neγ n wahil ur yettwabder ara",
  "programmePages.errors.loadFailed": "Tuccḍa deg usali n wahil",
  "programmePages.errors.createFailed": "Tuccḍa deg usnulfu n wahil",
  "programmePages.errors.updateFailed": "Tuccḍa deg uleqqem n wahil",
  "programmePages.errors.deleteFailed": "Tuccḍa deg tukksa n wahil",
  "programmePages.meta.eventNumber": "Tadyant #{{id}}",
  "programmePages.meta.programNumber": "Ahil #{{id}}",
  "programmePages.meta.multiDay": "Ddeqs n wussan",
  "programmePages.meta.multipleSpeakers": "Ddeqs n yimeskanen",
  "programmePages.meta.flexibleLocations": "Idegen ifessasen",
  "programmePages.meta.speakersCount": "{{count}} n yimeskanen",
  "programmePages.meta.locationNotSpecified": "Adeg ur yettwabder ara",
  "programmePages.create.title": "Snulfu ahil",
  "programmePages.create.newProgram": "Ahil amaynut",
  "programmePages.edit.title": "Ẓreg ahil",
  "programmePages.edit.editProgram": "Ẓreg ahil",
  "programmePages.view.title": "Talγut γef wahil",
  "programmePages.view.consultation": "Assenqed n wahil",
  "programmePages.view.confirmDelete": "D tidet tebγiḍ ad tekkseḍ ahil-agi?",
  "programmePages.view.quickActions.editProgram": "Ẓreg ahil-agi",
  "programmePages.view.quickActions.addAnotherProgram": "Rnu ahil-nniḍen",
  "programmePages.info.multiDayTitle": "Asefrek n ddeqs n wussan",
  "programmePages.info.speakersTitle": "Imeskanen",
  "programmePages.info.flexibleLocationsTitle": "Idegen ifessasen",
  "programmePages.info.locationAndOptionsTitle": "Adeg d textiṛiyin",
  "programmePages.info.createMultiDayDesc": "Snulfu ihilen i yal ass n tedyant-ik. Anagraw yesgrew armud s wass.",
  "programmePages.info.createSpeakersDesc": "Rnu ddeqs n yimeskanen s yisurag yemsebḍan. Yal ameskan yezmer ad yesɛu iɣewwaren-is.",
  "programmePages.info.createLocationsDesc": "Seqdec idegen iḥerrzen neγ bder adeg uslig i yal armud n wahil.",
  "programmePages.info.editMultiDayDesc": "Ẓreg ihilen i yal ass n tedyant-ik. Anagraw yesgrew armud s wass.",
  "programmePages.info.editSpeakersDesc": "Ẓreg imeskanen s yisurag-nsen. Yal ameskan yezmer ad yesɛu iɣewwaren-is.",
  "programmePages.info.editLocationsDesc": "Beddel idegen iḥerrzen neγ bder adeg uslig i yal armud n wahil.",
  "programmePages.info.viewMultiDayDesc": "Ahil-agi d aḥric n tedyant γef ddeqs n wussan. Anagraw yesgrew armud s wass.",
  "programmePages.info.viewSpeakersDesc": "{{count}} n yimeskanen ttekkin deg urmud-agi. Yal ameskan yesɛa asureg-is.",
  "programmePages.info.viewLocationOptionsDesc": "Armud deg udeg uslig s textiṛiyin n yimttekkiyen d tnudbelt.",
  "shared.errorBoundary.title": "Tella-d tuccḍa",
  "shared.errorBoundary.unexpected": "Tuccḍa ur netturaǧu ara",
  "shared.errorBoundary.retry": "Ɛreḍ tikkelt-nniḍen",
  "shared.lazyImage.unavailable": "Tugna ulac-itt",
  "patrimoine.filters.all": "Akk",
  "patrimoine.filters.allTypes": "Akk anwan",
  "patrimoine.filters.allWilayas": "Akk timnaḍin"
};

// ============================================================
// TAMAZIGHT TIFINAGH TRANSLATIONS (355 missing keys)
// We need to read the tz-tfng missing_keys.json to get all keys
// ============================================================

// For tz-tfng we'll generate from the tz-ltn translations + additional keys
// The main mapping: Latin -> Tifinagh character conversion
const latinToTifinagh = {
  'a': 'ⴰ', 'b': 'ⴱ', 'c': 'ⵛ', 'd': 'ⴷ', 'e': 'ⴻ', 'f': 'ⴼ',
  'g': 'ⴳ', 'h': 'ⵀ', 'i': 'ⵉ', 'j': 'ⵊ', 'k': 'ⴽ', 'l': 'ⵍ',
  'm': 'ⵎ', 'n': 'ⵏ', 'o': 'ⵓ', 'p': 'ⵒ', 'q': 'ⵇ', 'r': 'ⵔ',
  's': 'ⵙ', 't': 'ⵜ', 'u': 'ⵓ', 'v': 'ⵯ', 'w': 'ⵡ', 'x': 'ⵅ',
  'y': 'ⵢ', 'z': 'ⵣ',
  'ɛ': 'ⵄ', 'ɣ': 'ⵖ', 'γ': 'ⵖ', 'ḍ': 'ⴹ', 'ḥ': 'ⵃ', 'ṛ': 'ⵕ',
  'ṣ': 'ⵚ', 'ṭ': 'ⵟ', 'ẓ': 'ⵥ', 'č': 'ⵞ', 'ǧ': 'ⴵ',
  'ğ': 'ⴵ', 'ṃ': 'ⵎ', 'ṇ': 'ⵏ',
};

function latinToTfng(text) {
  if (!text) return text;
  let result = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const lower = ch.toLowerCase();
    // Keep numbers, punctuation, whitespace, {{...}} interpolation
    if (/[\d\s.,;:!?'"\-_()/@#$%^&*+=<>{}|\\[\]~`]/.test(ch) || ch === '{' || ch === '}') {
      result += ch;
    } else if (latinToTifinagh[lower]) {
      result += latinToTifinagh[lower];
    } else {
      result += ch; // Keep as-is (emoji, special chars, etc.)
    }
    i++;
  }
  return result;
}

// Read tz-tfng missing keys
const tzTfngMissing = JSON.parse(fs.readFileSync(path.join(BASE, 'tz-tfng/missing_keys.json'), 'utf8'));

// Build tz-tfng translations: use tz-ltn translations where available, else convert FR
// First, read the existing tz-ltn full file to get already-existing translations
const tzLtnFull = JSON.parse(fs.readFileSync(path.join(BASE, 'tz-ltn/translation.json'), 'utf8'));

function getVal(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

const tzTfngTranslations = {};
for (const item of tzTfngMissing) {
  const key = item.key;
  // Check if we have a tz-ltn translation (either from existing file or from our new translations)
  let tzLtnVal = getVal(tzLtnFull, key) || tzLtnTranslations[key];
  if (tzLtnVal && typeof tzLtnVal === 'string') {
    tzTfngTranslations[key] = latinToTfng(tzLtnVal);
  } else {
    // Use French value as base, convert to tifinagh
    tzTfngTranslations[key] = latinToTfng(item.fr || '');
  }
}

// ============================================================
// MERGE FUNCTION
// ============================================================
function mergeTranslations(langCode, translations) {
  const filePath = path.join(BASE, langCode, 'translation.json');
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let added = 0;
  for (const [key, value] of Object.entries(translations)) {
    // Only add if not already present
    const existingVal = getVal(existing, key);
    if (existingVal === undefined) {
      deepSet(existing, key, value);
      added++;
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`${langCode}: merged ${added} new keys (total attempted: ${Object.keys(translations).length})`);
}

// Execute merges
console.log('=== Merging missing translations ===\n');
mergeTranslations('ar', arTranslations);
mergeTranslations('en', enTranslations);
mergeTranslations('tz-ltn', tzLtnTranslations);
mergeTranslations('tz-tfng', tzTfngTranslations);

// Cleanup: remove missing_keys.json files
['ar', 'en', 'tz-ltn', 'tz-tfng'].forEach(l => {
  const f = path.join(BASE, l, 'missing_keys.json');
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

console.log('\n=== Done! Missing keys files cleaned up. ===');
