'use strict';

/**
 * Migration : points de visite d'un site et audio multilingue.
 *
 * - lieu.id_lieu_parent : un lieu peut appartenir à un autre (Timgad › Musée › Salle 3)
 * - lieu.ordre_visite   : ordre du point dans la visite de son site
 * - lieu.repere         : repère pour un point intérieur sans GPS propre ({ fr: '1er étage, salle 3' })
 * - lieu_medias.langue  : langue d'un enregistrement audio (fr, ar, en, tz-ltn, tz-tfng)
 * - monuments.type / vestiges.type : alignés sur les types proposés à l'écran et
 *   acceptés par les routes (« Marché », « Thermes romains »… étaient refusés par la base)
 */
const MONUMENT_TYPES = [
  'Mosquée', 'Palais', 'Casbah', 'Ksar', 'Fort', 'Mausolée', 'Zaouia',
  'Hammam', 'Fontaine', 'Statue', 'Tour', 'Minaret', 'Musée', 'Rempart',
  'Borj', 'Pont', 'Théâtre', 'Église', 'Marché',
  'Grenier collectif', 'Ancienne maison', 'Autre'
];
const VESTIGE_TYPES = [
  'Ruines', 'Murailles', 'Vestiges numides', 'Tombeau numide', 'Inscriptions berbères',
  'Gravures rupestres', 'Site archéologique', 'Dolmen', 'Théâtre antique',
  'Thermes romains', 'Mosaïque', 'Aqueduc', 'Tombe', 'Autre'
];
const ANCIENS_MONUMENT_TYPES = ['Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'];
const ANCIENS_VESTIGE_TYPES = ['Ruines', 'Murailles', 'Site archéologique'];

module.exports = {
  MONUMENT_TYPES,
  VESTIGE_TYPES,

  async up(queryInterface, Sequelize) {
    const lieu = await queryInterface.describeTable('lieu');
    if (!lieu.id_lieu_parent) {
      await queryInterface.addColumn('lieu', 'id_lieu_parent', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: { model: 'lieu', key: 'id_lieu' },
        onUpdate: 'CASCADE',
        // Site supprimé : ses points restent, comme lieux indépendants
        onDelete: 'SET NULL',
        comment: 'Site auquel appartient ce point de visite (null = lieu principal)'
      });
      await queryInterface.addIndex('lieu', ['id_lieu_parent'], { name: 'idx_lieu_parent' });
    }
    if (!lieu.ordre_visite) {
      await queryInterface.addColumn('lieu', 'ordre_visite', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Ordre du point dans la visite de son site'
      });
    }
    if (!lieu.repere) {
      await queryInterface.addColumn('lieu', 'repere', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Repère d\'un point intérieur, en plusieurs langues { fr: "1er étage, salle 3" }'
      });
    }

    const medias = await queryInterface.describeTable('lieu_medias');
    if (!medias.langue) {
      await queryInterface.addColumn('lieu_medias', 'langue', {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'Langue d\'un enregistrement audio (fr, ar, en, tz-ltn, tz-tfng)'
      });
    }

    await queryInterface.changeColumn('monuments', 'type', {
      type: Sequelize.ENUM(...MONUMENT_TYPES),
      allowNull: false
    });
    await queryInterface.changeColumn('vestiges', 'type', {
      type: Sequelize.ENUM(...VESTIGE_TYPES),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Ramener les nouveaux types vers les anciens avant de réduire les ENUM
    await queryInterface.sequelize.query(
      'UPDATE monuments SET type = \'Palais\' WHERE type NOT IN (:anciens)',
      { replacements: { anciens: ANCIENS_MONUMENT_TYPES } }
    );
    await queryInterface.changeColumn('monuments', 'type', {
      type: Sequelize.ENUM(...ANCIENS_MONUMENT_TYPES),
      allowNull: false
    });
    await queryInterface.sequelize.query(
      'UPDATE vestiges SET type = \'Ruines\' WHERE type NOT IN (:anciens)',
      { replacements: { anciens: ANCIENS_VESTIGE_TYPES } }
    );
    await queryInterface.changeColumn('vestiges', 'type', {
      type: Sequelize.ENUM(...ANCIENS_VESTIGE_TYPES),
      allowNull: false
    });

    const medias = await queryInterface.describeTable('lieu_medias');
    if (medias.langue) await queryInterface.removeColumn('lieu_medias', 'langue');

    const lieu = await queryInterface.describeTable('lieu');
    if (lieu.repere) await queryInterface.removeColumn('lieu', 'repere');
    if (lieu.ordre_visite) await queryInterface.removeColumn('lieu', 'ordre_visite');
    if (lieu.id_lieu_parent) {
      // MySQL refuse de supprimer une colonne encore liée à une clé étrangère
      const fks = await queryInterface.getForeignKeyReferencesForTable('lieu');
      for (const fk of fks.filter((f) => f.columnName === 'id_lieu_parent')) {
        await queryInterface.removeConstraint('lieu', fk.constraintName);
      }
      await queryInterface.removeIndex('lieu', 'idx_lieu_parent').catch(() => {});
      await queryInterface.removeColumn('lieu', 'id_lieu_parent');
    }
  }
};
