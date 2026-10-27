'use strict';

/**
 * Migration : répare les notifications déjà envoyées qui affichaient « [object Object] » à la place
 * d'un nom (nom d'événement ou prénom et nom multilingues insérés tels quels dans le texte).
 * - nom d'événement : remplacé par son nom (français, sinon arabe, sinon anglais) ;
 * - prénom et nom d'une personne : remplacés par « Un contributeur ».
 * Rien à défaire : l'ancien texte était illisible.
 */
const NOM = "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(e.nom_evenement, '$.fr')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(e.nom_evenement, '$.ar')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(e.nom_evenement, '$.en')), ''), 'l’événement')";

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`
      UPDATE notification n JOIN evenement e ON e.id_evenement = n.id_evenement
      SET n.message = REPLACE(n.message, '"[object Object]"', CONCAT('« ', ${NOM}, ' »'))
      WHERE n.message LIKE '%"[object Object]"%'`);
    await q.query(`
      UPDATE notification SET message = REPLACE(message, '[object Object] [object Object]', 'Un contributeur')
      WHERE message LIKE '%[object Object] [object Object]%'`);
  },

  async down() {}
};
