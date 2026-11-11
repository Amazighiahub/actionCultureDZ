'use strict';

/**
 * Migration : lieux de Yennayer dans la wilaya de Tlemcen, préparés pour l'équipe (relecture avant publication).
 *
 * Deux sites et leurs points de visite :
 * - Beni Snous, berceau du carnaval Ayred : Khémis, El Fahs, Tafessera, Beni Bahdel
 * - Tlemcen, Agadir et Tagrart : minaret d'Agadir, Grande Mosquée de Tlemcen
 *
 * Tout est créé en BROUILLON (invisible du public) avec, pour chaque site, une proposition « creation » dans
 * la file de l'équipe (Propositions patrimoine). L'accepter publie le site et ses points (propositionsLieu.js).
 * Les lieux sont rattachés au premier compte administrateur actif (ils apparaissent dans « Mes sites »).
 *
 * Textes : fr, ar, en, rédigés à partir de sources publiques citées dans « Références historiques ».
 * Noms en tamazight (latin, tifinagh) : seulement ceux d'OpenStreetMap, à faire relire. Aucune photo.
 *
 * Rejouable : un lieu déjà présent (même nom français dans la même commune) n'est pas recréé.
 * Descente : retire seulement les lieux créés ici et restés en brouillon (rien de ce qui a été publié).
 */

const SOURCES = {
  fr: 'Sources :\n'
    + '• Radio Algérie (APS), « Carnaval Ayrad à Beni Snouss » : https://news.radioalgerie.dz/fr/node/19911\n'
    + '• Algérie 360, « Cinq stations au pays des Beni Snous » (24 janvier 2019) : https://www.algerie360.com/amazighite-cinq-stations-au-pays-des-beni-snous/\n'
    + '• Algérie 360, « Les Tlemcéniens se préparent à Yennayer » (8 janvier 2018) : https://www.algerie360.com/yennayer-tlemceniens-se-preparent-a-celebration-nouvel-an-amazigh/\n'
    + '• Abdelkrim Benaïssa (Université Abou Bekr Belkaïd), « Héritage d’Ayrad, pratique et adaptation théâtrale »\n'
    + '• Coordonnées : OpenStreetMap',
};
SOURCES.ar = SOURCES.fr.replace('Sources :', 'المصادر:');
SOURCES.en = SOURCES.fr.replace('Sources :', 'Sources:');

const SOURCES_TLEMCEN = {
  fr: 'Sources :\n'
    + '• Wikipédia, « Great Mosque of Agadir » et « Great Mosque of Tlemcen »\n'
    + '• Algérie 360, « Les Tlemcéniens se préparent à Yennayer » (8 janvier 2018) : https://www.algerie360.com/yennayer-tlemceniens-se-preparent-a-celebration-nouvel-an-amazigh/\n'
    + '• Algérie 360, « Exposition de plats culinaires populaires à l’occasion de Yennayer à Tlemcen »',
};
SOURCES_TLEMCEN.ar = SOURCES_TLEMCEN.fr.replace('Sources :', 'المصادر:');
SOURCES_TLEMCEN.en = SOURCES_TLEMCEN.fr.replace('Sources :', 'Sources:');

