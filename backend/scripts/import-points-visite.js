#!/usr/bin/env node
/**
 * import-points-visite.js — Importe les points de visite d'un site depuis un classeur Excel
 *
 * Lecture du classeur et règles d'import : services/patrimoine/importReleve.js
 * (la même logique sert la page « Importer un relevé Excel » de l'administration).
 * Accepte le modèle « Modele_points_GPS_Taladz.xlsx » comme l'ancien relevé de Timgad.
 *
 * Relançable : chaque point est retrouvé parmi ceux du site par ses coordonnées GPS
 * (point intérieur : par son nom).
 *   - point absent  → créé (ordre de visite = ID du relevé)
 *   - point présent → nom, type, description, source et statut mis à jour ;
 *                     l'ordre de visite choisi sur le site est conservé
 * Un point sans nom est importé en brouillon (« Point 12 – à identifier ») : invisible
 * du public, il est publié dès qu'on lui donne un nom dans le classeur et qu'on relance.
 * Une cellule vide ne remplace jamais une valeur déjà en base.
 *
 * --parent absent : le lieu est pris dans la feuille « Site » (retrouvé dans sa commune, sinon créé).
 * --nom-site "Timgad" : corrige aussi le nom français du site (les autres langues sont gardées).
 *
 * Usage :
 *   node scripts/import-points-visite.js --parent 4 --fichier Timgad_points.xlsx            # aperçu
 *   node scripts/import-points-visite.js --parent 4 --fichier Timgad_points.xlsx --execute  # import
 *   node scripts/import-points-visite.js --fichier Releve_association.xlsx --execute         # lieu de la feuille Site
 */

require('dotenv').config();
const path = require('path');
const db = require('../models');
const container = require('../services/serviceContainer');
const { lireReleve, ImportReleve, resumerPlan } = require('../services/patrimoine/importReleve');

const arg = (nom) => {
  const i = process.argv.indexOf(nom);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const EXECUTE = process.argv.includes('--execute');
const PARENT_ID = arg('--parent') ? parseInt(arg('--parent'), 10) : null;
const FICHIER = arg('--fichier');
const NOM_SITE = (arg('--nom-site') || '').trim();

const SYMBOLES = { creer: '+ créer     ', maj: '~ mettre à jour', inchange: '= inchangé  ' };

async function main() {
  if (!FICHIER || (arg('--parent') && !Number.isInteger(PARENT_ID))) {
    console.error('Usage : node scripts/import-points-visite.js [--parent <id du site>] --fichier <classeur.xlsx> [--execute]');
    process.exit(1);
  }
  container.initialize(db);
  const importeur = new ImportReleve(db, container.patrimoineService);

  const releve = await lireReleve(path.resolve(FICHIER));
  const plan = await importeur.planifier(releve, { parentId: PARENT_ID });
  const resume = resumerPlan(plan);
  if (resume.erreurs.length) {
    for (const e of resume.erreurs) console.error(`Erreur : ${e}`);
    process.exit(1);
  }

  if (NOM_SITE && plan.lieu && plan.lieu.nom?.fr !== NOM_SITE) {
    console.log(`Nom du site : « ${plan.lieu.nom?.fr || ''} » → « ${NOM_SITE} »`);
    if (EXECUTE) await plan.lieu.update({ nom: { ...(plan.lieu.nom || {}), fr: NOM_SITE } });
  }
  console.log(resume.lieu.existe
    ? `Site : ${resume.lieu.nom} (${resume.lieu.id})`
    : `Site à créer : ${resume.lieu.nom} (commune ${resume.lieu.commune})`);
  console.log(EXECUTE ? 'Mode : IMPORT' : 'Mode : aperçu (ajouter --execute pour importer)');
  for (const i of resume.ignorees) console.log(`  ? ignorée    #${i.id} ${i.nom || ''} : ${i.raison}`);
  for (const p of resume.points) {
    if (p.action === 'inchange') continue;
    const champs = p.champs.length ? ` (${p.champs.join(', ')})` : '';
    console.log(`  ${SYMBOLES[p.action]} #${String(p.id).padStart(2)} ${p.nom} [${p.statut}]${champs}`);
  }

  if (!EXECUTE) {
    const b = resume.bilan;
    console.log(`Bilan : ${b.creer} à créer, ${b.maj} à mettre à jour, ${b.inchanges} inchangés, ${b.ignorees} ignorées (aperçu, rien n'a été écrit)`);
    await db.sequelize.close();
    process.exit(0);
  }
  const bilan = await importeur.executer(plan, { createurId: plan.lieu?.id_createur || null });
  for (const e of bilan.erreurs) console.error(`  ! erreur    #${e.id} ${e.nom} : ${e.erreur}`);
  console.log(`Bilan : ${bilan.lieuCree ? 'site créé, ' : ''}${bilan.crees} créés, ${bilan.maj} mis à jour, ${bilan.inchanges} inchangés, ${bilan.erreurs.length} erreurs — site n° ${bilan.idLieu}`);
  await db.sequelize.close();
  process.exit(bilan.erreurs.length ? 1 : 0);
}

main().catch((error) => {
  console.error('Échec :', error.message);
  process.exit(1);
});
