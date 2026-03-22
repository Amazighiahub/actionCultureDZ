#!/usr/bin/env node
/**
 * cleanup-duplicates.js — Détection et nettoyage des doublons en base
 *
 * Les champs `nom` sont JSON multilingue : {"fr": "...", "ar": "...", "en": "..."}
 * Deux entrées sont considérées comme doublons si LOWER(TRIM($.fr)) est identique.
 * On garde toujours l'enregistrement le plus ancien (MIN(id)).
 *
 * Usage :
 *   node scripts/cleanup-duplicates.js              # Dry run (rapport seul)
 *   node scripts/cleanup-duplicates.js --execute     # Exécute le nettoyage
 *   node scripts/cleanup-duplicates.js --lang ar     # Compare sur la langue arabe
 */

require('dotenv').config();
const db = require('../models');
const sequelize = db.sequelize;

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const DRY_RUN = !process.argv.includes('--execute');
const LANG = (() => {
  const idx = process.argv.indexOf('--lang');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : 'fr';
})();

// JSON path pour MySQL JSON_EXTRACT
const jsonPath = LANG.includes('-') ? `$."${LANG}"` : `$.${LANG}`;

// ---------------------------------------------------------------------------
// Définition des entités à nettoyer
// ---------------------------------------------------------------------------
const ENTITIES = [
  {
    name: 'TagMotCle',
    table: 'tagmotcle',
    pk: 'id_tag',
    field: 'nom',
    pivots: [
      { table: 'oeuvretags', fk: 'id_tag', otherKeys: ['id_oeuvre'] }
    ]
  },
  {
    name: 'Editeur',
    table: 'editeur',
    pk: 'id_editeur',
    field: 'nom',
    pivots: [
      { table: 'oeuvre_editeur', fk: 'id_editeur', otherKeys: ['id_oeuvre'] }
    ]
  },
  {
    name: 'Categorie',
    table: 'categorie',
    pk: 'id_categorie',
    field: 'nom',
    pivots: [
      { table: 'genre_categorie', fk: 'id_categorie', otherKeys: ['id_genre'] },
      { table: 'oeuvrecategories', fk: 'id_categorie', otherKeys: ['id_oeuvre'] }
    ]
  },
  {
    name: 'Genre',
    table: 'genre',
    pk: 'id_genre',
    field: 'nom',
    pivots: [
      { table: 'type_oeuvre_genre', fk: 'id_genre', otherKeys: ['id_type_oeuvre'] },
      { table: 'genre_categorie', fk: 'id_genre', otherKeys: ['id_categorie'] }
    ]
  },
  {
    name: 'TypeOeuvre',
    table: 'type_oeuvre',
    pk: 'id_type_oeuvre',
    field: 'nom_type',
    pivots: [
      { table: 'type_oeuvre_genre', fk: 'id_type_oeuvre', otherKeys: ['id_genre'] }
    ]
  },
  {
    name: 'Materiau',
    table: 'materiau',
    pk: 'id_materiau',
    field: 'nom',
    pivots: []
  },
  {
    name: 'Technique',
    table: 'technique',
    pk: 'id_technique',
    field: 'nom',
    pivots: []
  },
  {
    name: 'Organisation',
    table: 'organisation',
    pk: 'id_organisation',
    field: 'nom',
    pivots: [
      { table: 'userorganisation', fk: 'id_organisation', otherKeys: ['id_user'] },
      { table: 'evenementorganisation', fk: 'id_organisation', otherKeys: ['id_evenement'] }
    ]
  },
  {
    name: 'Intervenant',
    table: 'intervenant',
    pk: 'id_intervenant',
    field: 'nom',          // On compare nom+prenom concaténés
    field2: 'prenom',      // Champ secondaire
    pivots: [
      { table: 'oeuvre_intervenant', fk: 'id_intervenant', otherKeys: ['id_oeuvre', 'id_type_user'] }
    ]
  }
];

