'use strict';

/**
 * Migration : Tlemcen et ses points de visite, chacun complet (demande de la responsable du site).
 * - Le site « Tlemcen : Agadir et Tagrart… » devient simplement « Tlemcen » (la ville).
 * - Le point « Minaret d'Agadir » devient « Site archéologique d'Agadir et son minaret » (site archéologique à
 *   ciel ouvert : vestiges romains et médiévaux, fondations, restes de remparts, minaret), avec son histoire et ses sources.
 * - La Grande Mosquée reçoit aussi son histoire et ses sources.
 *
 * Ne touche qu'un lieu qui porte encore le nom français mis par 20261210-lieux-yennayer-tlemcen.js (un lieu
 * renommé à la main depuis n'est pas écrasé). Rejouable. Descente : remet les noms, types et textes d'avant (l'histoire de la Grande Mosquée est gardée).
 */
const SITE_AVANT = 'Tlemcen : Agadir et Tagrart, aux origines amazighes de la ville';
const AGADIR_AVANT = 'Minaret d’Agadir';
const MOSQUEE = 'Grande Mosquée de Tlemcen';

const SOURCES_AGADIR = {
  fr: 'Sources :\n• Wikipédia, « Great Mosque of Agadir »\n• Archnet, « Minaret of Agadir » : https://archnet.org/sites/19409',
};
SOURCES_AGADIR.ar = SOURCES_AGADIR.fr.replace('Sources :', 'المصادر:');
SOURCES_AGADIR.en = SOURCES_AGADIR.fr.replace('Sources :', 'Sources:');
const SOURCES_MOSQUEE = { fr: 'Sources :\n• Wikipédia, « Great Mosque of Tlemcen »' };
SOURCES_MOSQUEE.ar = SOURCES_MOSQUEE.fr.replace('Sources :', 'المصادر:');
SOURCES_MOSQUEE.en = SOURCES_MOSQUEE.fr.replace('Sources :', 'Sources:');

const CHANGEMENTS = [
  {
    avant: SITE_AVANT,
    nom: { fr: 'Tlemcen', ar: 'تلمسان', en: 'Tlemcen', 'tz-tfng': 'ⵜⵍⵎⵙⴰⵏ' },
    detail: {
      description: {
        fr: 'Tlemcen, la ville des sources (« Tilimsan »), est née de deux noyaux aux noms amazighs : Agadir, le plus ancien, et Tagrart, « le camp ». La ville célèbre Yennayer en famille, la nuit du 11 au 12 janvier.',
        ar: 'تلمسان، مدينة الينابيع («تيلمسان»)، وُلدت من نواتين بأسماء أمازيغية: أقادير، وهي الأقدم، وتاقرارت أي «المعسكر». وتحتفي المدينة بيناير في العائلة ليلة 11 إلى 12 جانفي.',
        en: 'Tlemcen, the city of springs ("Tilimsan"), was born from two cores with Amazigh names: Agadir, the oldest, and Tagrart, "the camp". The city celebrates Yennayer with family on the night of 11 to 12 January.',
      },
    },
  },
  {
    avant: AGADIR_AVANT,
    nom: { fr: 'Site archéologique d’Agadir et son minaret', ar: 'موقع أقادير الأثري ومئذنته', en: 'Agadir archaeological site and its minaret', 'tz-tfng': 'ⴰⴳⴰⴷⵉⵔ' },
    typePatrimoine: 'site_archeologique',
    detail: {
      description: {
        fr: 'Plus ancien noyau de Tlemcen, Agadir (en tamazight : le mur d’enceinte, la forteresse ou le grenier fortifié) est un site archéologique à ciel ouvert sur les hauteurs de la ville. Il garde des vestiges romains et médiévaux, fondations et restes de remparts, et le minaret de brique de son ancienne mosquée.',
        ar: 'أقدم نواة لمدينة تلمسان، أقادير (بالأمازيغية: السور أو الحصن أو المخزن المحصّن) موقع أثري مفتوح على مرتفعات المدينة. يحتفظ ببقايا رومانية وأخرى من العصر الوسيط، أسس وبقايا أسوار، وبمئذنة مسجده القديم المبنية بالآجر.',
        en: 'Tlemcen’s oldest core, Agadir (in Tamazight: the enclosure wall, the fortress or the fortified granary) is an open-air archaeological site on the heights of the city. It keeps Roman and medieval remains, foundations and remnants of ramparts, and the brick minaret of its former mosque.',
      },
      histoire: {
        fr: 'Les inscriptions latines donnent le nom antique du lieu : Pomaria, poste romain. Agadir s’établit sur ses ruines. Idris Ier y fonde une mosquée du vendredi vers 790. Quand les Almoravides fondent Tagrart, juste à l’ouest, en 1082, Agadir devient peu à peu un faubourg de la ville. De la mosquée, il ne reste que le minaret de brique, haut de 26,6 m, achevé en 1283 sous le sultan zianide Yaghmoracen ; sa base repose sur des pierres taillées romaines réemployées, venues de Pomaria.',
        ar: 'تكشف النقوش اللاتينية الاسم القديم للموقع: بوماريا، وهي مركز روماني. وقامت أقادير على أطلالها، وأسّس فيها إدريس الأول مسجدًا جامعًا نحو سنة 790. ولمّا أسّس المرابطون تاقرارت غربها مباشرة سنة 1082، صارت أقادير شيئًا فشيئًا ضاحية للمدينة. ولم يبق من المسجد سوى المئذنة المبنية بالآجر، بارتفاع 26.6 مترًا، التي اكتملت سنة 1283 في عهد السلطان الزياني يغمراسن، وتقوم قاعدتها على حجارة رومانية منحوتة أُعيد استعمالها من بوماريا.',
        en: 'Latin inscriptions give the place’s ancient name: Pomaria, a Roman post. Agadir grew on its ruins. Idris I founded a Friday mosque there around 790. When the Almoravids founded Tagrart just to the west in 1082, Agadir gradually became a suburb of the city. Of the mosque only the 26.6 m brick minaret remains, completed in 1283 under the Zayyanid sultan Yaghmorasan; its base rests on reused Roman cut stones from Pomaria.',
      },
      referencesHistoriques: SOURCES_AGADIR,
    },
  },
  {
    avant: MOSQUEE,
    nom: null,
    detail: {
      histoire: {
        fr: 'Fondée en 1082 par l’émir almoravide Youssef Ibn Tachfine en même temps que la ville de Tagrart, à l’ouest d’Agadir. Son fils Ali Ibn Youssef la rénove et la décore : la coupole nervurée devant le mihrab est datée de 1136 par son inscription, et une clôture de bois sculpté de 1138 est aujourd’hui conservée dans un musée de Tlemcen. En 1236, le sultan Yaghmoracen, fondateur de la dynastie zianide, fait bâtir le minaret près de la cour et agrandit l’édifice vers le nord. La tradition lui attribue aussi le grand lustre de la salle de prière.',
        ar: 'أسّسها الأمير المرابطي يوسف بن تاشفين سنة 1082 مع مدينة تاقرارت، غرب أقادير. وجدّدها ابنه علي بن يوسف وزيّنها: تؤرّخ كتابة القبةَ المضلّعة أمام المحراب بسنة 1136، وتُحفظ اليوم في متحف بتلمسان مقصورة من الخشب المنحوت تعود إلى سنة 1138. وفي سنة 1236 بنى السلطان يغمراسن، مؤسس الدولة الزيانية، المئذنة قرب الصحن ووسّع البناء نحو الشمال، وتنسب إليه الرواية الثريا الكبيرة في قاعة الصلاة.',
        en: 'Founded in 1082 by the Almoravid emir Yusuf ibn Tashfin together with the town of Tagrart, west of Agadir. His son Ali ibn Yusuf renovated and decorated it: the ribbed dome before the mihrab is dated 1136 by its inscription, and a carved wooden screen from 1138 is now kept in a Tlemcen museum. In 1236 Sultan Yaghmorasan, founder of the Zayyanid dynasty, built the minaret near the courtyard and extended the building northward. Tradition also credits him with the great chandelier of the prayer hall.',
      },
      referencesHistoriques: SOURCES_MOSQUEE,
    },
  },
];

