'use strict';

/**
 * Migration : un seul avis par membre et par service, garanti par la base (et plus seulement
 * par une vérification avant l'enregistrement, que deux envois simultanés pouvaient contourner).
 *
 * Les réponses et les avis supprimés ou refusés partagent la table : la colonne calculée
 * avis_service_actif vaut id_service pour un avis en vigueur (publié ou en attente) et NULL sinon ;
 * l'index unique (id_user, avis_service_actif) ignore les NULL.
 * Doublons déjà présents : le premier avis est gardé, les suivants passent en « supprime ».
 * Rejouable.
 */
const INDEX = 'uniq_commentaire_avis_service_membre';

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    const colonnes = await queryInterface.describeTable('commentaire').catch(() => null);
    if (!colonnes || !colonnes.id_service) return;

    await q(`UPDATE commentaire c
      JOIN (SELECT id_service, id_user, MIN(id_commentaire) AS garde FROM commentaire
            WHERE id_service IS NOT NULL AND commentaire_parent_id IS NULL AND statut IN ('publie', 'en_attente')
            GROUP BY id_service, id_user HAVING COUNT(*) > 1) d
        ON d.id_service = c.id_service AND d.id_user = c.id_user
      SET c.statut = 'supprime'
      WHERE c.commentaire_parent_id IS NULL AND c.statut IN ('publie', 'en_attente') AND c.id_commentaire <> d.garde`);

    if (!colonnes.avis_service_actif) {
      await q(`ALTER TABLE commentaire ADD COLUMN avis_service_actif INT
        GENERATED ALWAYS AS (CASE WHEN commentaire_parent_id IS NULL AND statut IN ('publie', 'en_attente') THEN id_service END) VIRTUAL`);
    }
    const [index] = await q(`SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire' AND INDEX_NAME = '${INDEX}'`);
    if (!index.length) {
      await q(`ALTER TABLE commentaire ADD UNIQUE INDEX ${INDEX} (id_user, avis_service_actif)`);
    }
  },

  async down(queryInterface) {
    const colonnes = await queryInterface.describeTable('commentaire').catch(() => null);
    if (!colonnes || !colonnes.avis_service_actif) return;
    const [index] = await queryInterface.sequelize.query(`SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire' AND INDEX_NAME = '${INDEX}'`);
    if (index.length) await queryInterface.removeIndex('commentaire', INDEX);
    await queryInterface.removeColumn('commentaire', 'avis_service_actif');
  }
};
