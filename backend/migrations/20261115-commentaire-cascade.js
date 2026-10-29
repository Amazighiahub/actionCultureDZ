'use strict';

/**
 * Migration : les commentaires suivent ce qu'ils commentent quand il est effacé de la base,
 * comme le déclare le modèle (onDelete: 'CASCADE') :
 * - commentaire_parent_id → les réponses avec leur commentaire ;
 * - id_oeuvre, id_evenement → les commentaires avec l'œuvre ou l'événement.
 * Sans elle, la base refusait de supprimer une œuvre ou un événement commenté, ou un service
 * (ou le lieu qui le porte) dont un avis a reçu une réponse. Rejouable.
 */
const CLES = [
  { colonne: 'commentaire_parent_id', table: 'commentaire', champ: 'id_commentaire', nom: 'fk_commentaire_parent' },
  { colonne: 'id_oeuvre', table: 'oeuvre', champ: 'id_oeuvre', nom: 'fk_commentaire_oeuvre' },
  { colonne: 'id_evenement', table: 'evenement', champ: 'id_evenement', nom: 'fk_commentaire_evenement' }
];

async function clesActuelles(queryInterface, { colonne, table }) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT k.CONSTRAINT_NAME AS nom, r.DELETE_RULE AS regle
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'commentaire'
      AND k.COLUMN_NAME = :colonne AND k.REFERENCED_TABLE_NAME = :table`, { replacements: { colonne, table } });
  return lignes;
}

async function remplacer(queryInterface, cle, regle) {
  const actuelles = await clesActuelles(queryInterface, cle);
  if (actuelles.length === 1 && actuelles[0].regle === regle) return;
  for (const { nom } of actuelles) await queryInterface.removeConstraint('commentaire', nom);
  await queryInterface.addConstraint('commentaire', {
    fields: [cle.colonne],
    type: 'foreign key',
    name: cle.nom,
    references: { table: cle.table, field: cle.champ },
    onDelete: regle,
    onUpdate: 'CASCADE'
  });
}

async function appliquer(queryInterface, regle) {
  const colonnes = await queryInterface.describeTable('commentaire').catch(() => null);
  if (!colonnes) return;
  for (const cle of CLES) if (colonnes[cle.colonne]) await remplacer(queryInterface, cle, regle);
}

module.exports = {
  up: (queryInterface) => appliquer(queryInterface, 'CASCADE'),
  down: (queryInterface) => appliquer(queryInterface, 'NO ACTION')
};
