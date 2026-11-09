'use strict';

/**
 * Migration : lieux de la wilaya de Batna préparés pour relecture (brouillon + demande de validation).
 * - Lambèse (Lambaesis), Tazoult, avec 4 points : quartier général dit « praetorium », amphithéâtre,
 *   arc de Septime Sévère, musée
 * - Imedghassen (Medracen), mausolée royal numide, Boumia
 * - Parc national de Belezma, Oued Chaaba
 * - Batna centre (déjà publié, jamais recréé) : textes remplis s'ils sont vides, points « Allées Ben Boulaïd » et « Ancienne mairie (APC) »
 *
 * Positions : Wikipédia et Wikidata ; points de Lambèse : position médiane des photos géolocalisées de
 * Wikimedia Commons (musée : à vérifier sur place). Textes fr, ar, en avec sources.
 * Rattachés au compte administrateur n° 75 (sinon au premier administrateur actif). Rejouable ; la descente ne
 * retire que ce qui est resté en brouillon.
 */
const { administrateur, creerSites, retirerSites } = require('../utils/lieuxPrepares');

const ID_ADMIN_CHOISI = 75;
const sources = (fr) => ({ fr, ar: fr.replace('Sources :', 'المصادر:'), en: fr.replace('Sources :', 'Sources:') });

