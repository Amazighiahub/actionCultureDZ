'use strict';

/**
 * Migration : on peut signaler une erreur sur un site du patrimoine (audit V11 OUT-2, accord de la
 * responsable le 2026-11-13). Ajoute la valeur « lieu » au type des signalements.
 *
 * La liste actuelle est lue dans la base puis recopiée avec « lieu » en plus : aucune valeur existante
 * n'est retirée, aucune ligne n'est modifiée. Rejouable. down retire « lieu » seulement si aucun
 * signalement de lieu n'existe (sinon il refuse, pour ne rien perdre).
 */
const TABLE = 'signalements';
const COLONNE = 'type_entite';

async function valeursActuelles(q) {
  const [[ligne]] = await q.query(
    `SELECT COLUMN_TYPE AS type, IS_NULLABLE AS nul, COLUMN_COMMENT AS commentaire FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :colonne`,
    { replacements: { table: TABLE, colonne: COLONNE } }
  );
  if (!ligne) return null;
  const valeurs = [...String(ligne.type).matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  return { valeurs, nul: ligne.nul === 'YES', commentaire: ligne.commentaire || '' };
}

async function ecrire(q, { valeurs, nul, commentaire }) {
  const liste = valeurs.map((v) => q.escape(v)).join(', ');
  await q.query(`ALTER TABLE \`${TABLE}\` MODIFY \`${COLONNE}\` ENUM(${liste}) ${nul ? 'NULL' : 'NOT NULL'}${commentaire ? ` COMMENT ${q.escape(commentaire)}` : ''}`);
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const actuel = await valeursActuelles(q);
    if (!actuel || actuel.valeurs.includes('lieu')) return;
    await ecrire(q, { ...actuel, valeurs: [...actuel.valeurs, 'lieu'] });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const actuel = await valeursActuelles(q);
    if (!actuel || !actuel.valeurs.includes('lieu')) return;
    const [[{ n }]] = await q.query(`SELECT COUNT(*) AS n FROM \`${TABLE}\` WHERE \`${COLONNE}\` = 'lieu'`);
    if (Number(n) > 0) throw new Error(`${n} signalement(s) de lieu existent : retrait du type refusé pour ne rien perdre`);
    await ecrire(q, { ...actuel, valeurs: actuel.valeurs.filter((v) => v !== 'lieu') });
  }
};