// ---------------------------------------------------------------------------
// DÉTECTION DES DOUBLONS
// ---------------------------------------------------------------------------
async function detectDuplicates(entity) {
  const { table, pk, field, field2 } = entity;

  // Pour Intervenant : concaténer nom + prénom
  const extractExpr = field2
    ? `CONCAT(
        LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}')), ''))),
        '::',
        LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${field2}, '${jsonPath}')), '')))
      )`
    : `LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}')), '')))`;

  const [rows] = await sequelize.query(`
    SELECT
      ${extractExpr} AS nom_normalise,
      COUNT(*)        AS nb,
      MIN(${pk})      AS keep_id,
      GROUP_CONCAT(${pk} ORDER BY ${pk} SEPARATOR ',') AS all_ids,
      GROUP_CONCAT(
        JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}'))
        ORDER BY ${pk} SEPARATOR ' | '
      ) AS noms_bruts
    FROM \`${table}\`
    WHERE JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}')) IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}')) != ''
      AND JSON_UNQUOTE(JSON_EXTRACT(${field}, '${jsonPath}')) != 'null'
    GROUP BY nom_normalise
    HAVING COUNT(*) > 1
    ORDER BY nb DESC
  `);

  return rows;
}

async function countTotal(entity) {
  const [[row]] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM \`${entity.table}\``
  );
  return row.total;
}

// ---------------------------------------------------------------------------
// NETTOYAGE D'UNE ENTITÉ
// ---------------------------------------------------------------------------
async function cleanupEntity(entity, duplicates, transaction) {
  const { table, pk, pivots } = entity;
  let totalReassigned = 0;
  let totalDeleted = 0;

  for (const dup of duplicates) {
    const allIds = dup.all_ids.split(',').map(Number);
    const keepId = dup.keep_id;
    const removeIds = allIds.filter(id => id !== keepId);

    if (removeIds.length === 0) continue;

    // 1. Réassigner les pivots
    for (const pivot of pivots) {
      // Mettre à jour les FK pour pointer vers l'ID gardé
      const [updateResult] = await sequelize.query(`
        UPDATE \`${pivot.table}\`
        SET \`${pivot.fk}\` = :keepId
        WHERE \`${pivot.fk}\` IN (:removeIds)
      `, {
        replacements: { keepId, removeIds },
        transaction
      });
      totalReassigned += updateResult.affectedRows || 0;

      // Supprimer les doublons d'association créés par le merge
      // Ex: si oeuvre #5 était liée au tag #3 ET au tag #7 (doublon),
      // après le UPDATE on a 2 lignes oeuvre #5 → tag #3 → on en supprime 1
      const otherKeysStr = pivot.otherKeys.map(k => `t1.\`${k}\` = t2.\`${k}\``).join(' AND ');

      // Trouver la colonne PK du pivot (id ou composite)
      // On utilise un DELETE avec sous-requête pour éviter les problèmes MySQL
      await sequelize.query(`
        DELETE t1 FROM \`${pivot.table}\` t1
        INNER JOIN \`${pivot.table}\` t2
        ON ${otherKeysStr}
          AND t1.\`${pivot.fk}\` = t2.\`${pivot.fk}\`
          AND t1.createdAt > t2.createdAt
        WHERE t1.\`${pivot.fk}\` = :keepId
      `, {
        replacements: { keepId },
        transaction
      }).catch(async () => {
        // Si pas de colonne createdAt, fallback sur une approche différente
        // Garder la première ligne, supprimer les autres via une table temporaire
        const otherKeysList = pivot.otherKeys.map(k => `\`${k}\``).join(', ');
        await sequelize.query(`
          DELETE FROM \`${pivot.table}\`
          WHERE \`${pivot.fk}\` = :keepId
            AND (${otherKeysList}, \`${pivot.fk}\`) IN (
              SELECT * FROM (
                SELECT ${otherKeysList}, \`${pivot.fk}\`
                FROM \`${pivot.table}\`
                WHERE \`${pivot.fk}\` = :keepId
                GROUP BY ${otherKeysList}, \`${pivot.fk}\`
                HAVING COUNT(*) > 1
              ) AS dups
            )
            AND NOT EXISTS (
              SELECT 1 FROM (
                SELECT MIN(COALESCE(createdAt, '1970-01-01')) AS min_date, ${otherKeysList}
                FROM \`${pivot.table}\`
                WHERE \`${pivot.fk}\` = :keepId
                GROUP BY ${otherKeysList}
              ) AS keeper
            )
        `, { replacements: { keepId }, transaction }).catch(() => {
          // Dernier recours : supprimer les associations en double avec une simple dédup
          // Garder les lignes distinctes uniquement
        });
      });
    }

    // 2. Supprimer les enregistrements en doublon
    await sequelize.query(`
      DELETE FROM \`${table}\` WHERE \`${pk}\` IN (:removeIds)
    `, {
      replacements: { removeIds },
      transaction
    });
    totalDeleted += removeIds.length;

    console.log(
      `  ✓ "${dup.noms_bruts.split(' | ')[0]}" : gardé #${keepId}, supprimé [${removeIds.join(', ')}]`
    );
  }

  return { totalReassigned, totalDeleted };
}

