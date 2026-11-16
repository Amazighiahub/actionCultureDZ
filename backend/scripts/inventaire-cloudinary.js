#!/usr/bin/env node
/**
 * Fichiers Cloudinary qui ne servent plus (voir services/inventaireCloudinary.js). Rien n'est jamais
 * effacé directement : les fichiers inutilisés vont d'abord dans une corbeille (dossier
 * « corbeille-eventculture/ »), d'où on peut les remettre ; elle ne se vide qu'après 30 jours.
 *
 * Sur le serveur, aux heures creuses :
 *   docker exec eventculture-backend node scripts/inventaire-cloudinary.js
 *       → COMPTAGE seulement (rien ne bouge) : nombre et taille par dossier. --details : 10 exemples.
 *   docker exec eventculture-backend node scripts/inventaire-cloudinary.js --deplacer --max=20
 *       → déplace au plus 20 fichiers inutilisés vers la corbeille (les plus anciens d'abord)
 *   docker exec eventculture-backend node scripts/inventaire-cloudinary.js --restaurer=corbeille-eventculture/images/xxx
 *       → remet un fichier à sa place
 *   docker exec eventculture-backend node scripts/inventaire-cloudinary.js --vider-corbeille --max=100
 *       → efface pour de bon les fichiers mis à la corbeille il y a plus de 30 jours
 *
 * Déplacement refusé hors production, si l'adresse du site n'est pas taladz.com, si la base cite trop
 * peu de fichiers ou si trop de fichiers semblent inutilisés (relecture du 2026-11-16).
 */
// Lecture de toutes les colonnes de texte : les parcours complets peuvent dépasser la limite de 10 s
// de l'application (une minute ici, script lancé à la main)
process.env.DB_MAX_EXECUTION_MS = process.env.DB_MAX_EXECUTION_MS && process.env.DB_MAX_EXECUTION_MS !== '10000'
  ? process.env.DB_MAX_EXECUTION_MS : '60000';

const {
  referencesDuSite, fichiersCloudinary, inutilises, resume, refusDeplacement, versCorbeille, depuisCorbeille,
  AGE_MIN_JOURS, CORBEILLE, CORBEILLE_JOURS, estCite
} = require('../services/inventaireCloudinary');

// Options exactes seulement (« --deplacer=non » ne déplace rien)
const option = (nom) => process.argv.includes(`--${nom}`);
const valeur = (nom) => (process.argv.find((a) => a.startsWith(`--${nom}=`)) || '').split('=').slice(1).join('=');
const mo = (octets) => `${(octets / 1024 / 1024).toFixed(1)} Mo`;