// État d'avant (pour la descente), repris de la migration qui a créé ces lieux
const creation = require('./20261210-lieux-yennayer-tlemcen');
const siteAvant = creation._SITES.find((s) => s.nom.fr === SITE_AVANT);
const AVANT = {
  [SITE_AVANT]: { nom: siteAvant.nom, typePatrimoine: siteAvant.typePatrimoine, detail: { description: siteAvant.detail.description } },
  [AGADIR_AVANT]: (() => {
    const p = siteAvant.points.find((x) => x.nom.fr === AGADIR_AVANT);
    return { nom: p.nom, typePatrimoine: p.typePatrimoine, detail: { description: p.description, histoire: {}, referencesHistoriques: {} } };
  })(),
  // Grande Mosquée : la descente garde son histoire (texte sourcé, et peut-être complété à la main depuis)
  [MOSQUEE]: { nom: null, detail: {} },
};

const nomFr = "JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr'))";

async function appliquer(s, nomActuel, { nom, typePatrimoine, detail }, siVide = false) {
  const [lieu] = await s.query(`SELECT id_lieu FROM lieu WHERE ${nomFr} = ? LIMIT 1`,
    { replacements: [nomActuel], type: s.QueryTypes.SELECT });
  if (!lieu) return;
  const champs = [];
  const valeurs = [];
  if (nom) { champs.push('nom = ?'); valeurs.push(JSON.stringify(nom)); }
  if (typePatrimoine) { champs.push('typePatrimoine = ?'); valeurs.push(typePatrimoine); }
  if (champs.length) {
    await s.query(`UPDATE lieu SET ${champs.join(', ')}, updatedAt = NOW() WHERE id_lieu = ?`, { replacements: [...valeurs, lieu.id_lieu] });
  }
  let cles = Object.keys(detail);
  if (siVide) {
    // Lieu non renommé (Grande Mosquée) : ne remplir qu'un texte encore vide, jamais écraser une saisie
    const [d] = await s.query(`SELECT ${cles.join(', ')} FROM detail_lieux WHERE id_lieu = ?`,
      { replacements: [lieu.id_lieu], type: s.QueryTypes.SELECT });
    const vide = (v) => { const o = typeof v === 'string' ? JSON.parse(v) : v; return !o || !Object.values(o).some((x) => String(x || '').trim()); };
    cles = d ? cles.filter((c) => vide(d[c])) : [];
  }
  if (cles.length) {
    await s.query(`UPDATE detail_lieux SET ${cles.map((c) => `${c} = ?`).join(', ')}, updatedAt = NOW() WHERE id_lieu = ?`,
      { replacements: [...cles.map((c) => JSON.stringify(detail[c])), lieu.id_lieu] });
  }
}

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    for (const c of CHANGEMENTS) await appliquer(s, c.avant, c, !c.nom);
  },

  async down(queryInterface) {
    const s = queryInterface.sequelize;
    for (const c of CHANGEMENTS) await appliquer(s, c.nom ? c.nom.fr : c.avant, AVANT[c.avant]);
  },
};
