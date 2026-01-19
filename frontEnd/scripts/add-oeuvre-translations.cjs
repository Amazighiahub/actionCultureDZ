#!/usr/bin/env node
/**
 * Ajoute toutes les traductions OEUVRE dans les 5 langues
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

// Traductions OEUVRE en français (référence)
const oeuvreTranslationsFR = {
  "oeuvre": {
    "addToFavorites": "Ajouter aux favoris",
    "awards": "Récompenses",
    "backToList": "Retour à la liste",
    "browseAllOeuvres": "Parcourir toutes les œuvres",
    "categories": "Catégories",
    "character": "Personnage",
    "contributors": "Contributeurs",
    "description": "Description",
    "duration": "Durée",
    "externalLink": "Lien externe",
    "fields": {
      "additionalDetails": "Détails additionnels",
      "additionalDetailsPlaceholder": "Ajoutez des informations complémentaires...",
      "albumDuration": "Durée de l'album",
      "categories": "Catégories",
      "description": "Description",
      "descriptionHint": "Décrivez l'œuvre en détail",
      "descriptionPlaceholder": "Décrivez votre œuvre...",
      "dimensions": "Dimensions",
      "director": "Réalisateur",
      "doi": "DOI",
      "duration": "Durée",
      "genre": "Genre",
      "isbn": "ISBN",
      "issue": "Numéro",
      "journal": "Revue",
      "label": "Label",
      "language": "Langue",
      "material": "Matériau",
      "pages": "Pages",
      "peerReviewed": "Revu par les pairs",
      "price": "Prix",
      "priceHint": "Prix de vente (optionnel)",
      "publisher": "Éditeur",
      "region": "Région",
      "sourceUrl": "URL source",
      "summary": "Résumé",
      "summaryPlaceholder": "Résumé de l'œuvre...",
      "support": "Support",
      "synopsis": "Synopsis",
      "tags": "Tags",
      "tagsPlaceholder": "Ajoutez des tags séparés par des virgules",
      "technique": "Technique",
      "title": "Titre",
      "titlePlaceholder": "Titre de l'œuvre",
      "type": "Type",
      "volume": "Volume",
      "weight": "Poids",
      "year": "Année"
    },
    "genres": "Genres",
    "language": "Langue",
    "mainContributors": "Contributeurs principaux",
    "metadata": "Métadonnées",
    "moreOeuvres": "Plus d'œuvres",
    "noContributors": "Aucun contributeur",
    "noContributorsDesc": "Aucun contributeur associé à cette œuvre",
    "noDescription": "Aucune description disponible",
    "noEvents": "Aucun événement",
    "noEventsDesc": "Aucun événement associé à cette œuvre",
    "noRelatedOeuvres": "Aucune œuvre associée",
    "notFound": "Œuvre non trouvée",
    "origin": "Origine",
    "pastEvents": "Événements passés",
    "people": "Personnes",
    "publisher": "Éditeur",
    "publishers": "Éditeurs",
    "quickInfo": "Infos rapides",
    "relatedOeuvres": "Œuvres associées",
    "removeFromFavorites": "Retirer des favoris",
    "steps": {
      "categories": {
        "description": "Sélectionnez les catégories de votre œuvre",
        "noCategories": "Aucune catégorie sélectionnée",
        "selected": "sélectionnée(s)",
        "suggestions": "Suggestions",
        "title": "Catégories"
      },
      "details": {
        "description": "Informations spécifiques selon le type d'œuvre",
        "noType": "Aucun type sélectionné",
        "selectType": "Sélectionnez d'abord un type d'œuvre",
        "title": "Détails spécifiques"
      },
      "general": {
        "title": "Informations générales"
      },
      "media": {
        "added": "média(s) ajouté(s)",
        "choose": "Choisir des fichiers",
        "description": "Ajoutez des images ou vidéos de votre œuvre",
        "dropzone": "Glissez-déposez vos fichiers ici",
        "formats": "Formats acceptés: JPG, PNG, WebP, MP4",
        "principalInfo": "Image principale",
        "setPrincipal": "Définir comme principale",
        "title": "Médias"
      }
    },
    "summary": "Résumé",
    "tabs": {
      "author": "Auteur",
      "comments": "Commentaires",
      "gallery": "Galerie",
      "info": "Informations"
    },
    "tags": "Tags",
    "team": "Équipe",
    "titre": "Titre",
    "totalContributors": "contributeur(s)",
    "totalEvents": "événement(s)",
    "type": "Type",
    "upcomingEvents": "Événements à venir",
    "views": "vues",
    "year": "Année"
  }
};

// Traductions OEUVRE en anglais
const oeuvreTranslationsEN = {
  "oeuvre": {
    "addToFavorites": "Add to favorites",
    "awards": "Awards",
    "backToList": "Back to list",
    "browseAllOeuvres": "Browse all works",
    "categories": "Categories",
    "character": "Character",
    "contributors": "Contributors",
    "description": "Description",
    "duration": "Duration",
    "externalLink": "External link",
    "fields": {
      "additionalDetails": "Additional details",
      "additionalDetailsPlaceholder": "Add additional information...",
      "albumDuration": "Album duration",
      "categories": "Categories",
      "description": "Description",
      "descriptionHint": "Describe the work in detail",
      "descriptionPlaceholder": "Describe your work...",
      "dimensions": "Dimensions",
      "director": "Director",
      "doi": "DOI",
      "duration": "Duration",
      "genre": "Genre",
      "isbn": "ISBN",
      "issue": "Issue",
      "journal": "Journal",
      "label": "Label",
      "language": "Language",
      "material": "Material",
      "pages": "Pages",
      "peerReviewed": "Peer reviewed",
      "price": "Price",
      "priceHint": "Sale price (optional)",
      "publisher": "Publisher",
      "region": "Region",
      "sourceUrl": "Source URL",
      "summary": "Summary",
      "summaryPlaceholder": "Work summary...",
      "support": "Support",
      "synopsis": "Synopsis",
      "tags": "Tags",
      "tagsPlaceholder": "Add comma-separated tags",
      "technique": "Technique",
      "title": "Title",
      "titlePlaceholder": "Work title",
      "type": "Type",
      "volume": "Volume",
      "weight": "Weight",
      "year": "Year"
    },
    "genres": "Genres",
    "language": "Language",
    "mainContributors": "Main contributors",
    "metadata": "Metadata",
    "moreOeuvres": "More works",
    "noContributors": "No contributors",
    "noContributorsDesc": "No contributors associated with this work",
    "noDescription": "No description available",
    "noEvents": "No events",
    "noEventsDesc": "No events associated with this work",
    "noRelatedOeuvres": "No related works",
    "notFound": "Work not found",
    "origin": "Origin",
    "pastEvents": "Past events",
    "people": "People",
    "publisher": "Publisher",
    "publishers": "Publishers",
    "quickInfo": "Quick info",
    "relatedOeuvres": "Related works",
    "removeFromFavorites": "Remove from favorites",
    "steps": {
      "categories": {
        "description": "Select your work's categories",
        "noCategories": "No categories selected",
        "selected": "selected",
        "suggestions": "Suggestions",
        "title": "Categories"
      },
      "details": {
        "description": "Specific information according to work type",
        "noType": "No type selected",
        "selectType": "Select a work type first",
        "title": "Specific details"
      },
      "general": {
        "title": "General information"
      },
      "media": {
        "added": "media added",
        "choose": "Choose files",
        "description": "Add images or videos of your work",
        "dropzone": "Drag and drop your files here",
        "formats": "Accepted formats: JPG, PNG, WebP, MP4",
        "principalInfo": "Main image",
        "setPrincipal": "Set as main",
        "title": "Media"
      }
    },
    "summary": "Summary",
    "tabs": {
      "author": "Author",
      "comments": "Comments",
      "gallery": "Gallery",
      "info": "Information"
    },
    "tags": "Tags",
    "team": "Team",
    "titre": "Title",
    "totalContributors": "contributor(s)",
    "totalEvents": "event(s)",
    "type": "Type",
    "upcomingEvents": "Upcoming events",
    "views": "views",
    "year": "Year"
  }
};

// Traductions OEUVRE en arabe
const oeuvreTranslationsAR = {
  "oeuvre": {
    "addToFavorites": "أضف إلى المفضلة",
    "awards": "الجوائز",
    "backToList": "العودة إلى القائمة",
    "browseAllOeuvres": "تصفح جميع الأعمال",
    "categories": "الفئات",
    "character": "الشخصية",
    "contributors": "المساهمون",
    "description": "الوصف",
    "duration": "المدة",
    "externalLink": "رابط خارجي",
    "fields": {
      "additionalDetails": "تفاصيل إضافية",
      "additionalDetailsPlaceholder": "أضف معلومات إضافية...",
      "albumDuration": "مدة الألبوم",
      "categories": "الفئات",
      "description": "الوصف",
      "descriptionHint": "صف العمل بالتفصيل",
      "descriptionPlaceholder": "صف عملك...",
      "dimensions": "الأبعاد",
      "director": "المخرج",
      "doi": "DOI",
      "duration": "المدة",
      "genre": "النوع",
      "isbn": "ISBN",
      "issue": "العدد",
      "journal": "المجلة",
      "label": "التسمية",
      "language": "اللغة",
      "material": "المادة",
      "pages": "الصفحات",
      "peerReviewed": "مراجعة الأقران",
      "price": "السعر",
      "priceHint": "سعر البيع (اختياري)",
      "publisher": "الناشر",
      "region": "المنطقة",
      "sourceUrl": "رابط المصدر",
      "summary": "ملخص",
      "summaryPlaceholder": "ملخص العمل...",
      "support": "الدعم",
      "synopsis": "موجز",
      "tags": "الوسوم",
      "tagsPlaceholder": "أضف وسوم مفصولة بفواصل",
      "technique": "التقنية",
      "title": "العنوان",
      "titlePlaceholder": "عنوان العمل",
      "type": "النوع",
      "volume": "المجلد",
      "weight": "الوزن",
      "year": "السنة"
    },
    "genres": "الأنواع",
    "language": "اللغة",
    "mainContributors": "المساهمون الرئيسيون",
    "metadata": "البيانات الوصفية",
    "moreOeuvres": "المزيد من الأعمال",
    "noContributors": "لا يوجد مساهمون",
    "noContributorsDesc": "لا يوجد مساهمون مرتبطون بهذا العمل",
    "noDescription": "لا يوجد وصف متاح",
    "noEvents": "لا توجد أحداث",
    "noEventsDesc": "لا توجد أحداث مرتبطة بهذا العمل",
    "noRelatedOeuvres": "لا توجد أعمال مرتبطة",
    "notFound": "العمل غير موجود",
    "origin": "الأصل",
    "pastEvents": "الأحداث السابقة",
    "people": "الأشخاص",
    "publisher": "الناشر",
    "publishers": "الناشرون",
    "quickInfo": "معلومات سريعة",
    "relatedOeuvres": "الأعمال المرتبطة",
    "removeFromFavorites": "إزالة من المفضلة",
    "steps": {
      "categories": {
        "description": "اختر فئات عملك",
        "noCategories": "لم يتم اختيار فئات",
        "selected": "محددة",
        "suggestions": "اقتراحات",
        "title": "الفئات"
      },
      "details": {
        "description": "معلومات محددة حسب نوع العمل",
        "noType": "لم يتم اختيار نوع",
        "selectType": "اختر نوع العمل أولاً",
        "title": "تفاصيل محددة"
      },
      "general": {
        "title": "معلومات عامة"
      },
      "media": {
        "added": "وسائط مضافة",
        "choose": "اختر ملفات",
        "description": "أضف صور أو فيديوهات لعملك",
        "dropzone": "اسحب وأفلت ملفاتك هنا",
        "formats": "الصيغ المقبولة: JPG, PNG, WebP, MP4",
        "principalInfo": "الصورة الرئيسية",
        "setPrincipal": "تعيين كصورة رئيسية",
        "title": "الوسائط"
      }
    },
    "summary": "ملخص",
    "tabs": {
      "author": "المؤلف",
      "comments": "التعليقات",
      "gallery": "المعرض",
      "info": "المعلومات"
    },
    "tags": "الوسوم",
    "team": "الفريق",
    "titre": "العنوان",
    "totalContributors": "مساهم(ين)",
    "totalEvents": "حدث (أحداث)",
    "type": "النوع",
    "upcomingEvents": "الأحداث القادمة",
    "views": "المشاهدات",
    "year": "السنة"
  }
};

// Traductions OEUVRE en Tamazight Latin
const oeuvreTranslationsTZLTN = {
  "oeuvre": {
    "addToFavorites": "Rnu ɣer yismenyifen",
    "awards": "Arrazen",
    "backToList": "Uɣal ɣer tebdart",
    "browseAllOeuvres": "Snirem akk tigemmiwin",
    "categories": "Taggayin",
    "character": "Amiḍan",
    "contributors": "Imttekkiyen",
    "description": "Aglam",
    "duration": "Tanzagt",
    "externalLink": "Aseɣwen aberrani",
    "fields": {
      "additionalDetails": "Talqayt-nniḍen",
      "additionalDetailsPlaceholder": "Rnu talɣut-nniḍen...",
      "albumDuration": "Tanzagt n udlisi",
      "categories": "Taggayin",
      "description": "Aglam",
      "descriptionHint": "Glem tawuri s telqayt",
      "descriptionPlaceholder": "Glem tawuri-inek...",
      "dimensions": "Tisektanin",
      "director": "Anmeggar",
      "doi": "DOI",
      "duration": "Tanzagt",
      "genre": "Anaw",
      "isbn": "ISBN",
      "issue": "Uṭṭun",
      "journal": "Taɣmist",
      "label": "Tabzimt",
      "language": "Tutlayt",
      "material": "Tafuli",
      "pages": "Isebtaren",
      "peerReviewed": "Yettwasenqed",
      "price": "Ssuma",
      "priceHint": "Ssuma n zzenz (afrayan)",
      "publisher": "Amezwar",
      "region": "Tamnaḍt",
      "sourceUrl": "URL n uɣbalu",
      "summary": "Agzul",
      "summaryPlaceholder": "Agzul n twuri...",
      "support": "Tallalt",
      "synopsis": "Agzul awezzlan",
      "tags": "Ticraḍ",
      "tagsPlaceholder": "Rnu ticraḍ s teɣzizin",
      "technique": "Tatiknikt",
      "title": "Azwel",
      "titlePlaceholder": "Azwel n twuri",
      "type": "Anaw",
      "volume": "Amagrad",
      "weight": "Azuzen",
      "year": "Aseggwas"
    },
    "genres": "Inawen",
    "language": "Tutlayt",
    "mainContributors": "Imttekkiyen igejdanen",
    "metadata": "Isefka n telɣut",
    "moreOeuvres": "Ugar n tgemmiwin",
    "noContributors": "Ulac imttekkiyen",
    "noContributorsDesc": "Ulac imttekkiyen icudden ɣer twuri-ya",
    "noDescription": "Ulac aglam",
    "noEvents": "Ulac ineḍruyen",
    "noEventsDesc": "Ulac ineḍruyen icudden ɣer twuri-ya",
    "noRelatedOeuvres": "Ulac tigemmiwin icudden",
    "notFound": "Tawuri ur tettwaf ara",
    "origin": "Aɣbalu",
    "pastEvents": "Ineḍruyen iεeddan",
    "people": "Imdanen",
    "publisher": "Amezwar",
    "publishers": "Imezwura",
    "quickInfo": "Talɣut tazzayezt",
    "relatedOeuvres": "Tigemmiwin icudden",
    "removeFromFavorites": "Kkes si yismenyifen",
    "steps": {
      "categories": {
        "description": "Fren taggayin n twuri-inek",
        "noCategories": "Ulac taggayin yettwafren",
        "selected": "yettwafren",
        "suggestions": "Isumar",
        "title": "Taggayin"
      },
      "details": {
        "description": "Talɣut tusligt akken anaw n twuri",
        "noType": "Ulac anaw yettwafren",
        "selectType": "Fren anaw n twuri di tazwara",
        "title": "Talqayt tusligt"
      },
      "general": {
        "title": "Talɣut tamatu"
      },
      "media": {
        "added": "timidyatin yernan",
        "choose": "Fren ifuyla",
        "description": "Rnu tugniwin neɣ tividyutin n twuri-inek",
        "dropzone": "Zuɣer ifuyla-inek dagi",
        "formats": "Imasalen yettwaqeblen: JPG, PNG, WebP, MP4",
        "principalInfo": "Tugna tagejdant",
        "setPrincipal": "Sbadu d tagejdant",
        "title": "Timidyatin"
      }
    },
    "summary": "Agzul",
    "tabs": {
      "author": "Ameskar",
      "comments": "Iwenniten",
      "gallery": "Taγerbast",
      "info": "Talɣut"
    },
    "tags": "Ticraḍ",
    "team": "Tarbaεt",
    "titre": "Azwel",
    "totalContributors": "amettekki(yen)",
    "totalEvents": "aneḍru(yen)",
    "type": "Anaw",
    "upcomingEvents": "Ineḍruyen ara d-yasen",
    "views": "timerna",
    "year": "Aseggwas"
  }
};

// Traductions OEUVRE en Tamazight Tifinagh
const oeuvreTranslationsTZTFNG = {
  "oeuvre": {
    "addToFavorites": "ⵔⵏⵓ ⵖⵔ ⵢⵉⵙⵎⴻⵏⵢⵉⴼⴻⵏ",
    "awards": "ⴰⵔⵔⴰⵣⴻⵏ",
    "backToList": "ⵓⵖⴰⵍ ⵖⵔ ⵜⴻⴱⴷⴰⵔⵜ",
    "browseAllOeuvres": "ⵙⵏⵉⵔⴻⵎ ⴰⴽⴽ ⵜⵉⴳⴻⵎⵎⵉⵡⵉⵏ",
    "categories": "ⵜⴰⴳⴳⴰⵢⵉⵏ",
    "character": "ⴰⵎⵉⴹⴰⵏ",
    "contributors": "ⵉⵎⵜⵜⴻⴽⴽⵉⵢⴻⵏ",
    "description": "ⴰⴳⵍⴰⵎ",
    "duration": "ⵜⴰⵏⵣⴰⴳⵜ",
    "externalLink": "ⴰⵙⴻⵖⵡⴻⵏ ⴰⴱⴻⵔⵔⴰⵏⵉ",
    "fields": {
      "additionalDetails": "ⵜⴰⵍⵇⴰⵢⵜ-ⵏⵏⵉⴹⴻⵏ",
      "additionalDetailsPlaceholder": "ⵔⵏⵓ ⵜⴰⵍⵖⵓⵜ-ⵏⵏⵉⴹⴻⵏ...",
      "albumDuration": "ⵜⴰⵏⵣⴰⴳⵜ ⵏ ⵓⴷⵍⵉⵙⵉ",
      "categories": "ⵜⴰⴳⴳⴰⵢⵉⵏ",
      "description": "ⴰⴳⵍⴰⵎ",
      "descriptionHint": "ⴳⵍⴻⵎ ⵜⴰⵡⵓⵔⵉ ⵙ ⵜⴻⵍⵇⴰⵢⵜ",
      "descriptionPlaceholder": "ⴳⵍⴻⵎ ⵜⴰⵡⵓⵔⵉ-ⵉⵏⴻⴽ...",
      "dimensions": "ⵜⵉⵙⴻⴽⵜⴰⵏⵉⵏ",
      "director": "ⴰⵏⵎⴻⴳⴳⴰⵔ",
      "doi": "DOI",
      "duration": "ⵜⴰⵏⵣⴰⴳⵜ",
      "genre": "ⴰⵏⴰⵡ",
      "isbn": "ISBN",
      "issue": "ⵓⵟⵟⵓⵏ",
      "journal": "ⵜⴰⵖⵎⵉⵙⵜ",
      "label": "ⵜⴰⴱⵣⵉⵎⵜ",
      "language": "ⵜⵓⵜⵍⴰⵢⵜ",
      "material": "ⵜⴰⴼⵓⵍⵉ",
      "pages": "ⵉⵙⴻⴱⵜⴰⵔⴻⵏ",
      "peerReviewed": "ⵢⴻⵜⵜⵡⴰⵙⴻⵏⵇⴻⴷ",
      "price": "ⵙⵙⵓⵎⴰ",
      "priceHint": "ⵙⵙⵓⵎⴰ ⵏ ⵣⵣⴻⵏⵣ (ⴰⴼⵔⴰⵢⴰⵏ)",
      "publisher": "ⴰⵎⴻⵣⵡⴰⵔ",
      "region": "ⵜⴰⵎⵏⴰⴹⵜ",
      "sourceUrl": "URL ⵏ ⵓⵖⴱⴰⵍⵓ",
      "summary": "ⴰⴳⵣⵓⵍ",
      "summaryPlaceholder": "ⴰⴳⵣⵓⵍ ⵏ ⵜⵡⵓⵔⵉ...",
      "support": "ⵜⴰⵍⵍⴰⵍⵜ",
      "synopsis": "ⴰⴳⵣⵓⵍ ⴰⵡⴻⵣⵣⵍⴰⵏ",
      "tags": "ⵜⵉⵛⵔⴰⴹ",
      "tagsPlaceholder": "ⵔⵏⵓ ⵜⵉⵛⵔⴰⴹ ⵙ ⵜⴻⵖⵣⵉⵣⵉⵏ",
      "technique": "ⵜⴰⵜⵉⴽⵏⵉⴽⵜ",
      "title": "ⴰⵣⵡⴻⵍ",
      "titlePlaceholder": "ⴰⵣⵡⴻⵍ ⵏ ⵜⵡⵓⵔⵉ",
      "type": "ⴰⵏⴰⵡ",
      "volume": "ⴰⵎⴰⴳⵔⴰⴷ",
      "weight": "ⴰⵣⵓⵣⴻⵏ",
      "year": "ⴰⵙⴻⴳⴳⵡⴰⵙ"
    },
    "genres": "ⵉⵏⴰⵡⴻⵏ",
    "language": "ⵜⵓⵜⵍⴰⵢⵜ",
    "mainContributors": "ⵉⵎⵜⵜⴻⴽⴽⵉⵢⴻⵏ ⵉⴳⴻⵊⴷⴰⵏⴻⵏ",
    "metadata": "ⵉⵙⴻⴼⴽⴰ ⵏ ⵜⴻⵍⵖⵓⵜ",
    "moreOeuvres": "ⵓⴳⴰⵔ ⵏ ⵜⴳⴻⵎⵎⵉⵡⵉⵏ",
    "noContributors": "ⵓⵍⴰⵛ ⵉⵎⵜⵜⴻⴽⴽⵉⵢⴻⵏ",
    "noContributorsDesc": "ⵓⵍⴰⵛ ⵉⵎⵜⵜⴻⴽⴽⵉⵢⴻⵏ ⵉⵛⵓⴷⴷⴻⵏ ⵖⵔ ⵜⵡⵓⵔⵉ-ⵢⴰ",
    "noDescription": "ⵓⵍⴰⵛ ⴰⴳⵍⴰⵎ",
    "noEvents": "ⵓⵍⴰⵛ ⵉⵏⴻⴹⵔⵓⵢⴻⵏ",
    "noEventsDesc": "ⵓⵍⴰⵛ ⵉⵏⴻⴹⵔⵓⵢⴻⵏ ⵉⵛⵓⴷⴷⴻⵏ ⵖⵔ ⵜⵡⵓⵔⵉ-ⵢⴰ",
    "noRelatedOeuvres": "ⵓⵍⴰⵛ ⵜⵉⴳⴻⵎⵎⵉⵡⵉⵏ ⵉⵛⵓⴷⴷⴻⵏ",
    "notFound": "ⵜⴰⵡⵓⵔⵉ ⵓⵔ ⵜⴻⵜⵜⵡⴰⴼ ⴰⵔⴰ",
    "origin": "ⴰⵖⴱⴰⵍⵓ",
    "pastEvents": "ⵉⵏⴻⴹⵔⵓⵢⴻⵏ ⵉⵄⴻⴷⴷⴰⵏ",
    "people": "ⵉⵎⴷⴰⵏⴻⵏ",
    "publisher": "ⴰⵎⴻⵣⵡⴰⵔ",
    "publishers": "ⵉⵎⴻⵣⵡⵓⵔⴰ",
    "quickInfo": "ⵜⴰⵍⵖⵓⵜ ⵜⴰⵣⵣⴰⵢⴻⵣⵜ",
    "relatedOeuvres": "ⵜⵉⴳⴻⵎⵎⵉⵡⵉⵏ ⵉⵛⵓⴷⴷⴻⵏ",
    "removeFromFavorites": "ⴽⴽⴻⵙ ⵙⵉ ⵢⵉⵙⵎⴻⵏⵢⵉⴼⴻⵏ",
    "steps": {
      "categories": {
        "description": "ⴼⵔⴻⵏ ⵜⴰⴳⴳⴰⵢⵉⵏ ⵏ ⵜⵡⵓⵔⵉ-ⵉⵏⴻⴽ",
        "noCategories": "ⵓⵍⴰⵛ ⵜⴰⴳⴳⴰⵢⵉⵏ ⵢⴻⵜⵜⵡⴰⴼⵔⴻⵏ",
        "selected": "ⵢⴻⵜⵜⵡⴰⴼⵔⴻⵏ",
        "suggestions": "ⵉⵙⵓⵎⴰⵔ",
        "title": "ⵜⴰⴳⴳⴰⵢⵉⵏ"
      },
      "details": {
        "description": "ⵜⴰⵍⵖⵓⵜ ⵜⵓⵙⵍⵉⴳⵜ ⴰⴽⴽⴻⵏ ⴰⵏⴰⵡ ⵏ ⵜⵡⵓⵔⵉ",
        "noType": "ⵓⵍⴰⵛ ⴰⵏⴰⵡ ⵢⴻⵜⵜⵡⴰⴼⵔⴻⵏ",
        "selectType": "ⴼⵔⴻⵏ ⴰⵏⴰⵡ ⵏ ⵜⵡⵓⵔⵉ ⴷⵉ ⵜⴰⵣⵡⴰⵔⴰ",
        "title": "ⵜⴰⵍⵇⴰⵢⵜ ⵜⵓⵙⵍⵉⴳⵜ"
      },
      "general": {
        "title": "ⵜⴰⵍⵖⵓⵜ ⵜⴰⵎⴰⵜⵓ"
      },
      "media": {
        "added": "ⵜⵉⵎⵉⴷⵢⴰⵜⵉⵏ ⵢⴻⵔⵏⴰⵏ",
        "choose": "ⴼⵔⴻⵏ ⵉⴼⵓⵢⵍⴰ",
        "description": "ⵔⵏⵓ ⵜⵓⴳⵏⵉⵡⵉⵏ ⵏⴻⵖ ⵜⵉⵠⵉⴷⵢⵓⵜⵉⵏ ⵏ ⵜⵡⵓⵔⵉ-ⵉⵏⴻⴽ",
        "dropzone": "ⵣⵓⵖⴻⵔ ⵉⴼⵓⵢⵍⴰ-ⵉⵏⴻⴽ ⴷⴰⴳⵉ",
        "formats": "ⵉⵎⴰⵙⴰⵍⴻⵏ ⵢⴻⵜⵜⵡⴰⵇⴻⴱⵍⴻⵏ: JPG, PNG, WebP, MP4",
        "principalInfo": "ⵜⵓⴳⵏⴰ ⵜⴰⴳⴻⵊⴷⴰⵏⵜ",
        "setPrincipal": "ⵙⴱⴰⴷⵓ ⴷ ⵜⴰⴳⴻⵊⴷⴰⵏⵜ",
        "title": "ⵜⵉⵎⵉⴷⵢⴰⵜⵉⵏ"
      }
    },
    "summary": "ⴰⴳⵣⵓⵍ",
    "tabs": {
      "author": "ⴰⵎⴻⵙⴽⴰⵔ",
      "comments": "ⵉⵡⴻⵏⵏⵉⵜⴻⵏ",
      "gallery": "ⵜⴰⵖⴻⵔⴱⴰⵙⵜ",
      "info": "ⵜⴰⵍⵖⵓⵜ"
    },
    "tags": "ⵜⵉⵛⵔⴰⴹ",
    "team": "ⵜⴰⵔⴱⴰⴻⵜ",
    "titre": "ⴰⵣⵡⴻⵍ",
    "totalContributors": "ⴰⵎⴻⵜⵜⴻⴽⴽⵉ(ⵢⴻⵏ)",
    "totalEvents": "ⴰⵏⴻⴹⵔⵓ(ⵢⴻⵏ)",
    "type": "ⴰⵏⴰⵡ",
    "upcomingEvents": "ⵉⵏⴻⴹⵔⵓⵢⴻⵏ ⴰⵔⴰ ⴷ-ⵢⴰⵙⴻⵏ",
    "views": "ⵜⵉⵎⴻⵔⵏⴰ",
    "year": "ⴰⵙⴻⴳⴳⵡⴰⵙ"
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
  'fr': oeuvreTranslationsFR,
  'en': oeuvreTranslationsEN,
  'ar': oeuvreTranslationsAR,
  'tz-ltn': oeuvreTranslationsTZLTN,
  'tz-tfng': oeuvreTranslationsTZTFNG
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

  console.log(`✅ ${lang.toUpperCase()} - Section OEUVRE ajoutée (100 clés)`);
  totalAdded += 100;
});

console.log('\n' + '='.repeat(60));
console.log(`\n🎉 SUCCÈS! ${totalAdded} traductions OEUVRE ajoutées (100 clés × 5 langues)`);
console.log('\n📊 Prochaines étapes:');
console.log('  - EVENT: 61 clés × 5 langues = 305 traductions');
console.log('  - PLACES: 43 clés × 5 langues = 215 traductions');
console.log('\n');
