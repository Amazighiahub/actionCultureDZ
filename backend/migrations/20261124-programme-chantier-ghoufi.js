'use strict';

/**
 * Données : programme du Chantier-école de Ghoufi (2e édition, du 22 décembre 2026 au 2 janvier 2027),
 * repris du PDF de l'organisateur, en activités du programme (français et arabe).
 * Ne touche qu'à cet événement (nom contenant « Ghoufi », début le 22/12/2026), et seulement s'il
 * n'a encore aucune activité : rien n'est écrasé. Ailleurs (base vide, autre site), ne fait rien.
 * down : retire exactement ces activités.
 */
const ACTIVITES = [
  ['2026-12-22', '16:00:00', null, 'visite', 'Gare routière Mohamed Arar, Batna',
    'Arrivée', 'الوصول',
    'Rendez-vous à la gare routière Mohamed Arar de Batna, départ du bus vers Ghoufi à 16h00, installation et dîner d’accueil.',
    'الموعد بالمحطة البرية لنقل المسافرين محمد عرعار بباتنة، انطلاق الحافلة نحو غوفي على الساعة 16:00، ثم الاستقرار وعشاء الاستقبال.'],
  ['2026-12-23', null, null, 'visite', null,
    'Découverte', 'الاكتشاف',
    'Greniers d’Ath Mimoun et de Taourirt, Tachammest, village et mosquée de Ghoufi. Le soir : présentation du déroulement du chantier et constitution des équipes.',
    'مخازن آث ميمون وتاوريرت، تاشمّست، قرية غوفي ومسجدها. في المساء: تقديم سير الورشة وتكوين الفرق.'],
  ['2026-12-24', '07:00:00', '16:30:00', 'atelier', null,
    'Chantier (du 24 au 26 décembre)', 'الورشة (من 24 إلى 26 ديسمبر)',
    'Ouverture des deux ateliers, premières rotations des équipes. Chaque soir : poterie avec les potiers.',
    'افتتاح الورشتين وأولى دورات تناوب الفرق. كل مساء: الفخّار مع الحرفيين.'],
  ['2026-12-27', null, null, 'visite', 'Djemina (Tajmint)',
    'Repos et sortie à Djemina (Tajmint)', 'راحة وخرجة إلى جمينة (تاجمينت)',
    'Visite guidée de Djemina (Tajmint), refuge légendaire de la reine Dihya : gorges, habitats et greniers troglodytes accrochés à la falaise.',
    'زيارة مرشدة إلى جمينة (تاجمينت)، الملجأ الأسطوري للملكة ديهيا: مضائق ومساكن ومخازن كهفية معلّقة على الجرف.'],
  ['2026-12-28', '07:00:00', '16:30:00', 'atelier', null,
    'Chantier (du 28 au 30 décembre)', 'الورشة (من 28 إلى 30 ديسمبر)',
    'Suite des rotations : montée des murs, toiture, enduit et motifs. Chaque soir : poterie avec les potiers.',
    'مواصلة التناوب: رفع الجدران، السقف، الطلاء والزخارف. كل مساء: الفخّار مع الحرفيين.'],
  ['2026-12-31', null, null, 'ceremonie', null,
    'Clôture et réveillon', 'الاختتام وسهرة رأس السنة',
    'Dernière matinée de chantier, bilan, remise des attestations, repas du Nouvel An.',
    'آخر صبيحة في الورشة، الحصيلة، تسليم الشهادات، وعشاء رأس السنة.'],
  ['2027-01-01', null, null, 'visite', 'Menaâ',
    'Visite de Menaâ (facultative)', 'زيارة منعة (اختيارية)',
    'Maison traditionnelle, village et vallée. Facultative et non incluse dans les frais : prix précisé plus tard.',
    'منزل تقليدي، القرية والوادي. اختيارية وغير مشمولة في المصاريف: يُحدَّد السعر لاحقًا.'],
  ['2027-01-02', null, null, 'autre', null,
    'Départ', 'المغادرة',
    'Retour vers Batna.',
    'العودة نحو باتنة.']
];

async function evenementGhoufi(sequelize) {
  const lignes = await sequelize.query(
    `SELECT id_evenement FROM evenement
      WHERE CAST(nom_evenement AS CHAR) LIKE '%Ghoufi%' AND DATE(date_debut) = '2026-12-22'`,
    { type: sequelize.QueryTypes.SELECT });
  // Un seul événement doit correspondre ; sinon on ne touche à rien
  return lignes.length === 1 ? lignes[0].id_evenement : null;
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [tables] = await sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('evenement', 'programme')`);
    if (tables.length < 2) return;

    const id = await evenementGhoufi(sequelize);
    if (!id) return;
    const [{ n }] = await sequelize.query('SELECT COUNT(*) AS n FROM programme WHERE id_evenement = :id',
      { replacements: { id }, type: sequelize.QueryTypes.SELECT });
    if (Number(n) > 0) return; // l'organisateur a déjà saisi son programme : on n'ajoute rien

    const maintenant = new Date();
    await queryInterface.bulkInsert('programme', ACTIVITES.map(([date, debut, fin, type, lieu, titreFr, titreAr, descFr, descAr], i) => ({
      id_evenement: id,
      titre: JSON.stringify({ fr: titreFr, ar: titreAr }),
      description: JSON.stringify({ fr: descFr, ar: descAr }),
      date_programme: date,
      heure_debut: debut,
      heure_fin: fin,
      lieu_specifique: lieu,
      ordre: i + 1,
      statut: 'planifie',
      type_activite: type,
      langue_principale: 'fr',
      date_creation: maintenant,
      date_modification: maintenant
    })));
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [tables] = await sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('evenement', 'programme')`);
    if (tables.length < 2) return;
    const id = await evenementGhoufi(sequelize);
    if (!id) return;
    for (const [date, , , , , titreFr] of ACTIVITES) {
      await sequelize.query(`DELETE FROM programme WHERE id_evenement = :id AND date_programme = :date
          AND JSON_UNQUOTE(JSON_EXTRACT(titre, '$.fr')) = :titre`,
      { replacements: { id, date, titre: titreFr } });
    }
  }
};
