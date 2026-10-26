'use strict';

/**
 * Migration : formulaire du chantier-école, question « Vous êtes ».
 *
 * Le choix « Autre » et sa question « Précisez votre catégorie » sont retirés (profils :
 * Artisan ou professionnel, Étudiant, Retraité, Bénévole (préparation des repas)).
 * Les inscriptions déjà faites gardent leurs réponses.
 */
const NOM = 'Chantier-école';
const AUTRE = { valeur: 'Autre', label: { fr: 'Autre', ar: 'أخرى', en: 'Other' } };
const PRECISEZ = {
  cle: 'profil_autre', type: 'texte', requis: true,
  condition: { cle: 'profil', valeur: 'Autre' },
  label: { fr: 'Précisez votre catégorie', ar: 'حدّدوا فئتكم', en: 'Please specify your category' },
  placeholder: { fr: 'Ex. : architecte, enseignant, habitant du village…', ar: 'مثال: مهندس معماري، أستاذ، من سكان القرية…', en: 'E.g. architect, teacher, village resident…' }
};

const lireConfig = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

async function modifier(queryInterface, transformer) {
  const [types] = await queryInterface.sequelize.query(
    "SELECT id_type_evenement, config_inscription FROM type_evenement WHERE JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = :nom",
    { replacements: { nom: NOM } }
  );
  for (const type of types) {
    const config = lireConfig(type.config_inscription);
    if (!config || !Array.isArray(config.sections)) continue;
    for (const section of config.sections) {
      if ((section.champs || []).some(c => c.cle === 'profil')) transformer(section);
    }
    await queryInterface.sequelize.query(
      'UPDATE type_evenement SET config_inscription = :config WHERE id_type_evenement = :id',
      { replacements: { config: JSON.stringify(config), id: type.id_type_evenement } }
    );
  }
}

module.exports = {
  async up(queryInterface) {
    await modifier(queryInterface, (section) => {
      const profil = section.champs.find(c => c.cle === 'profil');
      profil.options = (profil.options || []).filter(o => o.valeur !== AUTRE.valeur);
      section.champs = section.champs.filter(c => c.cle !== PRECISEZ.cle);
    });
  },

  async down(queryInterface) {
    await modifier(queryInterface, (section) => {
      const i = section.champs.findIndex(c => c.cle === 'profil');
      const profil = section.champs[i];
      if (!profil.options.some(o => o.valeur === AUTRE.valeur)) profil.options.push(AUTRE);
      if (!section.champs.some(c => c.cle === PRECISEZ.cle)) section.champs.splice(i + 1, 0, PRECISEZ);
    });
  }
};
