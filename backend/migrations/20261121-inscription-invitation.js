'use strict';

/**
 * Migration : statut d'inscription « invitation » (audit V7 sécurité E2).
 * Une personne ajoutée par l'import d'une liste (classeur Excel) n'est plus inscrite d'office :
 * elle reçoit une invitation et confirme elle-même son inscription sur la page de l'événement.
 * Une invitation ne prend pas de place et ne reçoit pas les messages de l'organisateur.
 *
 * Ajout d'une valeur à la liste : aucune ligne existante n'est modifiée.
 * Descente : les invitations encore en attente redeviennent des inscriptions « inscrit »
 * (comportement d'avant), puis la valeur est retirée.
 */
const AVEC = "ENUM('invitation','inscrit','confirme','present','absent','annule')";
const SANS = "ENUM('inscrit','confirme','present','absent','annule')";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE evenementusers MODIFY statut_participation ${AVEC} NULL DEFAULT 'inscrit'`
    );
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query("UPDATE evenementusers SET statut_participation = 'inscrit' WHERE statut_participation = 'invitation'");
    await q.query(`ALTER TABLE evenementusers MODIFY statut_participation ${SANS} NULL DEFAULT 'inscrit'`);
  }
};
