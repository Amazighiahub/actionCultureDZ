'use strict';

/**
 * Migration : tarif selon le profil.
 *
 * - formulaire du chantier-école, question « Vous êtes » : profil « Bénévole (préparation des repas) »
 *   ajouté avant « Autre » (l'organisateur lui donne son prix) ;
 * - « Autre » paie désormais au moins le prix professionnel : le prix affiché dans les listes
 *   (evenement.tarif) et le montant des inscriptions « Autre » déjà faites sont recalculés.
 */
const { lireTarification, montantInscription, PROFIL_AUTRE } = require('../services/evenement/tarification');

const NOM = 'Chantier-école';
const BENEVOLE = {
  valeur: 'Bénévole (préparation des repas)',
  label: { fr: 'Bénévole (préparation des repas)', ar: 'متطوع (تحضير الوجبات)', en: 'Volunteer (meal preparation)' }
};

const lireJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

async function modifierFormulaire(queryInterface, transformer) {
  const [types] = await queryInterface.sequelize.query(
    "SELECT id_type_evenement, config_inscription FROM type_evenement WHERE JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = :nom",
    { replacements: { nom: NOM } }
  );
  for (const type of types) {
    const config = lireJson(type.config_inscription);
    if (!config || !Array.isArray(config.sections)) continue;
    for (const section of config.sections) {
      const profil = (section.champs || []).find(c => c.cle === 'profil');
      if (profil) transformer(profil);
    }
    await queryInterface.sequelize.query(
      'UPDATE type_evenement SET config_inscription = :config WHERE id_type_evenement = :id',
      { replacements: { config: JSON.stringify(config), id: type.id_type_evenement } }
    );
  }
}

module.exports = {
  async up(queryInterface) {
    await modifierFormulaire(queryInterface, (profil) => {
      profil.options = profil.options || [];
      if (profil.options.some(o => o.valeur === BENEVOLE.valeur)) return;
      const autre = profil.options.findIndex(o => o.valeur === PROFIL_AUTRE);
      profil.options.splice(autre === -1 ? profil.options.length : autre, 0, BENEVOLE);
    });

    const [evenements] = await queryInterface.sequelize.query(
      'SELECT id_evenement, tarif, tarification FROM evenement WHERE tarification IS NOT NULL'
    );
    for (const ev of evenements) {
      const tarification = lireJson(ev.tarification);
      if (tarification?.mode !== 'profil') continue;
      const lu = lireTarification(tarification);
      if (lu && !lu.erreur && Number(lu.tarif) !== Number(ev.tarif)) {
        await queryInterface.sequelize.query('UPDATE evenement SET tarif = :tarif WHERE id_evenement = :id',
          { replacements: { tarif: lu.tarif, id: ev.id_evenement } });
      }
      const [inscriptions] = await queryInterface.sequelize.query(
        'SELECT id_evenement, id_user, reponses_inscription, montant_du FROM evenementusers WHERE id_evenement = :id',
        { replacements: { id: ev.id_evenement } }
      );
      for (const ins of inscriptions) {
        const reponses = lireJson(ins.reponses_inscription) || {};
        if (reponses.profil !== PROFIL_AUTRE) continue;
        const montant = montantInscription({ tarif: ev.tarif, tarification }, reponses);
        if (montant === null || Number(ins.montant_du) === montant) continue;
        await queryInterface.sequelize.query(
          'UPDATE evenementusers SET montant_du = :montant WHERE id_evenement = :ev AND id_user = :user',
          { replacements: { montant, ev: ins.id_evenement, user: ins.id_user } }
        );
      }
    }
  },

  async down(queryInterface) {
    await modifierFormulaire(queryInterface, (profil) => {
      profil.options = (profil.options || []).filter(o => o.valeur !== BENEVOLE.valeur);
    });
  }
};