async function main() {
  const max = Math.max(1, Math.min(500, Number(valeur('max')) || 20));
  const svc = require('../services/cloudinaryService');
  const { cloudinary, deleteAsset, lireUrlCloudinary } = svc;
  let echecs = 0;

  // --- Restaurer un fichier de la corbeille
  const aRestaurer = valeur('restaurer');
  if (aRestaurer) {
    if (!aRestaurer.startsWith(CORBEILLE)) throw new Error(`l'identifiant doit commencer par ${CORBEILLE}`);
    for (const type of ['image', 'video', 'raw']) {
      try {
        await cloudinary.uploader.rename(aRestaurer, depuisCorbeille(aRestaurer), { resource_type: type, overwrite: false });
        console.log(`Remis à sa place : ${depuisCorbeille(aRestaurer)} (${type})`);
        return 0;
      } catch { /* autre type */ }
    }
    throw new Error('fichier introuvable dans la corbeille');
  }

  // --- Vider la corbeille (fichiers déplacés il y a plus de CORBEILLE_JOURS jours)
  if (option('vider-corbeille')) {
    if (process.env.NODE_ENV !== 'production') throw new Error('seulement sur le serveur de production');
    const limite = Date.now() - CORBEILLE_JOURS * 24 * 3600 * 1000;
    let faits = 0;
    for (const type of ['image', 'video', 'raw']) {
      let curseur;
      do {
        const r = await cloudinary.api.resources({ type: 'upload', resource_type: type, prefix: CORBEILLE, max_results: 500, context: true, ...(curseur ? { next_cursor: curseur } : {}) });
        for (const f of r?.resources || []) {
          if (faits >= max) break;
          const le = Date.parse(f.context?.custom?.deplace_le || '');
          if (!le || le > limite) continue;
          const res = await deleteAsset(f.public_id, type);
          if (res?.result === 'ok' || res?.result === 'not found') faits += 1; else echecs += 1;
        }
        curseur = faits < max ? r?.next_cursor : null;
      } while (curseur);
    }
    console.log(`Corbeille : ${faits} fichier(s) effacé(s) pour de bon ; échecs : ${echecs}.`);
    return echecs ? 1 : 0;
  }

  // --- Comptage (et déplacement sur demande)
  const deplacer = option('deplacer');
  const sequelize = require('../config/database').createDatabaseConnection(process.env.NODE_ENV || 'development');
  try {
    await sequelize.authenticate();
    console.log(deplacer ? `Mode DÉPLACEMENT vers la corbeille : ${max} fichiers au plus.` : 'Mode COMPTAGE : rien ne bouge.');
    const { refs, colonnesLues } = await referencesDuSite(sequelize, lireUrlCloudinary);
    console.log(`Base lue : ${colonnesLues} colonnes de texte, ${refs.size} fichiers cités.`);
    const fichiers = await fichiersCloudinary(cloudinary);
    const total = resume(fichiers);
    console.log(`Cloudinary (hors quarantaine et corbeille) : ${total.nombre} fichiers, ${mo(total.octets)}.`);

    const liste = inutilises(fichiers, refs).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const r = resume(liste);
    console.log(`Inutilisés depuis plus de ${AGE_MIN_JOURS} jours : ${r.nombre} fichiers, ${mo(r.octets)}.`);
    for (const [dossier, v] of Object.entries(r.parDossier).sort()) console.log(`  ${dossier} : ${v.nombre} (${mo(v.octets)})`);
    if (option('details')) for (const f of liste.slice(0, 10)) console.log(`  · ${f.resource_type} ${f.public_id} (${f.created_at})`);
    if (!deplacer) return 0;

    const refus = refusDeplacement({ citees: refs.size, total: total.nombre, aDeplacer: r.nombre });
    if (refus) throw new Error(`Déplacement refusé : ${refus}.`);
    // Nouvelle lecture de la base juste avant : un fichier réutilisé entre-temps reste en place
    const { refs: refs2 } = await referencesDuSite(sequelize, lireUrlCloudinary);
    let faits = 0;
    for (const f of liste.slice(0, max)) {
      if (estCite(f.public_id, refs2)) continue;
      try {
        const nouveau = versCorbeille(f.public_id);
        await cloudinary.uploader.rename(f.public_id, nouveau, { resource_type: f.resource_type, overwrite: false });
        await cloudinary.uploader.add_context(`deplace_le=${new Date().toISOString()}`, [nouveau], { resource_type: f.resource_type }).catch(() => undefined);
        faits += 1;
      } catch (e) {
        echecs += 1;
        console.error(`  échec ${f.public_id} : ${e.message}`);
      }
    }
    console.log(`Déplacés vers la corbeille : ${faits} ; échecs : ${echecs} ; restent : ${Math.max(0, r.nombre - faits)}.`);
    console.log(`Pour remettre un fichier : --restaurer=${CORBEILLE}<chemin>. Corbeille vidée seulement après ${CORBEILLE_JOURS} jours (--vider-corbeille).`);
    return echecs ? 1 : 0;
  } finally {
    await sequelize.close().catch(() => undefined);
  }
}

// Sortie différée : le journal écrit de façon asynchrone, une sortie immédiate coupait les dernières
// lignes (« Déplacés vers la corbeille : … » n'apparaissait pas)
const sortir = (code) => { process.exitCode = code; setTimeout(() => process.exit(code), 1000); };
main().then((code) => sortir(code || 0)).catch((e) => {
  console.error(`Échec : ${e.message}`);
  sortir(1);
});
