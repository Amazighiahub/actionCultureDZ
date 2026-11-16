/**
 * Inventaire des fichiers Cloudinary qui ne servent plus (accord de la responsable, 2026-11-16).
 * Jusqu'au 2026-11-15, un fichier retiré du site restait sur Cloudinary (voir user/userFileCleanup.js).
 *
 * Prudence avant tout : au lieu d'une liste de colonnes, TOUTES les colonnes de texte de TOUTES les
 * tables sont lues, et chaque mention d'un fichier (adresse res.cloudinary.com ou chemin
 * « eventculture/… ») le garde. Seules exceptions : les lignes Media « journal » d'un envoi (rattachées
 * à rien et citées nulle part) et le journal d'administration. Un fichier n'est jugé inutilisé que
 * s'il n'est mentionné nulle part et qu'il a plus de AGE_MIN_JOURS jours. La quarantaine a son propre
 * nettoyage (nettoyageQuarantaine.js).
 */
const AGE_MIN_JOURS = 30;
// Fichiers inutilisés déplacés ici plutôt qu'effacés ; vidée seulement après CORBEILLE_JOURS jours
const CORBEILLE = 'corbeille-eventculture/';
const CORBEILLE_JOURS = 30;
// Au-delà de cette part de fichiers jugés inutilisés, quelque chose cloche (mauvaise base) : refus
const PART_MAX_INUTILISES = 0.2;
const RACINE = 'eventculture/';
const EXCLUS = ['eventculture/quarantaine/'];
// Tables jamais lues : le journal d'administration copie des corps de requêtes, ce n'est pas un usage
const TABLES_IGNOREES = new Set(['audit_logs', 'SequelizeMeta', 'media']);
const TYPES_TEXTE = new Set(['char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'json']);

const RE_ADRESSE = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>\\)]+/g;
const RE_CHEMIN = /eventculture\/[A-Za-z0-9_\-./]+/g;

/** Identifiants de fichiers cités dans un texte (adresse complète ou chemin), avec et sans extension */
function idsDansTexte(brut, lireUrlCloudinary) {
  const ids = new Set();
  if (typeof brut !== 'string' || !brut) return ids;
  // Formes rencontrées dans des JSON ou des liens : « \/ », « %2F », « &quot; » (relecture du 2026-11-16)
  const texte = brut.replace(/\\\//g, '/').replace(/%2F/gi, '/').replace(/%3A/gi, ':').replace(/&quot;/g, '"');
  for (const adresse of texte.match(RE_ADRESSE) || []) {
    const id = lireUrlCloudinary(adresse)?.publicId;
    if (id) ids.add(id);
  }
  for (const chemin of texte.match(RE_CHEMIN) || []) {
    const propre = chemin.replace(/[.]+$/, '');
    ids.add(propre);
    ids.add(propre.replace(/\.[A-Za-z0-9]{2,5}$/, ''));
  }
  return ids;
}

/** Le fichier est-il cité ? (raw garde son extension dans l'identifiant ; image et vidéo non) */
function estCite(publicId, refs) {
  return refs.has(publicId) || refs.has(publicId.replace(/\.[A-Za-z0-9]{2,5}$/, ''));
}

/**
 * Tous les identifiants de fichiers cités par la base.
 * @param {import('sequelize').Sequelize} sequelize
 */
async function referencesDuSite(sequelize, lireUrlCloudinary) {
  const refs = new Set();
  const ajouter = (valeur) => {
    const texte = valeur && typeof valeur === 'object' ? JSON.stringify(valeur) : String(valeur ?? '');
    for (const id of idsDansTexte(texte, lireUrlCloudinary)) refs.add(id);
  };
  const [colonnes] = await sequelize.query(`SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS d
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
  const q = (nom) => `\`${String(nom).replace(/`/g, '``')}\``;
  let lues = 0;
  for (const { t, c, d } of colonnes) {
    if (TABLES_IGNOREES.has(t) || !TYPES_TEXTE.has(String(d).toLowerCase())) continue;
    const col = String(d).toLowerCase() === 'json' ? `CAST(${q(c)} AS CHAR)` : q(c);
    const [lignes] = await sequelize.query(
      `SELECT ${col} AS v FROM ${q(t)} WHERE ${col} LIKE '%cloudinary.com%' OR ${col} LIKE '%eventculture/%'`
    );
    lues += 1;
    for (const l of lignes) ajouter(l.v);
  }
  // Media : rattachés (œuvre, événement), ou cités par un bloc d'article ou un extrait de livre ;
  // les lignes « journal » d'un envoi ne comptent pas. Miniature : toujours.
  const [medias] = await sequelize.query(`SELECT m.url AS v, m.thumbnail_url AS m2, m.titre AS m3, m.description AS m4 FROM media m
    WHERE m.id_oeuvre IS NOT NULL OR m.id_evenement IS NOT NULL
       OR m.id_media IN (SELECT id_media FROM article_block WHERE id_media IS NOT NULL)
       OR m.id_media IN (SELECT id_media_extrait_pdf FROM livre WHERE id_media_extrait_pdf IS NOT NULL)
       OR m.id_media IN (SELECT id_media_extrait_audio FROM livre WHERE id_media_extrait_audio IS NOT NULL)`);
  for (const m of medias) { ajouter(m.v); ajouter(m.m2); ajouter(m.m3); ajouter(m.m4); }
  const [miniatures] = await sequelize.query('SELECT thumbnail_url AS v FROM media WHERE thumbnail_url IS NOT NULL');
  for (const m of miniatures) ajouter(m.v);
  return { refs, colonnesLues: lues };
}

