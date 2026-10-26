'use strict';

/**
 * Migration : formulaire du chantier-école, question « Vous êtes ».
 *
 * - « Amateur du patrimoine » retiré des profils (Artisan ou professionnel, Étudiant, Retraité, Autre) ;
 * - « Autre » : la personne précise sa catégorie dans une case de texte (question profil_autre).
 * Les inscriptions déjà faites gardent leurs réponses.
 */
const NOM = 'Chantier-école';
const RETIRE = { valeur: 'Amateur du patrimoine', label: { fr: 'Amateur du patrimoine', ar: 'محبّ للتراث', en: 'Heritage enthusiast' } };
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
    transformer(config);
    await queryInterface.sequelize.query(
      'UPDATE type_evenement SET config_inscription = :config WHERE id_type_evenement = :id',
      { replacements: { config: JSON.stringify(config), id: type.id_type_evenement } }
    );
  }
}

module.exports = {
  async up(queryInterface) {
    await modifier(queryInterface, (config) => {
      for (const section of config.sections) {
        const i = (section.champs || []).findIndex(c => c.cle === 'profil');
        if (i === -1) continue;
        const profil = section.champs[i];
        profil.options = (profil.options || []).filter(o => o.valeur !== RETIRE.valeur);
        if (!section.champs.some(c => c.cle === PRECISEZ.cle)) section.champs.splice(i + 1, 0, PRECISEZ);
      }
    });
  },

  async down(queryInterface) {
    await modifier(queryInterface, (config) => {
      for (const section of config.sections) {
        const profil = (section.champs || []).find(c => c.cle === 'profil');
        if (!profil) continue;
        section.champs = section.champs.filter(c => c.cle !== PRECISEZ.cle);
        const autre = profil.options.findIndex(o => o.valeur === 'Autre');
        if (!profil.options.some(o => o.valeur === RETIRE.valeur)) profil.options.splice(autre === -1 ? profil.options.length : autre, 0, RETIRE);
      }
    });
  }
};