const SITES = [
  {
    commune: 'Beni Snous',
    nom: { fr: 'Beni Snous, berceau du carnaval Ayred', ar: 'بني سنوس، مهد كرنفال أيراد', en: 'Beni Snous, cradle of the Ayred carnival', 'tz-tfng': 'ⴱⴻⵏⵉ ⵙⴻⵏⵏⵓⵙ' },
    adresse: { fr: 'Daïra de Beni Snous, haute vallée de la Tafna, wilaya de Tlemcen', ar: 'دائرة بني سنوس، أعالي وادي تافنة، ولاية تلمسان', en: 'Beni Snous district, upper Tafna valley, Tlemcen province' },
    latitude: 34.661777, longitude: -1.542864,
    typePatrimoine: 'ville_village',
    detail: {
      description: {
        fr: 'Vallées et villages amazighs des monts de Tlemcen, Beni Snous est connu dans toute l’Algérie pour Ayred, le carnaval du nouvel an amazigh (Yennayer), le soir du 12 janvier.',
        ar: 'وديان وقرى أمازيغية في جبال تلمسان، تشتهر بني سنوس في كل الجزائر بأيراد، كرنفال رأس السنة الأمازيغية (يناير)، مساء 12 جانفي.',
        en: 'Amazigh valleys and villages in the Tlemcen mountains, Beni Snous is known across Algeria for Ayred, the carnival of the Amazigh New Year (Yennayer), on the evening of 12 January.',
      },
      histoire: {
        fr: 'Les Beni Snous occupent les plateaux calcaires de la haute Tafna, à l’ouest-sud-ouest de Tlemcen. Les ruines de nombreux villages témoignent d’un peuplement ancien, plus dense avant le XIIIe siècle. Khémis, Beni Achir et Ouled Moussa gardent des mosquées anciennes aux minarets de brique ; les maisons traditionnelles sont bâties en pierre sèche sur les pentes des vallées.\n\nAyred, « le lion » en tamazight, y célèbre Yennayer depuis des générations. Le carnaval, interrompu un temps dans les années 1990, a repris et attire chaque année jusqu’à 3 000 visiteurs. Selon la tradition locale, ses origines seraient très anciennes ; aucune date n’est établie.',
        ar: 'تسكن بني سنوس الهضاب الكلسية لأعالي وادي تافنة، غرب جنوب غرب تلمسان. وتشهد أطلال قرى عديدة على استيطان قديم كان أكثف قبل القرن الثالث عشر. وتحتفظ الخميس وبني عشير وأولاد موسى بمساجد قديمة بمآذن من الآجر، وتُبنى البيوت التقليدية بالحجر الجاف على سفوح الوديان.\n\nأيراد، أي «الأسد» بالأمازيغية، يحتفي هنا بيناير منذ أجيال. توقّف الكرنفال فترة في التسعينيات ثم عاد، ويستقطب كل عام ما يصل إلى 3000 زائر. وحسب التقاليد المحلية فإن أصوله قديمة جدًا، دون تاريخ مثبت.',
        en: 'The Beni Snous live on the limestone plateaus of the upper Tafna, west-south-west of Tlemcen. Ruins of many villages show an old settlement, denser before the 13th century. Khémis, Beni Achir and Ouled Moussa keep old mosques with brick minarets; traditional houses are built of dry stone on the valley slopes.\n\nAyred, "the lion" in Tamazight, has celebrated Yennayer here for generations. The carnival paused in the 1990s, then returned, and draws up to 3,000 visitors a year. Local tradition gives it very old origins; no date is established.',
      },
      traditions: {
        fr: 'Le soir du 12 janvier, des jeunes portent des masques d’animaux et des peaux de mouton et de chèvre. Ils jouent des scènes dans les ruelles (« Ayradiat Droub ») puis entrent dans les cours des maisons (« Ayradiat Tadrat »), avec contes et anecdotes. Les vivres récoltés de porte en porte sont redistribués discrètement aux familles pauvres.\n\nLe vainqueur d’un combat entre jeunes masqués reçoit le masque du lion et le titre d’« Amokrane ». Une femme joue la sage-femme « Mqadma », qui présente le lionceau nouveau-né, « Ameziane ». Le masque du loup n’est jamais porté : il symbolise la ruse.\n\nLe carnaval change de nom selon le village : « Chakh » à Tafessera, « Hammar Kermous » à Beni Bahdel, « Grande Ayradya » à El-Khemis. À El Fahs, des femmes accueillent les visiteurs au chant « Essaf ».',
        ar: 'مساء 12 جانفي، يلبس الشباب أقنعة الحيوانات وجلود الغنم والماعز، ويؤدّون مشاهد في الأزقة («أيراديات الدروب») ثم يدخلون أفنية البيوت («أيراديات تادرت») مع الحكايات والنوادر. وتُوزَّع المؤونة التي تُجمع من بيت إلى بيت سرًّا على العائلات الفقيرة.\n\nيفوز المنتصر في مبارزة بين الشباب المقنّعين بقناع الأسد ولقب «أمقران». وتؤدّي امرأة دور القابلة «المقدّمة» التي تقدّم الشبل المولود «أمزيان». ولا يُلبس قناع الذئب أبدًا لأنه رمز المكر.\n\nيتغيّر اسم الكرنفال من قرية إلى أخرى: «الشّاخ» في تافسرة، و«حمّار كرموس» في بني بهدل، و«الأيرادية الكبرى» في الخميس. وفي الفحص تستقبل النساء الزوار بغناء «الصّف».',
        en: 'On the evening of 12 January, young people wear animal masks and sheep and goat skins. They act out scenes in the lanes ("Ayradiat Droub"), then enter the courtyards of houses ("Ayradiat Tadrat") with tales and anecdotes. Food collected door to door is quietly shared with poor families.\n\nThe winner of a fight between masked youths receives the lion mask and the title "Amokrane". A woman plays the midwife "Mqadma", who presents the newborn lion cub, "Ameziane". The wolf mask is never worn: it stands for cunning.\n\nThe carnival changes name from village to village: "Chakh" in Tafessera, "Hammar Kermous" in Beni Bahdel, "Grande Ayradya" in El-Khemis. In El Fahs, women welcome visitors with the "Essaf" song.',
      },
      gastronomie: {
        fr: 'Pour Yennayer : berkoukès, m’semen, trid, r’fiss, ma’qoud, ma’tlou’, mel’oui, galettes piquées d’amandes et de noix, fruits secs, olives et huile d’olive de la récolte de janvier, qui fait la réputation de Beni Bahdel, Azaïl-Tafessera et Khémis.',
        ar: 'في يناير: البركوكس والمسمّن والتريد والرفيس والمعقود والمطلوع والملوي، والكسرة المرصّعة باللوز والجوز، والفواكه الجافة، والزيتون وزيت الزيتون من جني جانفي الذي تشتهر به بني بهدل والعزايل-تافسرة والخميس.',
        en: 'For Yennayer: berkoukès, m’semen, trid, r’fiss, ma’qoud, ma’tlou’, mel’oui, flatbreads studded with almonds and walnuts, dried fruit, olives and olive oil from the January harvest, for which Beni Bahdel, Azaïl-Tafessera and Khémis are known.',
      },
      infos_pratiques: {
        fr: 'Ayred : le soir du 12 janvier, surtout à Khémis. Beni Bahdel est à une quarantaine de kilomètres au sud de Tlemcen. Hébergement rare dans la vallée : prévoir de dormir à Tlemcen ou à Sebdou.',
        ar: 'أيراد: مساء 12 جانفي، خاصة في الخميس. تقع بني بهدل على بعد نحو أربعين كيلومترًا جنوب تلمسان. الإيواء نادر في الوادي: يُستحسن المبيت في تلمسان أو سبدو.',
        en: 'Ayred: the evening of 12 January, mainly in Khémis. Beni Bahdel is about forty kilometres south of Tlemcen. Lodging is scarce in the valley: plan to stay in Tlemcen or Sebdou.',
      },
      referencesHistoriques: SOURCES,
    },
    points: [
      {
        commune: 'Beni Snous', typePatrimoine: 'ville_village', latitude: 34.642211, longitude: -1.561444,
        nom: { fr: 'Khémis', ar: 'الخميس', en: 'Khémis', 'tz-tfng': 'ⵅⵎⵉⵙ' },
        description: {
          fr: 'Village présenté comme le vrai chef-lieu des Beni Snous. Sa place centrale accueille Ayred, le soir du 12 janvier ; on l’y appelle « Grande Ayradya ». Le village garde une mosquée ancienne au minaret de brique.',
          ar: 'قرية تُقدَّم على أنها العاصمة الحقيقية لبني سنوس. تحتضن ساحتها الوسطى أيراد مساء 12 جانفي، ويُسمّى فيها «الأيرادية الكبرى». وتحتفظ القرية بمسجد قديم بمئذنة من الآجر.',
          en: 'A village described as the true heart of Beni Snous. Its central square hosts Ayred on the evening of 12 January, known here as "Grande Ayradya". The village keeps an old mosque with a brick minaret.',
        },
      },
      {
        commune: 'Beni Snous', typePatrimoine: 'ville_village', latitude: 34.662697, longitude: -1.539298,
        nom: { fr: 'El Fahs', ar: 'الفحص', en: 'El Fahs' },
        description: {
          fr: 'Chef-lieu de la commune de Beni Snous. Les visiteurs de Yennayer y sont accueillis par des femmes au chant « Essaf », autour d’une collation de Yennayer.',
          ar: 'مقرّ بلدية بني سنوس. يُستقبل فيه زوار يناير بغناء «الصّف» الذي تؤدّيه النساء، حول مائدة يناير.',
          en: 'Seat of the Beni Snous municipality. Yennayer visitors are welcomed here by women singing "Essaf", around a Yennayer meal.',
        },
      },
      {
        commune: 'Azail', typePatrimoine: 'ville_village', latitude: 34.679628, longitude: -1.445916,
        nom: { fr: 'Tafessera', ar: 'تافسرة', en: 'Tafessera', 'tz-tfng': 'ⵜⴰⴼⵙⵔⴰ' },
        description: {
          fr: 'Peut-être le plus ancien village de la région : vieux oliviers, mosquée ancienne et son minaret, cimetière aux tombes creusées dans le travertin, source Zerrab et grottes. Ayred s’y appelle « Chakh ». Selon les habitants, le village aurait été la capitale d’un roi berbère ; ce récit n’est pas établi.',
          ar: 'ربما أقدم قرية في المنطقة: زيتون معمّر، ومسجد قديم بمئذنته، ومقبرة بقبور محفورة في الصخر الكلسي، ونبع زرّاب، ومغارات. ويُسمّى فيها أيراد «الشّاخ». ويروي السكان أنها كانت عاصمة ملك أمازيغي، وهي رواية غير مثبتة.',
          en: 'Perhaps the oldest village in the area: ancient olive trees, an old mosque and its minaret, a cemetery with graves cut into travertine, the Zerrab spring and caves. Ayred is called "Chakh" here. Residents say the village was the capital of a Berber king; this account is not established.',
        },
      },
      {
        commune: 'Beni Bahdel', typePatrimoine: 'ville_village', latitude: 34.693744, longitude: -1.518701,
        nom: { fr: 'Beni Bahdel', ar: 'بني بهدل', en: 'Beni Bahdel', 'tz-tfng': 'ⴱⴻⵏⵉ ⴱⴻⵀⴷⴻⵍ' },
        description: {
          fr: 'Localité de montagne, à une quarantaine de kilomètres au sud de Tlemcen, où d’anciens métiers artisanaux rythment encore la vie. Yennayer y coïncide avec la récolte des olives. Ayred s’y appelle « Hammar Kermous ».',
          ar: 'بلدة جبلية على بعد نحو أربعين كيلومترًا جنوب تلمسان، لا تزال الحِرف القديمة تطبع حياتها. ويتزامن فيها يناير مع جني الزيتون. ويُسمّى فيها أيراد «حمّار كرموس».',
          en: 'A mountain town about forty kilometres south of Tlemcen, where old crafts still shape daily life. Yennayer coincides here with the olive harvest. Ayred is called "Hammar Kermous" here.',
        },
      },
    ],
  },
  {
    commune: 'Tlemcen',
    nom: { fr: 'Tlemcen : Agadir et Tagrart, aux origines amazighes de la ville', ar: 'تلمسان: أقادير وتاقرارت، الجذور الأمازيغية للمدينة', en: 'Tlemcen: Agadir and Tagrart, the Amazigh roots of the city', 'tz-tfng': 'ⵜⵍⵎⵙⴰⵏ' },
    adresse: { fr: 'Tlemcen, wilaya de Tlemcen', ar: 'تلمسان، ولاية تلمسان', en: 'Tlemcen, Tlemcen province' },
    latitude: 34.8837, longitude: -1.3105,
    typePatrimoine: 'ville_village',
    detail: {
      description: {
        fr: 'Les deux noms amazighs de Tlemcen racontent son histoire : Agadir, « le grenier fortifié », et Tagrart, « le camp ». La ville célèbre Yennayer en famille, la nuit du 11 au 12 janvier.',
        ar: 'يروي اسما تلمسان الأمازيغيان تاريخها: أقادير أي «المخزن المحصّن»، وتاقرارت أي «المعسكر». وتحتفي المدينة بيناير في العائلة ليلة 11 إلى 12 جانفي.',
        en: 'Tlemcen’s two Amazigh names tell its story: Agadir, "the fortified granary", and Tagrart, "the camp". The city celebrates Yennayer with family on the night of 11 to 12 January.',
      },
      histoire: {
        fr: 'L’épigraphie latine donne le nom antique de la ville, Pomaria. Agadir s’établit sur ses ruines ; Idris Ier y fonde une mosquée vers 790. En 1082, l’Almoravide Youssef Ibn Tachfine fonde Tagrart, juste à l’ouest d’Agadir, et sa Grande Mosquée. La fusion des deux villes, achevée sous les Zianides, donne la Tlemcen d’aujourd’hui. Le nom de la ville est souvent rattaché à « Tilimsan », les sources.',
        ar: 'تكشف النقوش اللاتينية الاسم القديم للمدينة، بوماريا. وقامت أقادير على أطلالها، وأسّس فيها إدريس الأول مسجدًا نحو سنة 790. وفي سنة 1082 أسّس المرابطي يوسف بن تاشفين تاقرارت غرب أقادير مباشرة، ومعها جامعها الكبير. ومن اندماج المدينتين، الذي اكتمل في عهد الزيانيين، وُلدت تلمسان الحالية. ويُرجَّع اسم المدينة غالبًا إلى «تيلمسان» أي الينابيع.',
        en: 'Latin inscriptions give the city’s ancient name, Pomaria. Agadir grew on its ruins; Idris I founded a mosque there around 790. In 1082 the Almoravid Yusuf ibn Tashfin founded Tagrart, just west of Agadir, with its Great Mosque. The merging of the two towns, completed under the Zayyanids, gave today’s Tlemcen. The city’s name is often linked to "Tilimsan", the springs.',
      },
      traditions: {
        fr: 'Les préparatifs commencent fin décembre : les boutiques se remplissent de fruits secs (amandes, noisettes, cacahuètes, pistaches, figues sèches) et de douceurs. La nuit du 11 au 12 janvier, la famille se réunit autour de la tbika de Yennayer. Chaque enfant reçoit sa part de friandises et un pain sucré garni d’un œuf. On raconte aux enfants la visite de « la vieille d’Ennayer », qui prendrait les friandises des enfants qui ne sont pas sages. Des plats sont aussi partagés avec les familles dans le besoin.',
        ar: 'تبدأ التحضيرات أواخر ديسمبر: تمتلئ المحلات بالفواكه الجافة (اللوز والبندق والفول السوداني والفستق والتين المجفف) والحلويات. وليلة 11 إلى 12 جانفي تجتمع العائلة حول «طبيقة» يناير، وينال كل طفل نصيبه من الحلوى وخبزًا محلّى تتوسّطه بيضة. ويُحكى للأطفال عن زيارة «عجوز الناير» التي تأخذ حلوى من لا يحسن السلوك. وتُقاسَم الأطباق أيضًا مع العائلات المحتاجة.',
        en: 'Preparations begin in late December: shops fill with dried fruit (almonds, hazelnuts, peanuts, pistachios, dried figs) and sweets. On the night of 11 to 12 January, the family gathers around the Yennayer tbika. Each child receives a share of sweets and a sweet bread with an egg. Children hear about the visit of "the old woman of Ennayer", who takes the sweets of children who misbehave. Dishes are also shared with families in need.',
      },
      gastronomie: {
        fr: 'Berkoukès et couscous de Yennayer, tbika de fruits secs et de friandises, pain sucré garni d’un œuf pour les enfants.',
        ar: 'البركوكس وكسكسي يناير، وطبيقة الفواكه الجافة والحلويات، والخبز المحلّى بالبيضة للأطفال.',
        en: 'Berkoukès and Yennayer couscous, a tbika of dried fruit and sweets, and sweet bread with an egg for children.',
      },
      referencesHistoriques: SOURCES_TLEMCEN,
    },
    points: [
      {
        commune: 'Tlemcen', typePatrimoine: 'edifice_religieux', latitude: 34.88917, longitude: -1.3,
        nom: { fr: 'Minaret d’Agadir', ar: 'مئذنة أقادير', en: 'Minaret of Agadir' },
        description: {
          fr: 'Seul vestige de la mosquée d’Agadir, fondée sous Idris Ier vers 790. Le minaret de brique, haut de 26,6 m, a été achevé en 1283 sous le sultan zianide Yaghmoracen.',
          ar: 'الأثر الوحيد الباقي من مسجد أقادير الذي أُسّس في عهد إدريس الأول نحو سنة 790. اكتملت المئذنة المبنية بالآجر، وارتفاعها 26.6 مترًا، سنة 1283 في عهد السلطان الزياني يغمراسن.',
          en: 'The only remaining part of the Agadir mosque, founded under Idris I around 790. The 26.6 m brick minaret was completed in 1283 under the Zayyanid sultan Yaghmorasan.',
        },
      },
      {
        commune: 'Tlemcen', typePatrimoine: 'edifice_religieux', latitude: 34.8837, longitude: -1.3105,
        nom: { fr: 'Grande Mosquée de Tlemcen', ar: 'الجامع الكبير بتلمسان', en: 'Great Mosque of Tlemcen' },
        description: {
          fr: 'Fondée en 1082 par Youssef Ibn Tachfine avec la ville de Tagrart. Ali Ibn Youssef y ajoute la coupole nervurée devant le mihrab (1136) ; Yaghmoracen fait bâtir le minaret en 1236.',
          ar: 'أسّسها يوسف بن تاشفين سنة 1082 مع مدينة تاقرارت. وأضاف إليها علي بن يوسف القبة المضلّعة أمام المحراب (1136)، وبنى يغمراسن المئذنة سنة 1236.',
          en: 'Founded in 1082 by Yusuf ibn Tashfin together with the town of Tagrart. Ali ibn Yusuf added the ribbed dome before the mihrab (1136); Yaghmorasan built the minaret in 1236.',
        },
      },
    ],
  },
];

const { administrateur, creerSites, retirerSites } = require('../utils/lieuxPrepares');

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    await creerSites(queryInterface, SITES, { wilayaId: 13, idCreateur: await administrateur(select) });
  },

  async down(queryInterface) {
    // Descente étroite : brouillons de la wilaya de Tlemcen (13) créés ici, sans propriétaire (cas de la
    // production, rattachés ensuite par 20261211 dont la descente les rend sans propriétaire) ou au compte
    // administrateur pris par cette migration ou par 20261211 (n° 75 choisi)
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    const createurs = [null, await administrateur(select), await administrateur(select, 75)];
    await retirerSites(queryInterface, SITES, { wilayaId: 13, createurs });
  },

  _SITES: SITES,
};
