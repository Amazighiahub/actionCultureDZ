'use strict';

/**
 * Migration de rattrapage : lieux de Yennayer à Tlemcen (20261210-lieux-yennayer-tlemcen.js).
 * En production, ils ont été créés sans propriétaire ni demande de validation : le compte administrateur
 * était cherché par son type seulement, alors qu'il l'est par son rôle. Les lieux restaient en brouillon,
 * invisibles de tous.
 *
 * Pour chacun des deux sites encore en brouillon : rattachement (site et points sans propriétaire) au
 * compte administrateur choisi (sinon le premier actif), puis une demande « creation » dans la file de l'équipe, si aucune n'est en attente.
 * Ne crée ni ne supprime aucun lieu. Rejouable. Descente : retire les demandes ajoutées ici (encore en attente)
 * et rend les lieux sans propriétaire, comme avant.
 */
const lieux = require('./20261210-lieux-yennayer-tlemcen');

// Compte administrateur choisi par la responsable du site (n° 75 en production). S'il n'est pas un administrateur
// actif (autre base, compte changé), le premier administrateur actif est pris à la place.
const ID_ADMIN_CHOISI = 75;

async function administrateur(select) {
  const [choisi] = await select(
    `SELECT u.id_user FROM user u
      WHERE u.id_user = ? AND u.statut = 'actif'
        AND (u.id_type_user = 29 OR EXISTS (
          SELECT 1 FROM userroles ur JOIN role r ON r.id_role = ur.id_role
           WHERE ur.id_user = u.id_user AND r.nom_role = 'Administrateur'))`,
    [ID_ADMIN_CHOISI]
  );
  return choisi ? choisi.id_user : lieux._premierAdministrateur(select);
}

const sitesEnBrouillon = (select) => select(
  `SELECT id_lieu FROM lieu WHERE statut = 'brouillon' AND id_lieu_parent IS NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')) IN (?)`,
  [lieux._SITES.map((s) => s.nom.fr)]
);

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    const idAdmin = await administrateur(select);
    if (!idAdmin) return;

    for (const { id_lieu: idSite } of await sitesEnBrouillon(select)) {
      await s.query(
        'UPDATE lieu SET id_createur = ? WHERE id_createur IS NULL AND (id_lieu = ? OR id_lieu_parent = ?)',
        { replacements: [idAdmin, idSite, idSite] }
      );
      const [attente] = await select(
        "SELECT id FROM proposition_lieu WHERE id_lieu = ? AND action = 'creation' AND statut = 'en_attente' LIMIT 1",
        [idSite]
      );
      if (!attente) {
        const [site] = await select("SELECT nom FROM lieu WHERE id_lieu = ?", [idSite]);
        const nom = typeof site.nom === 'string' ? JSON.parse(site.nom) : site.nom;
        await s.query(
          `INSERT INTO proposition_lieu (id_lieu, id_user, action, donnees, statut, date_creation)
           VALUES (?, ?, 'creation', ?, 'en_attente', NOW())`,
          { replacements: [idSite, idAdmin, JSON.stringify({ corps: { nom } })] }
        );
      }
    }
  },

  async down(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    for (const { id_lieu: idSite } of await sitesEnBrouillon(select)) {
      await s.query("DELETE FROM proposition_lieu WHERE id_lieu = ? AND action = 'creation' AND statut = 'en_attente'",
        { replacements: [idSite] });
      await s.query('UPDATE lieu SET id_createur = NULL WHERE id_lieu = ? OR id_lieu_parent = ?',
        { replacements: [idSite, idSite] });
    }
  },
};