const SITES = [
  {
    // Déjà publié : jamais recréé ; textes remplis seulement s'ils sont vides ; nouveau point avec sa demande
    existantSeulement: true,
    nom: { fr: 'Batna centre' },
    detail: {
      description: {
        fr: 'Capitale des Aurès, Batna est née d’un camp militaire français en 1844, sur la route qui mène au Sahara par les gorges d’El Kantara.',
        ar: 'عاصمة الأوراس، وُلدت باتنة من معسكر عسكري فرنسي سنة 1844، على الطريق المؤدي إلى الصحراء عبر مضايق القنطرة.',
        en: 'Capital of the Aurès, Batna was born from a French military camp in 1844, on the road to the Sahara through the El Kantara gorges.',
      },
      histoire: {
        fr: 'En 1844, l’armée française établit un camp fortifié au lieu-dit Bathent, pour contrôler la route du Sahara et le passage d’El Kantara ; le camp porte d’abord le nom de Ras-el-Ayoun-Batna. Par décret du 12 septembre 1848, la garnison devient une commune sous le nom de Nouvelle-Lambèse, mais les habitants continuent de dire Batna, nom officiel dès 1849.\n\nLa ville honore Mostefa Ben Boulaïd, figure de la guerre de libération dans les Aurès : une allée et un lycée portent son nom, comme l’aéroport, et son buste se dresse sur la place principale.',
        ar: 'في سنة 1844 أقام الجيش الفرنسي معسكرًا محصّنًا في موضع «باثنت» لمراقبة طريق الصحراء وممر القنطرة، وسُمّي أولًا «رأس العيون-باتنة». وبمرسوم 12 سبتمبر 1848 صارت الحامية بلدية باسم «لامبيز الجديدة»، لكن السكان ظلّوا يقولون «باتنة»، فصار الاسم رسميًا منذ 1849.\n\nوتكرّم المدينة مصطفى بن بولعيد، أحد رموز حرب التحرير في الأوراس: يحمل اسمه ممشى وثانوية والمطار، ويقوم تمثاله النصفي في الساحة الرئيسية.',
        en: 'In 1844 the French army set up a fortified camp at a place called Bathent, to control the road to the Sahara and the El Kantara pass; the camp was first named Ras-el-Ayoun-Batna. By decree of 12 September 1848 the garrison became a municipality named Nouvelle-Lambèse, but residents kept saying Batna, the official name from 1849.\n\nThe city honours Mostefa Ben Boulaïd, a figure of the liberation war in the Aurès: an avenue, a high school and the airport bear his name, and his bust stands on the main square.',
      },
      referencesHistoriques: sources('Sources :\n• Geneawiki, « Algérie – Batna » : https://fr.geneawiki.com/wiki/Algérie_-_Batna\n• Encyclopædia Britannica, « Batna »\n• Wikipédia, « Batna (city) » et « Mostefa Ben Boulaïd »'),
    },
    points: [
      {
        commune: 'Batna', typePatrimoine: 'monument', latitude: 35.556579, longitude: 6.176942,
        nom: { fr: 'Allées Ben Boulaïd et la statue de Mostefa Ben Boulaïd', ar: 'ممشى بن بولعيد وتمثال مصطفى بن بولعيد', en: 'Ben Boulaïd avenue and the statue of Mostefa Ben Boulaïd' },
        description: {
          fr: 'Grande allée du centre de Batna, qui porte le nom de Mostefa Ben Boulaïd, figure de la guerre de libération dans les Aurès, et où se dresse sa statue. Lieu de promenade et de fêtes de la ville. Position de la statue à ajuster sur la carte si besoin.',
          ar: 'الممشى الكبير في وسط باتنة، يحمل اسم مصطفى بن بولعيد، أحد رموز حرب التحرير في الأوراس، وفيه يقوم تمثاله. فضاء للتنزه واحتفالات المدينة. يمكن ضبط موقع التمثال على الخريطة عند الحاجة.',
          en: 'Main avenue of central Batna, named after Mostefa Ben Boulaïd, a figure of the liberation war in the Aurès, where his statue stands. A place for strolls and city festivities. Statue position to be adjusted on the map if needed.',
        },
      },
      {
        commune: 'Batna', typePatrimoine: 'monument', latitude: 35.553356, longitude: 6.178,
        nom: { fr: 'Ancienne mairie de Batna (APC)', ar: 'مقر بلدية باتنة القديم', en: 'Former town hall of Batna (APC)' },
        description: {
          fr: 'Bâtiment de l’époque coloniale qui abrite aujourd’hui l’Assemblée populaire communale (APC) de Batna, rue Nouara Ahmed. Date de construction à préciser.',
          ar: 'مبنى من الحقبة الاستعمارية يضمّ اليوم المجلس الشعبي البلدي لباتنة، شارع نوارة أحمد. تاريخ البناء يُحدَّد لاحقًا.',
          en: 'Colonial-era building that now houses the People’s Municipal Assembly (APC) of Batna, rue Nouara Ahmed. Construction date to be confirmed.',
        },
      },
    ],
  },
  {
    commune: 'Tazoult',
    nom: { fr: 'Lambèse (Lambaesis)', ar: 'لامبيز (لامبايزيس)', en: 'Lambaesis (Lambèse)' },
    adresse: { fr: 'Tazoult, wilaya de Batna', ar: 'تازولت، ولاية باتنة', en: 'Tazoult, Batna province' },
    latitude: 35.488889, longitude: 6.255833,
    typePatrimoine: 'site_archeologique',
    detail: {
      description: {
        fr: 'À Tazoult, à une dizaine de kilomètres au sud-est de Batna, les vestiges du grand camp de la IIIe Légion Auguste, l’armée romaine d’Afrique, et de la ville qui grandit autour de lui.',
        ar: 'في تازولت، على بعد نحو عشرة كيلومترات جنوب شرق باتنة، بقايا المعسكر الكبير للفيلق الثالث الأوغسطي، جيش روما في إفريقيا، والمدينة التي نشأت حوله.',
        en: 'In Tazoult, about ten kilometres south-east of Batna, the remains of the great camp of the Third Augustan Legion, Rome’s army in Africa, and of the town that grew around it.',
      },
      histoire: {
        fr: 'Le camp de la IIIe Légion Auguste semble avoir été installé entre 123 et 129, sous l’empereur Hadrien. Hadrien le visite en 128 : son discours aux soldats a été retrouvé gravé sur un pilier. Autour du camp naît une ville, devenue municipe, probablement lorsqu’elle devient capitale de la Numidie.\n\nL’empereur Gordien III dissout la légion ; Valérien et Gallien la rétablissent dans les années 250. Sous Dioclétien, Lambèse est la capitale de la Numidie militaire.\n\nÀ l’époque coloniale, une partie du camp est occupée par un pénitencier et ses jardins.',
        ar: 'يبدو أن معسكر الفيلق الثالث الأوغسطي أُقيم بين سنتي 123 و129 في عهد الإمبراطور هادريان، الذي زاره سنة 128، وعُثر على خطابه إلى الجنود منقوشًا على عمود. ونشأت حول المعسكر مدينة صارت بلدية، ربما حين أصبحت عاصمة نوميديا.\n\nحلّ الإمبراطور غورديانوس الثالث الفيلق، ثم أعاده فاليريانوس وغالينوس في خمسينيات القرن الثالث. وفي عهد ديوقلديانوس كانت لامبيز عاصمة نوميديا العسكرية.\n\nوفي الحقبة الاستعمارية شغل سجنٌ وحدائقه جزءًا من المعسكر.',
        en: 'The camp of the Third Augustan Legion seems to have been set up between 123 and 129, under Emperor Hadrian. Hadrian visited in 128: his address to the soldiers was found inscribed on a pillar. A town grew around the camp and became a municipium, probably when it became the capital of Numidia.\n\nEmperor Gordian III disbanded the legion; Valerian and Gallienus restored it in the 250s. Under Diocletian, Lambaesis was the capital of Military Numidia.\n\nIn colonial times, part of the camp was occupied by a penitentiary and its gardens.',
      },
      referencesHistoriques: sources('Sources :\n• Wikipédia, « Lambaesis » et « Legio III Augusta »\n• Wikimedia Commons, catégories « Praetorium de Lambèse », « Amphitheatre (Lambaesis) », « Arch of Septimius Severus (Lambaesis) », « Museum of Archaeological site of Lambese » (positions)'),
    },
    points: [
      {
        commune: 'Tazoult', typePatrimoine: 'site_archeologique', latitude: 35.49021, longitude: 6.25471,
        nom: { fr: 'Quartier général du camp, dit « praetorium »', ar: 'مقر قيادة المعسكر، المعروف بـ«البريتوريوم»', en: 'Camp headquarters, known as the "praetorium"' },
        description: {
          fr: 'Le monument le plus imposant de Lambèse, au centre du camp. On l’appelle couramment « praetorium », à tort : c’est le bâtiment du quartier général (principia), daté de 268. Sa façade sud garde un péristyle de colonnes ioniques et de pilastres corinthiens.',
          ar: 'أضخم معالم لامبيز، في وسط المعسكر. يُسمّى عادةً «البريتوريوم» خطأً، وهو في الحقيقة مبنى مقر القيادة (البرينسيبيا) ويعود إلى سنة 268. وتحتفظ واجهته الجنوبية برواق من أعمدة أيونية وأعمدة جدارية كورنثية.',
          en: 'The most imposing monument of Lambaesis, at the centre of the camp. It is commonly but wrongly called the "praetorium": it is the headquarters building (principia), dated 268. Its south façade keeps a peristyle of Ionic columns and Corinthian pilasters.',
        },
      },
      {
        commune: 'Tazoult', typePatrimoine: 'site_archeologique', latitude: 35.48927, longitude: 6.25988,
        nom: { fr: 'Amphithéâtre de Lambèse', ar: 'مدرج لامبيز', en: 'Amphitheatre of Lambaesis' },
        description: {
          fr: 'Vestiges de l’amphithéâtre de la ville romaine, à l’est du camp.',
          ar: 'بقايا مدرج المدينة الرومانية، شرق المعسكر.',
          en: 'Remains of the Roman town’s amphitheatre, east of the camp.',
        },
      },
      {
        commune: 'Tazoult', typePatrimoine: 'site_archeologique', latitude: 35.48696, longitude: 6.2604,
        nom: { fr: 'Arc de Septime Sévère', ar: 'قوس سبتيموس سيفيروس', en: 'Arch of Septimius Severus' },
        description: {
          fr: 'Arc de triomphe dédié à l’empereur Septime Sévère. Des mosaïques ont été découvertes près de l’arc en 1905. Lambèse compte aussi un arc dédié à Commode.',
          ar: 'قوس نصر مُهدى إلى الإمبراطور سبتيموس سيفيروس. وقد اكتُشفت فسيفساء بالقرب منه سنة 1905. وفي لامبيز أيضًا قوس مُهدى إلى كومودوس.',
          en: 'Triumphal arch dedicated to Emperor Septimius Severus. Mosaics were found near the arch in 1905. Lambaesis also has an arch dedicated to Commodus.',
        },
      },
      {
        commune: 'Tazoult', typePatrimoine: 'musee', latitude: 35.4817, longitude: 6.25774,
        nom: { fr: 'Musée de Lambèse', ar: 'متحف لامبيز', en: 'Lambaesis Museum' },
        description: {
          fr: 'Petit musée de Tazoult qui réunit les objets antiques découverts aux environs, dont une collection d’inscriptions exceptionnelle. Position à vérifier sur place.',
          ar: 'متحف صغير في تازولت يجمع القطع الأثرية المكتشفة في المنطقة، ومنها مجموعة استثنائية من النقوش. يُرجى التحقق من الموقع ميدانيًا.',
          en: 'Small museum in Tazoult holding antiquities found nearby, including an exceptional collection of inscriptions. Location to be checked on site.',
        },
      },
    ],
  },
  {
    commune: 'Boumia',
    nom: { fr: 'Imedghassen (Medracen), mausolée royal numide', ar: 'إمدغاسن، الضريح الملكي النوميدي', en: 'Imedghassen (Medracen), Numidian royal mausoleum' },
    adresse: { fr: 'Commune de Boumia, daïra d’El Madher, wilaya de Batna', ar: 'بلدية بومية، دائرة المعذر، ولاية باتنة', en: 'Boumia municipality, El Madher district, Batna province' },
    latitude: 35.7071, longitude: 6.4346,
    typePatrimoine: 'site_archeologique',
    detail: {
      description: {
        fr: 'Tombeau monumental des rois numides, dressé dans la plaine au nord-est de Batna. Le plus ancien des grands mausolées royaux en forme de tumulus d’Afrique du Nord.',
        ar: 'ضريح ضخم لملوك نوميديا، قائم في السهل شمال شرق باتنة، وهو أقدم الأضرحة الملكية الكبرى على شكل ركام في شمال إفريقيا.',
        en: 'Monumental tomb of the Numidian kings, rising on the plain north-east of Batna. The oldest of the great tumulus-shaped royal mausoleums of North Africa.',
      },
      histoire: {
        fr: 'Mausolée royal du royaume numide, daté selon les sources entre le IVe et le IIe siècle avant notre ère ; certains le rattachent à l’époque du roi Massinissa (202-148 av. J.-C.). Il est plus ancien que le Mausolée royal de Maurétanie, près de Tipaza.\n\nC’est un tumulus en pierre de taille, entouré à sa base de soixante colonnes doriques engagées et d’une corniche de style égyptien, couronné de gradins.',
        ar: 'ضريح ملكي للمملكة النوميدية، يؤرَّخ حسب المصادر بين القرنين الرابع والثاني قبل الميلاد، ويربطه بعضهم بعهد الملك ماسينيسا (202-148 ق.م). وهو أقدم من الضريح الملكي الموريتاني قرب تيبازة.\n\nبُني ركامًا من الحجارة المنحوتة، تحيط بقاعدته ستون عمودًا دوريًا ملتصقًا وإفريز على الطراز المصري، ويعلوه مدرّج.',
        en: 'Royal mausoleum of the Numidian kingdom, dated by sources between the 4th and 2nd centuries BC; some link it to the time of King Masinissa (202-148 BC). It is older than the Royal Mausoleum of Mauretania, near Tipasa.\n\nIt is a tumulus of cut stone, ringed at its base by sixty engaged Doric columns and an Egyptian-style cornice, topped with steps.',
      },
      infos_pratiques: {
        fr: 'Monument protégé depuis 1968 (Journal officiel du 23 janvier 1968). Une étude de valorisation et de sécurisation du site est en cours (2026). Des travaux de « réparation » passés ont été critiqués par l’ICOMOS pour leur manque de respect de l’authenticité du monument.',
        ar: 'معلم محمي منذ 1968 (الجريدة الرسمية، 23 جانفي 1968). وتجري دراسة لتثمين الموقع وتأمينه (2026). وقد انتقدت إيكوموس أشغال «ترميم» سابقة لعدم احترامها أصالة المعلم.',
        en: 'Protected monument since 1968 (Official Journal, 23 January 1968). A study to enhance and secure the site is under way (2026). Past "repair" work was criticised by ICOMOS for not respecting the monument’s authenticity.',
      },
      referencesHistoriques: sources('Sources :\n• Wikipédia, « Medracen »\n• APS, « Bendouda insiste sur la finalisation de l’étude… du site archéologique d’Imedghassen » (2026)\n• Algérie Éco, « Des experts américains examinent l’état du mausolée d’Imedghassen » (29 août 2023)'),
    },
  },
  {
    commune: 'Oued Chaaba',
    nom: { fr: 'Parc national de Belezma', ar: 'الحظيرة الوطنية لبلزمة', en: 'Belezma National Park' },
    adresse: { fr: 'Monts du Belezma, au nord-ouest de Batna', ar: 'جبال بلزمة، شمال غرب باتنة', en: 'Belezma mountains, north-west of Batna' },
    latitude: 35.604378, longitude: 6.084898,
    typePatrimoine: 'site_naturel',
    detail: {
      description: {
        fr: 'Montagnes couvertes de cèdres de l’Atlas et de pins d’Alep aux portes de Batna, entre influences méditerranéennes et sahariennes.',
        ar: 'جبال تكسوها أشجار الأرز الأطلسي والصنوبر الحلبي على أبواب باتنة، بين التأثيرات المتوسطية والصحراوية.',
        en: 'Mountains covered with Atlas cedar and Aleppo pine at the gates of Batna, between Mediterranean and Saharan influences.',
      },
      histoire: {
        fr: 'Le parc a été créé par le décret n° 84-326 du 3 novembre 1984, en même temps que les parcs nationaux de Gouraya et de Taza, pour protéger le cèdre de l’Atlas (Cedrus atlantica), espèce propre à l’Afrique du Nord. L’Aurès-Belezma réunit les plus vastes forêts de cèdres d’Algérie, à la limite sud de l’aire de l’espèce.',
        ar: 'أُنشئت الحظيرة بالمرسوم رقم 84-326 المؤرخ في 3 نوفمبر 1984، في الوقت نفسه مع حظيرتي قورايا وتازة، لحماية الأرز الأطلسي، وهو نوع خاص بشمال إفريقيا. وتضمّ الأوراس-بلزمة أوسع غابات الأرز في الجزائر، عند الحد الجنوبي لانتشار هذا النوع.',
        en: 'The park was created by Decree No. 84-326 of 3 November 1984, together with the Gouraya and Taza national parks, to protect the Atlas cedar (Cedrus atlantica), a species native to North Africa. Aurès-Belezma holds Algeria’s largest cedar forests, at the southern limit of the species’ range.',
      },
      infos_pratiques: {
        fr: 'Une étude par télédétection a relevé une dégradation sur une grande partie de la surface du parc entre 1987 et 2014 : respecter les sentiers, ne pas faire de feu. La superficie diffère selon les sources ; elle n’est pas indiquée ici faute de texte officiel consulté.',
        ar: 'رصدت دراسة بالاستشعار عن بعد تدهورًا في جزء كبير من مساحة الحظيرة بين 1987 و2014: يُرجى احترام المسالك وعدم إشعال النار. وتختلف المساحة بين المصادر، ولم تُذكر هنا لعدم الاطلاع على نص رسمي.',
        en: 'A remote-sensing study found degradation over a large part of the park between 1987 and 2014: keep to the trails and do not light fires. The area differs between sources and is not given here, as no official text was consulted.',
      },
      referencesHistoriques: sources('Sources :\n• Décret n° 84-326 du 3 novembre 1984 (FAOLEX) : https://faolex.fao.org/docs/pdf/alg78780.pdf\n• Wikipédia, « Belezma National Park »\n• Coordonnées : OpenStreetMap'),
    },
  },
];

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    await creerSites(queryInterface, SITES, { wilayaId: 5, idCreateur: await administrateur(select, ID_ADMIN_CHOISI) });
  },

  async down(queryInterface) {
    await retirerSites(queryInterface, SITES);
  },

  _SITES: SITES,
};
