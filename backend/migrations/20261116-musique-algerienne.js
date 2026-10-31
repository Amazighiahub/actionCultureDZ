'use strict';

/**
 * Migration : la musique algérienne dans le formulaire « Ajouter une œuvre ».
 * - Genres algériens reliés au type Musique (id 3), placés avant les genres internationaux, avec leurs
 *   sous-catégories (sans sous-catégorie, un genre n'apparaît pas dans le formulaire). Les genres déjà
 *   en base (Raï, Chaâbi, Andalou, Kabyle, Gnawa) sont retrouvés par leur nom français et complétés.
 * - Type 3 « Album Musical » renommé « Musique » (il couvre aussi chansons, EP, concerts).
 * - Album : format, nombre de pistes (envoyé par le formulaire mais jamais enregistré jusqu'ici),
 *   liste des titres, liens d'écoute et instruments.
 * - Extraits audio déjà envoyés (rangés en « document ») remis en « audio ».
 * Rejouable : rien n'est créé deux fois, aucune traduction saisie depuis n'est écrasée.
 */
const DONNEES = {
  "genres": [
    {
      "nom": {
        "fr": "Andalou",
        "ar": "أندلسي",
        "en": "Andalusian",
        "tz-ltn": "Aẓawan andalusi",
        "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⴰⵏⴷⴰⵍⵓⵙⵉ"
      },
      "categories": [
        {
          "fr": "Sanâa",
          "ar": "صنعة",
          "en": "Sanaa",
          "tz-ltn": "Ṣṣenɛa",
          "tz-tfng": "ⵚⵚⴻⵏⵄⴰ"
        },
        {
          "fr": "Gharnati",
          "ar": "غرناطي",
          "en": "Gharnati",
          "tz-ltn": "Ɣernaṭi",
          "tz-tfng": "ⵖⴻⵔⵏⴰⵟⵉ"
        },
        {
          "fr": "Malouf",
          "ar": "مالوف",
          "en": "Malouf",
          "tz-ltn": "Malluf",
          "tz-tfng": "ⵎⴰⵍⵍⵓⴼ"
        },
        {
          "fr": "Hawzi",
          "ar": "حوزي",
          "en": "Hawzi",
          "tz-ltn": "Ḥawzi",
          "tz-tfng": "ⵃⴰⵡⵣⵉ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Chaâbi",
        "ar": "شعبي",
        "en": "Chaabi",
        "tz-ltn": "Ccaɛbi",
        "tz-tfng": "ⵛⵛⴰⵄⴱⵉ"
      },
      "categories": [
        {
          "fr": "Chaâbi algérois",
          "ar": "شعبي عاصمي",
          "en": "Algiers chaabi",
          "tz-ltn": "Ccaɛbi n Lezzayer",
          "tz-tfng": "ⵛⵛⴰⵄⴱⵉ ⵏ ⵍⴻⵣⵣⴰⵢⴻⵔ"
        },
        {
          "fr": "Chaâbi moderne",
          "ar": "شعبي حديث",
          "en": "Modern chaabi",
          "tz-ltn": "Ccaɛbi atrar",
          "tz-tfng": "ⵛⵛⴰⵄⴱⵉ ⴰⵜⵔⴰⵔ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Raï",
        "ar": "راي",
        "en": "Raï",
        "tz-ltn": "Rray",
        "tz-tfng": "ⵔⵔⴰⵢ"
      },
      "categories": [
        {
          "fr": "Raï traditionnel",
          "ar": "راي تقليدي",
          "en": "Traditional raï",
          "tz-ltn": "Rray aqbur",
          "tz-tfng": "ⵔⵔⴰⵢ ⴰⵇⴱⵓⵔ"
        },
        {
          "fr": "Raï moderne",
          "ar": "راي حديث",
          "en": "Modern raï",
          "tz-ltn": "Rray atrar",
          "tz-tfng": "ⵔⵔⴰⵢ ⴰⵜⵔⴰⵔ"
        },
        {
          "fr": "Wahrani",
          "ar": "وهراني",
          "en": "Wahrani",
          "tz-ltn": "Awehrani",
          "tz-tfng": "ⴰⵡⴻⵀⵔⴰⵏⵉ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Kabyle",
        "ar": "قبائلي",
        "en": "Kabyle",
        "tz-ltn": "Aqbayli",
        "tz-tfng": "ⴰⵇⴱⴰⵢⵍⵉ"
      },
      "categories": [
        {
          "fr": "Achewiq",
          "ar": "أشويق",
          "en": "Achewiq",
          "tz-ltn": "Acewwiq",
          "tz-tfng": "ⴰⵛⴻⵡⵡⵉⵇ"
        },
        {
          "fr": "Urar",
          "ar": "أورار",
          "en": "Urar",
          "tz-ltn": "Urar",
          "tz-tfng": "ⵓⵔⴰⵔ"
        },
        {
          "fr": "Chanson kabyle moderne",
          "ar": "أغنية قبائلية حديثة",
          "en": "Modern Kabyle song",
          "tz-ltn": "Tizlit taqbaylit tatrart",
          "tz-tfng": "ⵜⵉⵣⵍⵉⵜ ⵜⴰⵇⴱⴰⵢⵍⵉⵜ ⵜⴰⵜⵔⴰⵔⵜ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Chaoui",
        "ar": "شاوي",
        "en": "Chaoui",
        "tz-ltn": "Acawi",
        "tz-tfng": "ⴰⵛⴰⵡⵉ"
      },
      "categories": [
        {
          "fr": "Rahaba",
          "ar": "رحابة",
          "en": "Rahaba",
          "tz-ltn": "Rrehaba",
          "tz-tfng": "ⵔⵔⴻⵀⴰⴱⴰ"
        },
        {
          "fr": "Chanson chaouie moderne",
          "ar": "أغنية شاوية حديثة",
          "en": "Modern Chaoui song",
          "tz-ltn": "Tizlit tacawit tatrart",
          "tz-tfng": "ⵜⵉⵣⵍⵉⵜ ⵜⴰⵛⴰⵡⵉⵜ ⵜⴰⵜⵔⴰⵔⵜ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Targui",
        "ar": "ترقي",
        "en": "Tuareg music",
        "tz-ltn": "Atargi",
        "tz-tfng": "ⴰⵜⴰⵔⴳⵉ"
      },
      "categories": [
        {
          "fr": "Imzad",
          "ar": "إمزاد",
          "en": "Imzad",
          "tz-ltn": "Imzad",
          "tz-tfng": "ⵉⵎⵣⴰⴷ"
        },
        {
          "fr": "Tindé",
          "ar": "تيندي",
          "en": "Tinde",
          "tz-ltn": "Tinde",
          "tz-tfng": "ⵜⵉⵏⴷⴻ"
        },
        {
          "fr": "Assouf",
          "ar": "أسوف",
          "en": "Assouf",
          "tz-ltn": "Asuf",
          "tz-tfng": "ⴰⵙⵓⴼ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Bédoui",
        "ar": "بدوي",
        "en": "Bedouin music",
        "tz-ltn": "Abadwi",
        "tz-tfng": "ⴰⴱⴰⴷⵡⵉ"
      },
      "categories": [
        {
          "fr": "Gasba",
          "ar": "قصبة",
          "en": "Gasba",
          "tz-ltn": "Lgesba",
          "tz-tfng": "ⵍⴳⴻⵙⴱⴰ"
        },
        {
          "fr": "Naïli",
          "ar": "نايلي",
          "en": "Naili",
          "tz-ltn": "Anayli",
          "tz-tfng": "ⴰⵏⴰⵢⵍⵉ"
        },
        {
          "fr": "Ayay",
          "ar": "أياي",
          "en": "Ayay",
          "tz-ltn": "Ayay",
          "tz-tfng": "ⴰⵢⴰⵢ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Gnawa",
        "ar": "قناوة",
        "en": "Gnawa",
        "tz-ltn": "Gnawa",
        "tz-tfng": "ⴳⵏⴰⵡⴰ"
      },
      "categories": [
        {
          "fr": "Diwane",
          "ar": "ديوان",
          "en": "Diwane",
          "tz-ltn": "Diwan",
          "tz-tfng": "ⴷⵉⵡⴰⵏ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Staïfi",
        "ar": "سطايفي",
        "en": "Staifi",
        "tz-ltn": "Asṭayfi",
        "tz-tfng": "ⴰⵙⵟⴰⵢⴼⵉ"
      },
      "categories": [
        {
          "fr": "Staïfi traditionnel",
          "ar": "سطايفي تقليدي",
          "en": "Traditional Staifi",
          "tz-ltn": "Asṭayfi aqbur",
          "tz-tfng": "ⴰⵙⵟⴰⵢⴼⵉ ⴰⵇⴱⵓⵔ"
        },
        {
          "fr": "Staïfi moderne",
          "ar": "سطايفي حديث",
          "en": "Modern Staifi",
          "tz-ltn": "Asṭayfi atrar",
          "tz-tfng": "ⴰⵙⵟⴰⵢⴼⵉ ⴰⵜⵔⴰⵔ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Musiques sahariennes",
        "ar": "موسيقى صحراوية",
        "en": "Saharan music",
        "tz-ltn": "Aẓawan n Tniri",
        "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵜⵏⵉⵔⵉ"
      },
      "categories": [
        {
          "fr": "Ahellil",
          "ar": "أهليل",
          "en": "Ahellil",
          "tz-ltn": "Ahellil",
          "tz-tfng": "ⴰⵀⴻⵍⵍⵉⵍ"
        }
      ]
    },
    {
      "nom": {
        "fr": "Chant spirituel",
        "ar": "إنشاد روحي",
        "en": "Spiritual chant",
        "tz-ltn": "Lmedḥ",
        "tz-tfng": "ⵍⵎⴻⴷⵃ"
      },
      "categories": [
        {
          "fr": "Madih",
          "ar": "مديح",
          "en": "Madih",
          "tz-ltn": "Lmedḥ n nnbi",
          "tz-tfng": "ⵍⵎⴻⴷⵃ ⵏ ⵏⵏⴱⵉ"
        },
        {
          "fr": "Inchad",
          "ar": "إنشاد",
          "en": "Inshad",
          "tz-ltn": "Lincad",
          "tz-tfng": "ⵍⵉⵏⵛⴰⴷ"
        },
        {
          "fr": "Hadra",
          "ar": "حضرة",
          "en": "Hadra",
          "tz-ltn": "Lḥeḍra",
          "tz-tfng": "ⵍⵃⴻⴹⵔⴰ"
        }
      ]
    }
  ],
  "type": {
    "fr": "Musique",
    "ar": "موسيقى",
    "en": "Music",
    "tz-ltn": "Aẓawan",
    "tz-tfng": "ⴰⵥⴰⵡⴰⵏ"
  },
  "descriptions": [
    {
      "fr": "Musique rock",
      "ar": "موسيقى الروك",
      "en": "Rock music",
      "tz-ltn": "Aẓawan n rock",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵔⵓⵛⴽ"
    },
    {
      "fr": "Musique pop",
      "ar": "موسيقى البوب",
      "en": "Pop music",
      "tz-ltn": "Aẓawan n pop",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵒⵓⵒ"
    },
    {
      "fr": "Musique jazz",
      "ar": "موسيقى الجاز",
      "en": "Jazz music",
      "tz-ltn": "Aẓawan n jazz",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵊⴰⵣⵣ"
    },
    {
      "fr": "Musique classique",
      "ar": "موسيقى كلاسيكية",
      "en": "Classical music",
      "tz-ltn": "Aẓawan aklasiki",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⴰⴽⵍⴰⵙⵉⴽⵉ"
    },
    {
      "fr": "Musique électronique",
      "ar": "موسيقى إلكترونية",
      "en": "Electronic music",
      "tz-ltn": "Aẓawan aliktruni",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⴰⵍⵉⴽⵜⵔⵓⵏⵉ"
    },
    {
      "fr": "Musique hip-hop",
      "ar": "موسيقى الهيب هوب",
      "en": "Hip-hop music",
      "tz-ltn": "Aẓawan n hip-hop",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵀⵉⵒ-ⵀⵓⵒ"
    },
    {
      "fr": "Musique folk",
      "ar": "موسيقى الفولك",
      "en": "Folk music",
      "tz-ltn": "Aẓawan n folk",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴼⵓⵍⴽ"
    },
    {
      "fr": "Musique metal",
      "ar": "موسيقى الميتال",
      "en": "Metal music",
      "tz-ltn": "Aẓawan n metal",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵎⴻⵜⴰⵍ"
    },
    {
      "fr": "Rhythm and blues",
      "ar": "ريذم أند بلوز",
      "en": "Rhythm and blues",
      "tz-ltn": "Rhythm and blues",
      "tz-tfng": "ⵔⵀⵢⵜⵀⵎ ⴰⵏⴷ ⴱⵍⵓⴻⵙ"
    },
    {
      "fr": "Musique reggae",
      "ar": "موسيقى الريغي",
      "en": "Reggae music",
      "tz-ltn": "Aẓawan n reggae",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵔⴻⴳⴳⴰⴻ"
    },
    {
      "fr": "Musique blues",
      "ar": "موسيقى البلوز",
      "en": "Blues music",
      "tz-ltn": "Aẓawan n blues",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴱⵍⵓⴻⵙ"
    },
    {
      "fr": "Musique country",
      "ar": "موسيقى الكانتري",
      "en": "Country music",
      "tz-ltn": "Aẓawan n country",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵛⵓⵓⵏⵜⵔⵢ"
    },
    {
      "fr": "Musique raï algérienne",
      "ar": "موسيقى الراي الجزائرية",
      "en": "Algerian raï music",
      "tz-ltn": "Aẓawan n rray azzayri",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵔⵔⴰⵢ ⴰⵣⵣⴰⵢⵔⵉ"
    },
    {
      "fr": "Musique chaâbi algérienne",
      "ar": "موسيقى الشعبي الجزائرية",
      "en": "Algerian chaabi music",
      "tz-ltn": "Aẓawan n ccaɛbi azzayri",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵛⵛⴰⵄⴱⵉ ⴰⵣⵣⴰⵢⵔⵉ"
    },
    {
      "fr": "Musique andalouse",
      "ar": "الموسيقى الأندلسية",
      "en": "Andalusian music",
      "tz-ltn": "Aẓawan andalusi",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⴰⵏⴷⴰⵍⵓⵙⵉ"
    },
    {
      "fr": "Genre Kabyle",
      "ar": "الموسيقى القبائلية",
      "en": "Kabyle music",
      "tz-ltn": "Aẓawan aqbayli",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⴰⵇⴱⴰⵢⵍⵉ"
    },
    {
      "fr": "Genre Gnawa",
      "ar": "موسيقى القناوة",
      "en": "Gnawa music",
      "tz-ltn": "Aẓawan n Gnawa",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴳⵏⴰⵡⴰ"
    },
    {
      "fr": "Rock alternatif",
      "ar": "روك بديل",
      "en": "Alternative rock",
      "tz-ltn": "Rock alternatif",
      "tz-tfng": "ⵔⵓⵛⴽ ⴰⵍⵜⴻⵔⵏⴰⵜⵉⴼ"
    },
    {
      "fr": "Rock dur",
      "ar": "روك صلب",
      "en": "Hard rock",
      "tz-ltn": "Rock iqesḥen",
      "tz-tfng": "ⵔⵓⵛⴽ ⵉⵇⴻⵙⵃⴻⵏ"
    },
    {
      "fr": "Punk rock",
      "ar": "بانك روك",
      "en": "Punk rock",
      "tz-ltn": "Punk rock",
      "tz-tfng": "ⵒⵓⵏⴽ ⵔⵓⵛⴽ"
    },
    {
      "fr": "Rock progressif",
      "ar": "روك تقدمي",
      "en": "Progressive rock",
      "tz-ltn": "Rock progressif",
      "tz-tfng": "ⵔⵓⵛⴽ ⵒⵔⵓⴳⵔⴻⵙⵙⵉⴼ"
    },
    {
      "fr": "Rock indépendant",
      "ar": "روك مستقل",
      "en": "Indie rock",
      "tz-ltn": "Rock ilelli",
      "tz-tfng": "ⵔⵓⵛⴽ ⵉⵍⴻⵍⵍⵉ"
    },
    {
      "fr": "Pop rock",
      "ar": "بوب روك",
      "en": "Pop rock",
      "tz-ltn": "Pop rock",
      "tz-tfng": "ⵒⵓⵒ ⵔⵓⵛⴽ"
    },
    {
      "fr": "Pop électronique",
      "ar": "بوب إلكتروني",
      "en": "Electropop",
      "tz-ltn": "Pop aliktruni",
      "tz-tfng": "ⵒⵓⵒ ⴰⵍⵉⴽⵜⵔⵓⵏⵉ"
    },
    {
      "fr": "Pop coréenne",
      "ar": "بوب كوري",
      "en": "Korean pop",
      "tz-ltn": "Pop akuri",
      "tz-tfng": "ⵒⵓⵒ ⴰⴽⵓⵔⵉ"
    },
    {
      "fr": "Pop indépendante",
      "ar": "بوب مستقل",
      "en": "Indie pop",
      "tz-ltn": "Pop ilelli",
      "tz-tfng": "ⵒⵓⵒ ⵉⵍⴻⵍⵍⵉ"
    },
    {
      "fr": "Jazz bebop",
      "ar": "جاز بيبوب",
      "en": "Bebop jazz",
      "tz-ltn": "Jazz bebop",
      "tz-tfng": "ⵊⴰⵣⵣ ⴱⴻⴱⵓⵒ"
    },
    {
      "fr": "Jazz doux",
      "ar": "جاز ناعم",
      "en": "Smooth jazz",
      "tz-ltn": "Jazz aḥlawan",
      "tz-tfng": "ⵊⴰⵣⵣ ⴰⵃⵍⴰⵡⴰⵏ"
    },
    {
      "fr": "Jazz fusion",
      "ar": "جاز فيوجن",
      "en": "Jazz fusion",
      "tz-ltn": "Jazz fusion",
      "tz-tfng": "ⵊⴰⵣⵣ ⴼⵓⵙⵉⵓⵏ"
    },
    {
      "fr": "Jazz libre",
      "ar": "جاز حر",
      "en": "Free jazz",
      "tz-ltn": "Jazz ilelli",
      "tz-tfng": "ⵊⴰⵣⵣ ⵉⵍⴻⵍⵍⵉ"
    },
    {
      "fr": "Musique house",
      "ar": "موسيقى الهاوس",
      "en": "House music",
      "tz-ltn": "Aẓawan n house",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵀⵓⵓⵙⴻ"
    },
    {
      "fr": "Musique techno",
      "ar": "موسيقى التكنو",
      "en": "Techno music",
      "tz-ltn": "Aẓawan n techno",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵜⴻⵛⵀⵏⵓ"
    },
    {
      "fr": "Musique dubstep",
      "ar": "موسيقى الدبستيب",
      "en": "Dubstep music",
      "tz-ltn": "Aẓawan n dubstep",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴷⵓⴱⵙⵜⴻⵒ"
    },
    {
      "fr": "Musique ambiante",
      "ar": "موسيقى محيطية",
      "en": "Ambient music",
      "tz-ltn": "Aẓawan n twennaḍt",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵜⵡⴻⵏⵏⴰⴹⵜ"
    },
    {
      "fr": "Musique trap",
      "ar": "موسيقى التراب",
      "en": "Trap music",
      "tz-ltn": "Aẓawan n trap",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⵜⵔⴰⵒ"
    },
    {
      "fr": "Musique drill",
      "ar": "موسيقى الدريل",
      "en": "Drill music",
      "tz-ltn": "Aẓawan n drill",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴷⵔⵉⵍⵍ"
    },
    {
      "fr": "Musique afrobeat",
      "ar": "موسيقى الأفروبيت",
      "en": "Afrobeat music",
      "tz-ltn": "Aẓawan n afrobeat",
      "tz-tfng": "ⴰⵥⴰⵡⴰⵏ ⵏ ⴰⴼⵔⵓⴱⴻⴰⵜ"
    }
  ]
};
const TYPE_MUSIQUE = 3;
const LANGUES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const COLONNES_ALBUM = {
  format: 'VARCHAR(20) NULL',
  nb_pistes: 'INT NULL',
  pistes: 'JSON NULL',
  liens_ecoute: 'JSON NULL',
  instruments: 'JSON NULL'
};

async function idParNom(q, table, cle, fr) {
  const [lignes] = await q.query(
    `SELECT \`${cle}\` AS id FROM \`${table}\` WHERE JSON_VALID(nom) AND JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')) = ? ORDER BY \`${cle}\` LIMIT 1`,
    { replacements: [fr] });
  return lignes[0]?.id || null;
}

/** Ligne retrouvée par son nom français ; créée si absente ; traductions vides complétées. */
async function assurer(q, table, cle, nom, ordre) {
  let id = await idParNom(q, table, cle, nom.fr);
  if (!id) {
    await q.query(
      `INSERT INTO \`${table}\` (nom, description, ordre_affichage, actif) VALUES (?, NULL, ?, 1)`,
      { replacements: [JSON.stringify(nom), ordre] });
    id = await idParNom(q, table, cle, nom.fr);
  }
  for (const langue of LANGUES) {
    await q.query(
      `UPDATE \`${table}\` SET nom = JSON_SET(nom, '$."${langue}"', ?)
       WHERE \`${cle}\` = ? AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(nom, '$."${langue}"')), '') = ''`,
      { replacements: [nom[langue], id] });
  }
  // Une description vide ({}) s'afficherait comme un objet dans le formulaire : on la vide
  await q.query(`UPDATE \`${table}\` SET description = NULL WHERE \`${cle}\` = ? AND JSON_LENGTH(description) = 0`, { replacements: [id] });
  return id;
}

async function lier(q, table, colA, a, colB, b, ordre) {
  const [existants] = await q.query(
    `SELECT 1 FROM \`${table}\` WHERE \`${colA}\` = ? AND \`${colB}\` = ? LIMIT 1`, { replacements: [a, b] });
  if (existants.length) {
    await q.query(`UPDATE \`${table}\` SET actif = 1, ordre_affichage = ? WHERE \`${colA}\` = ? AND \`${colB}\` = ?`,
      { replacements: [ordre, a, b] });
  } else {
    await q.query(`INSERT INTO \`${table}\` (\`${colA}\`, \`${colB}\`, ordre_affichage, actif) VALUES (?, ?, ?, 1)`,
      { replacements: [a, b, ordre] });
  }
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;

    const album = await queryInterface.describeTable('albummusical');
    for (const [colonne, definition] of Object.entries(COLONNES_ALBUM)) {
      if (!album[colonne]) await q.query(`ALTER TABLE albummusical ADD COLUMN \`${colonne}\` ${definition}`);
    }

    await q.query(
      `UPDATE type_oeuvre SET nom_type = ? WHERE id_type_oeuvre = ? AND JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = 'Album Musical'`,
      { replacements: [JSON.stringify(DONNEES.type), TYPE_MUSIQUE] });

    // Genres internationaux après les genres algériens (une seule fois)
    await q.query(
      'UPDATE type_oeuvre_genre SET ordre_affichage = ordre_affichage + 100 WHERE id_type_oeuvre = ? AND ordre_affichage < 100',
      { replacements: [TYPE_MUSIQUE] });

    // Descriptions des genres et sous-catégories : traductions vides complétées, retrouvées par le texte français
    for (const table of ['genre', 'categorie']) {
      for (const description of DONNEES.descriptions) {
        for (const langue of LANGUES.filter((l) => l !== 'fr')) {
          await q.query(
            `UPDATE \`${table}\` SET description = JSON_SET(description, '$."${langue}"', ?)
             WHERE JSON_VALID(description) AND JSON_UNQUOTE(JSON_EXTRACT(description, '$.fr')) = ?
               AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(description, '$."${langue}"')), '') = ''`,
            { replacements: [description[langue], description.fr] });
        }
      }
    }

    for (const [i, genre] of DONNEES.genres.entries()) {
      const idGenre = await assurer(q, 'genre', 'id_genre', genre.nom, i + 1);
      await lier(q, 'type_oeuvre_genre', 'id_type_oeuvre', TYPE_MUSIQUE, 'id_genre', idGenre, i + 1);
      for (const [j, categorie] of genre.categories.entries()) {
        const idCategorie = await assurer(q, 'categorie', 'id_categorie', categorie, j + 1);
        await lier(q, 'genre_categorie', 'id_genre', idGenre, 'id_categorie', idCategorie, j + 1);
      }
    }

    // Extraits audio déjà envoyés : rangés en « document » par erreur, le lecteur ne les trouvait pas
    await q.query("UPDATE media SET type_media = 'audio' WHERE type_media = 'document' AND mime_type LIKE 'audio/%'");

    // Albums déjà enregistrés : le genre venait d'un repli (le premier genre du type, « Rock »).
    // On prend le genre des catégories choisies quand elles en donnent un.
    const GENRE_DES_CATEGORIES = `SELECT gc.id_genre FROM oeuvrecategories oc
      JOIN genre_categorie gc ON gc.id_categorie = oc.id_categorie AND gc.actif = 1
      JOIN type_oeuvre_genre tg ON tg.id_genre = gc.id_genre AND tg.id_type_oeuvre = ${TYPE_MUSIQUE} AND tg.actif = 1
      WHERE oc.id_oeuvre = a.id_oeuvre ORDER BY oc.id LIMIT 1`;
    await q.query(`UPDATE albummusical a SET a.id_genre = (${GENRE_DES_CATEGORIES})
      WHERE EXISTS (${GENRE_DES_CATEGORIES})`);
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const album = await queryInterface.describeTable('albummusical');
    for (const colonne of Object.keys(COLONNES_ALBUM)) {
      if (album[colonne]) await q.query(`ALTER TABLE albummusical DROP COLUMN \`${colonne}\``);
    }
    await q.query(
      `UPDATE type_oeuvre SET nom_type = JSON_SET(nom_type, '$.fr', 'Album Musical', '$.ar', 'ألبوم موسيقي', '$.en', 'Music album')
       WHERE id_type_oeuvre = ? AND JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = 'Musique'`,
      { replacements: [TYPE_MUSIQUE] });
    // Les genres et catégories ajoutés restent (des œuvres peuvent déjà les utiliser).
  }
};