/** Tous les fichiers du site sur Cloudinary (images, vidéos et audios, documents), hors quarantaine */
async function fichiersCloudinary(cloudinary) {
  const fichiers = [];
  for (const type of ['image', 'video', 'raw']) {
    let curseur;
    do {
      const r = await cloudinary.api.resources({ type: 'upload', resource_type: type, prefix: RACINE, max_results: 500, ...(curseur ? { next_cursor: curseur } : {}) });
      for (const f of r?.resources || []) {
        if (EXCLUS.some((e) => f.public_id.startsWith(e))) continue;
        fichiers.push({ public_id: f.public_id, resource_type: type, bytes: f.bytes || 0, created_at: f.created_at, secure_url: f.secure_url });
      }
      curseur = r?.next_cursor;
    } while (curseur);
  }
  return fichiers;
}

/** Fichiers inutilisés : cités nulle part et plus vieux que AGE_MIN_JOURS */
function inutilises(fichiers, refs, maintenant = Date.now()) {
  const limite = maintenant - AGE_MIN_JOURS * 24 * 3600 * 1000;
  return fichiers.filter((f) => !estCite(f.public_id, refs) && new Date(f.created_at).getTime() < limite);
}

/** Résumé par dossier : nombre et taille */
function resume(liste) {
  const parDossier = {};
  for (const f of liste) {
    const dossier = f.public_id.split('/').slice(0, -1).join('/') || '(racine)';
    parDossier[dossier] = parDossier[dossier] || { nombre: 0, octets: 0 };
    parDossier[dossier].nombre += 1;
    parDossier[dossier].octets += f.bytes;
  }
  return { nombre: liste.length, octets: liste.reduce((s, f) => s + f.bytes, 0), parDossier };
}

/** Nouvel identifiant dans la corbeille (et l'inverse pour la restauration) */
const versCorbeille = (publicId) => CORBEILLE + publicId.replace(/^eventculture\//, '');
const depuisCorbeille = (publicId) => `eventculture/${publicId.slice(CORBEILLE.length)}`;

/**
 * Peut-on déplacer ? Base de production (adresse du site), au moins quelques fichiers cités, et pas
 * trop de fichiers jugés inutilisés. @returns {string|null} la raison du refus, ou null
 */
function refusDeplacement({ env = process.env, citees, total, aDeplacer }) {
  if (env.NODE_ENV !== 'production') return 'seulement sur le serveur de production (NODE_ENV=production)';
  if (!/(^|[/.])taladz\.com(?=[/:]|$)/i.test(String(env.FRONTEND_URL || ''))) return 'FRONTEND_URL ne désigne pas taladz.com : ce n’est pas la base de production';
  if (citees < 20) return `seulement ${citees} fichiers cités dans la base : base vide ou mauvaise base`;
  if (total > 0 && aDeplacer / total > PART_MAX_INUTILISES) {
    return `${aDeplacer} fichiers sur ${total} jugés inutilisés (plus de ${PART_MAX_INUTILISES * 100} %) : vérifiez à la main avant tout`;
  }
  return null;
}

module.exports = {
  idsDansTexte, estCite, referencesDuSite, fichiersCloudinary, inutilises, resume, refusDeplacement,
  versCorbeille, depuisCorbeille, AGE_MIN_JOURS, CORBEILLE, CORBEILLE_JOURS, PART_MAX_INUTILISES
};
