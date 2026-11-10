'use strict';

/**
 * Migration : retrait de l'ancien compte administrateur n° 1 (audit V10, confirmé par la responsable le
 * 2026-11-10). Le compte n'est PAS supprimé : ce qu'il a créé reste en place, et tout est réversible.
 * - rôle « Administrateur » retiré ;
 * - compte désactivé (statut « inactif » : connexion refusée) ;
 * - connexions ouvertes coupées : sessions supprimées, jetons émis avant maintenant refusés
 *   (password_changed_at), cache de session vidé si Redis est joignable (sinon il expire en 15 min).
 * Garde-fou : rien n'est fait s'il ne reste pas un autre administrateur actif (jamais de site sans administration).
 * Descente : rôle rendu et compte réactivé (les sessions coupées ne reviennent pas : il suffit de se reconnecter).
 */
const ID_COMPTE = 1;
const ROLE_ADMIN = 'Administrateur';

const autresAdminsActifs = (select) => select(
  `SELECT COUNT(*) AS n FROM user u
    WHERE u.id_user <> ? AND u.statut = 'actif'
      AND (u.id_type_user = 29 OR EXISTS (
        SELECT 1 FROM userroles ur JOIN role r ON r.id_role = ur.id_role
         WHERE ur.id_user = u.id_user AND r.nom_role = ?))`,
  [ID_COMPTE, ROLE_ADMIN]
);

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    const [compte] = await select('SELECT id_user FROM user WHERE id_user = ?', [ID_COMPTE]);
    if (!compte) return;
    const [{ n }] = await autresAdminsActifs(select);
    if (Number(n) < 1) return; // jamais de site sans administrateur actif

    await s.query(
      'DELETE ur FROM userroles ur JOIN role r ON r.id_role = ur.id_role WHERE ur.id_user = ? AND r.nom_role = ?',
      { replacements: [ID_COMPTE, ROLE_ADMIN] }
    );
    await s.query("UPDATE user SET statut = 'inactif', password_changed_at = NOW() WHERE id_user = ?", { replacements: [ID_COMPTE] });
    await s.query('DELETE FROM session_connexion WHERE id_user = ?', { replacements: [ID_COMPTE] });
    try {
      await require('../utils/sessionCache').invalidateUserSession(ID_COMPTE);
    } catch (_e) { /* Redis absent pendant la migration : le cache expire de lui-même (15 min) */ }
  },

  async down(queryInterface) {
    const s = queryInterface.sequelize;
    const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT });
    const [compte] = await select("SELECT id_user FROM user WHERE id_user = ? AND statut = 'inactif'", [ID_COMPTE]);
    if (!compte) return;
    const [role] = await select('SELECT id_role FROM role WHERE nom_role = ?', [ROLE_ADMIN]);
    const [deja] = role ? await select('SELECT id FROM userroles WHERE id_user = ? AND id_role = ?', [ID_COMPTE, role.id_role]) : [null];
    if (role && !deja) {
      await s.query('INSERT INTO userroles (id_user, id_role, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
        { replacements: [ID_COMPTE, role.id_role] });
    }
    await s.query("UPDATE user SET statut = 'actif' WHERE id_user = ?", { replacements: [ID_COMPTE] });
  },
};