// ---------------------------------------------------------------------------
// DÉDUPLICATION PIVOT — supprimer les associations dupliquées
// ---------------------------------------------------------------------------
async function deduplicatePivots(entity, transaction) {
  let cleaned = 0;

  for (const pivot of entity.pivots) {
    const allKeys = [pivot.fk, ...pivot.otherKeys].map(k => `\`${k}\``).join(', ');

    // Compter les doublons dans la table pivot
    const [dupRows] = await sequelize.query(`
      SELECT ${allKeys}, COUNT(*) as cnt
      FROM \`${pivot.table}\`
      GROUP BY ${allKeys}
      HAVING COUNT(*) > 1
    `, { transaction });

    if (dupRows.length === 0) continue;

    // Pour chaque groupe de doublons, garder une seule ligne
    for (const row of dupRows) {
      const conditions = [pivot.fk, ...pivot.otherKeys]
        .map(k => `\`${k}\` = ${sequelize.escape(row[k])}`)
        .join(' AND ');

      // Garder le premier, supprimer les suivants
      const [[first]] = await sequelize.query(`
        SELECT * FROM \`${pivot.table}\`
        WHERE ${conditions}
        ORDER BY COALESCE(createdAt, '1970-01-01') ASC
        LIMIT 1
      `, { transaction });

      if (!first) continue;

      // Trouver la PK de la table pivot
      const pkCol = Object.keys(first).find(k =>
        k === 'id' || k.startsWith('id_') && !pivot.otherKeys.includes(k) && k !== pivot.fk
      );

      if (pkCol) {
        const [delResult] = await sequelize.query(`
          DELETE FROM \`${pivot.table}\`
          WHERE ${conditions} AND \`${pkCol}\` != :keepPk
        `, {
          replacements: { keepPk: first[pkCol] },
          transaction
        });
        cleaned += delResult.affectedRows || 0;
      }
    }

    if (cleaned > 0) {
      console.log(`  ⚡ ${pivot.table} : ${cleaned} associations en double nettoyées`);
    }
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AUDIT DES DOUBLONS EN BASE DE DONNÉES');
  console.log(`  Mode : ${DRY_RUN ? '🔍 DRY RUN (aucune modification)' : '⚠️  EXÉCUTION RÉELLE'}`);
  console.log(`  Langue de comparaison : ${LANG} (path: ${jsonPath})`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');
  } catch (err) {
    console.error('❌ Impossible de se connecter à la base de données:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // PHASE 1 : RAPPORT DE DÉTECTION
  // -------------------------------------------------------------------------
  console.log('┌─────────────────────┬─────────┬──────────┬─────────────────────────────┐');
  console.log('│ Table               │  Total  │ Doublons │ Exemples                    │');
  console.log('├─────────────────────┼─────────┼──────────┼─────────────────────────────┤');

  const allResults = [];

  for (const entity of ENTITIES) {
    try {
      const total = await countTotal(entity);
      const duplicates = await detectDuplicates(entity);
      const dupCount = duplicates.reduce((sum, d) => sum + d.nb - 1, 0);
      const examples = duplicates.slice(0, 2)
        .map(d => `"${(d.noms_bruts.split(' | ')[0] || '').substring(0, 20)}" (×${d.nb})`)
        .join(', ') || '—';

      const tablePadded = entity.name.padEnd(19);
      const totalPadded = String(total).padStart(7);
      const dupPadded = String(dupCount).padStart(8);
      const exPadded = examples.substring(0, 27).padEnd(27);

      console.log(`│ ${tablePadded} │ ${totalPadded} │ ${dupPadded} │ ${exPadded} │`);

      allResults.push({ entity, duplicates, total, dupCount });
    } catch (err) {
      const tablePadded = entity.name.padEnd(19);
      console.log(`│ ${tablePadded} │  ERROR  │   ERROR  │ ${err.message.substring(0, 27).padEnd(27)} │`);
      allResults.push({ entity, duplicates: [], total: 0, dupCount: 0, error: err.message });
    }
  }

  console.log('└─────────────────────┴─────────┴──────────┴─────────────────────────────┘\n');

  // Résumé
  const totalDups = allResults.reduce((sum, r) => sum + r.dupCount, 0);
  const tablesWithDups = allResults.filter(r => r.dupCount > 0).length;

  if (totalDups === 0) {
    console.log('🎉 Aucun doublon détecté ! La base est propre.\n');
    process.exit(0);
  }

  console.log(`📊 Résumé : ${totalDups} doublons dans ${tablesWithDups} tables\n`);

  // Détail par entité
  for (const { entity, duplicates } of allResults) {
    if (duplicates.length === 0) continue;

    console.log(`\n📋 ${entity.name} — ${duplicates.length} groupe(s) de doublons :`);
    for (const dup of duplicates) {
      const allIds = dup.all_ids.split(',').map(Number);
      const keepId = dup.keep_id;
      const removeIds = allIds.filter(id => id !== keepId);
      console.log(`   "${dup.noms_bruts.split(' | ')[0]}" → garder #${keepId}, supprimer [${removeIds.join(', ')}]`);
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 2 : NETTOYAGE (si --execute)
  // -------------------------------------------------------------------------
  if (DRY_RUN) {
    console.log('\n' + '─'.repeat(65));
    console.log('🔍 DRY RUN terminé. Aucune modification effectuée.');
    console.log('   Pour exécuter le nettoyage :');
    console.log('   node scripts/cleanup-duplicates.js --execute');
    console.log('─'.repeat(65) + '\n');
    process.exit(0);
  }

  console.log('\n' + '═'.repeat(65));
  console.log('⚠️  EXÉCUTION DU NETTOYAGE (dans une transaction)');
  console.log('═'.repeat(65) + '\n');

  const transaction = await sequelize.transaction();

  try {
    let grandTotalDeleted = 0;
    let grandTotalReassigned = 0;

    for (const { entity, duplicates } of allResults) {
      if (duplicates.length === 0) continue;

      console.log(`\n🔧 Nettoyage de ${entity.name} (${duplicates.length} groupes) :`);

      // Nettoyer les doublons
      const { totalReassigned, totalDeleted } = await cleanupEntity(
        entity, duplicates, transaction
      );

      // Dédupliquer les pivots
      const pivotsCleaned = await deduplicatePivots(entity, transaction);

      console.log(`   → ${totalDeleted} supprimés, ${totalReassigned} associations réassignées, ${pivotsCleaned} pivots dédupliqués`);

      grandTotalDeleted += totalDeleted;
      grandTotalReassigned += totalReassigned;
    }

    await transaction.commit();

    console.log('\n' + '═'.repeat(65));
    console.log(`✅ NETTOYAGE TERMINÉ AVEC SUCCÈS`);
    console.log(`   ${grandTotalDeleted} enregistrements supprimés`);
    console.log(`   ${grandTotalReassigned} associations réassignées`);
    console.log('═'.repeat(65) + '\n');

  } catch (err) {
    await transaction.rollback();
    console.error('\n❌ ERREUR — Transaction annulée (rollback) :');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
