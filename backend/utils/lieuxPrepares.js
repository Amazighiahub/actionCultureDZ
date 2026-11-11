/**
 * Lieux préparés par l'équipe dans une migration (sites et points de visite), en brouillon et soumis à la
 * relecture : chaque nouveau site reçoit une demande « creation » dans la file Propositions patrimoine ;
 * l'accepter publie le site et ses points créés jusque-là (services/patrimoine/propositionsLieu.js).
 *
 * Format d'un site : { commune, nom, adresse?, latitude, longitude, typePatrimoine, detail?, points? }
 * - commune : nom ASCII de la commune (table communes), cherchée dans la wilaya donnée
 * - detail : { description, histoire, traditions, gastronomie, artisanat_local, architecture, infos_pratiques,
 *   referencesHistoriques } en { fr, ar, en } ; un point peut aussi donner seulement `description`
 * - points : sites du même format, rattachés au site dans l'ordre de la liste
 *
 * Site déjà publié : `existantSeulement: true` (retrouvé par son nom, jamais créé) ; ses textes vides sont remplis,
 * ses nouveaux points ajoutés à la suite, chacun avec sa demande de validation.
 *
 * Rejouable : un lieu déjà présent (même nom français, même commune, même site parent) n'est pas recréé.
 * Hors du dossier migrations : sequelize-cli prendrait tout fichier de ce dossier pour une migration.
 */
const json = (v) => (v == null ? null : JSON.stringify(v));

/**
 * Compte administrateur actif : celui choisi (idChoisi) s'il l'est, sinon le premier. Administrateur par son rôle
 * « Administrateur » ou par son type de compte (29), comme le reconnaît le site (middlewares/authMiddleware.js).
 */
async function administrateur(select, idChoisi = null) {
  const condition = `u.statut = 'actif' AND (u.id_type_user = 29 OR EXISTS (
      SELECT 1 FROM userroles ur JOIN role r ON r.id_role = ur.id_role
       WHERE ur.id_user = u.id_user AND r.nom_role = 'Administrateur'))`;
  if (idChoisi) {
    const [choisi] = await select(`SELECT u.id_user FROM user u WHERE u.id_user = ? AND ${condition}`, [idChoisi]);
    if (choisi) return choisi.id_user;
  }
  const [premier] = await select(`SELECT u.id_user FROM user u WHERE ${condition} ORDER BY u.id_user ASC LIMIT 1`);
  return premier ? premier.id_user : null;
}

/**
 * Crée les sites et leurs points. Une seule transaction pour toute la liste (audit V11 BDD-10) : une
 * erreur au milieu n'y laisse plus de lieu sans détail ni de site sans sa demande de validation.
 */
async function creerSites(queryInterface, sites, options) {
  const s = queryInterface.sequelize;
  return s.transaction((transaction) => creerSitesDans(s, transaction, sites, options));
}

async function creerSitesDans(s, transaction, sites, { wilayaId, idCreateur }) {
  const select = (sql, replacements) => s.query(sql, { replacements, type: s.QueryTypes.SELECT, transaction });
  const executer = (sql, replacements) => s.query(sql, { replacements, transaction });

  const communes = new Map();
  const commune = async (nom) => {
    if (!communes.has(nom)) {
      const [c] = await select(
        `SELECT c.id_commune FROM communes c JOIN dairas d ON d.id_daira = c.dairaId
          WHERE d.wilayaId = ? AND c.commune_name_ascii = ? LIMIT 1`, [wilayaId, nom]
      );
      communes.set(nom, c ? c.id_commune : null);
    }
    return communes.get(nom);
  };

  const existant = async (nomFr, idCommune, idParent) => {
    const [l] = await select(
      `SELECT id_lieu FROM lieu WHERE communeId = ? AND JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')) = ?
         AND ${idParent ? 'id_lieu_parent = ?' : 'id_lieu_parent IS NULL'} LIMIT 1`,
      idParent ? [idCommune, nomFr, idParent] : [idCommune, nomFr]
    );
    return l ? l.id_lieu : null;
  };

  const creerLieu = async (l, idCommune, idParent, ordre) => {
    const [idLieu] = await executer(
      `INSERT INTO lieu (typeLieu, typePatrimoine, communeId, nom, adresse, latitude, longitude, id_createur, statut,
                         id_lieu_parent, ordre_visite, createdAt, updatedAt)
       VALUES ('Commune', ?, ?, ?, ?, ?, ?, ?, 'brouillon', ?, ?, NOW(), NOW())`,
      [l.typePatrimoine, idCommune, json(l.nom), json(l.adresse || {}), l.latitude, l.longitude,
        idCreateur, idParent, ordre]
    );
    const d = l.detail || { description: l.description };
    await executer(
      `INSERT INTO detail_lieux (id_lieu, description, horaires, histoire, referencesHistoriques, gastronomie, traditions,
                                 artisanat_local, personnalites, architecture, infos_pratiques, nb_notations, nb_contributions,
                                 createdAt, updatedAt)
       VALUES (?, ?, '{}', ?, ?, ?, ?, ?, NULL, ?, ?, 0, 0, NOW(), NOW())`,
      [idLieu, json(d.description || {}), json(d.histoire || {}), json(d.referencesHistoriques || {}),
        json(d.gastronomie), json(d.traditions), json(d.artisanat_local), json(d.architecture), json(d.infos_pratiques)]
    );
    return idLieu;
  };

  const demande = (idLieu, nom) => executer(
    `INSERT INTO proposition_lieu (id_lieu, id_user, action, donnees, statut, date_creation)
     VALUES (?, ?, 'creation', ?, 'en_attente', NOW())`,
    [idLieu, idCreateur, json({ corps: { nom } })]
  );

  for (const site of sites) {
    let idSite;
    let nouveau = false;
    if (site.existantSeulement) {
      // Site déjà sur le site (publié ou non) : retrouvé par son nom, jamais recréé
      const [l] = await select(
        `SELECT id_lieu FROM lieu WHERE id_lieu_parent IS NULL AND JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')) = ?
          ORDER BY statut = 'publie' DESC, id_lieu ASC LIMIT 1`, [site.nom.fr]
      );
      if (!l) continue;
      idSite = l.id_lieu;
      await completerSiVide(executer, select, idSite, site.detail || {});
    } else {
      const idCommune = await commune(site.commune);
      if (!idCommune) continue; // commune absente : rien à rattacher
      idSite = await existant(site.nom.fr, idCommune, null);
      nouveau = !idSite;
      if (nouveau) idSite = await creerLieu(site, idCommune, null, null);
    }
    // Ordre des nouveaux points : à la suite de ceux du site
    const [{ n: dejaLa }] = await select('SELECT COUNT(*) AS n FROM lieu WHERE id_lieu_parent = ?', [idSite]);
    let ordre = nouveau ? 1 : Number(dejaLa) + 1;
    for (const point of site.points || []) {
      const idCommunePoint = await commune(point.commune);
      if (idCommunePoint && !(await existant(point.nom.fr, idCommunePoint, idSite))) {
        const idPoint = await creerLieu(point, idCommunePoint, idSite, ordre);
        ordre += 1;
        // Site déjà existant : chaque nouveau point a sa propre demande de validation
        if (!nouveau && idCreateur) await demande(idPoint, point.nom);
      }
    }
    // Nouveau site : une demande APRÈS les points ; l'accepter publie le site et les points créés jusque-là.
    // Un compte est obligatoire pour une proposition.
    if (nouveau && idCreateur) await demande(idSite, site.nom);
  }
}

/** Remplit les textes encore vides d'un lieu existant (jamais une saisie déjà faite) */
async function completerSiVide(executer, select, idLieu, detail) {
  const cles = Object.keys(detail);
  if (!cles.length) return;
  const [d] = await select(`SELECT ${cles.join(', ')} FROM detail_lieux WHERE id_lieu = ?`, [idLieu]);
  if (!d) return;
  const vide = (v) => {
    const o = typeof v === 'string' ? JSON.parse(v) : v;
    return !o || !Object.values(o).some((x) => String(x || '').trim());
  };
  const aRemplir = cles.filter((c) => vide(d[c]));
  if (aRemplir.length) {
    await executer(`UPDATE detail_lieux SET ${aRemplir.map((c) => `${c} = ?`).join(', ')}, updatedAt = NOW() WHERE id_lieu = ?`,
      [...aRemplir.map((c) => json(detail[c])), idLieu]);
  }
}

/**
 * Retire les lieux de cette liste restés en brouillon (un lieu publié entre-temps est gardé).
 * Descente étroite (audit V11 BDD-10) : seulement dans la wilaya de la migration et, si `createurs` est
 * donné, seulement les lieux de ces comptes (null = lieu sans propriétaire). Avant : tout brouillon du
 * même nom français, dans n'importe quelle wilaya et de n'importe qui. Une seule transaction.
 * @param {{ wilayaId: number, createurs?: Array<number|null> }} filtre
 */
async function retirerSites(queryInterface, sites, { wilayaId, createurs } = {}) {
  if (!wilayaId) throw new Error('retirerSites : wilayaId obligatoire');
  const s = queryInterface.sequelize;
  // Un site existant (existantSeulement) n'est jamais retiré, seulement les points ajoutés ici
  const noms = sites.flatMap((site) => [...(site.existantSeulement ? [] : [site.nom.fr]), ...(site.points || []).map((p) => p.nom.fr)]);
  if (!noms.length) return;

  const conditions = [];
  const replacements = [wilayaId, noms];
  if (Array.isArray(createurs)) {
    const ids = [...new Set(createurs.filter((id) => id != null))];
    const parCompte = [];
    if (createurs.includes(null)) parCompte.push('l.id_createur IS NULL');
    if (ids.length) { parCompte.push('l.id_createur IN (?)'); replacements.push(ids); }
    if (!parCompte.length) return;
    conditions.push(`(${parCompte.join(' OR ')})`);
  }

  await s.transaction(async (transaction) => {
    const lignes = await s.query(
      `SELECT l.id_lieu FROM lieu l
         JOIN communes c ON c.id_commune = l.communeId
         JOIN dairas d ON d.id_daira = c.dairaId
        WHERE d.wilayaId = ? AND l.statut = 'brouillon' AND JSON_UNQUOTE(JSON_EXTRACT(l.nom, '$.fr')) IN (?)
          ${conditions.map((c) => `AND ${c}`).join(' ')}
        ORDER BY l.id_lieu_parent IS NULL, l.id_lieu DESC`,
      { replacements, type: s.QueryTypes.SELECT, transaction }
    );
    for (const { id_lieu: id } of lignes) {
      await s.query('DELETE FROM proposition_lieu WHERE id_lieu = ?', { replacements: [id], transaction });
      await s.query('DELETE FROM detail_lieux WHERE id_lieu = ?', { replacements: [id], transaction });
      await s.query('DELETE FROM lieu WHERE id_lieu = ?', { replacements: [id], transaction });
    }
  });
}

module.exports = { administrateur, creerSites, retirerSites };
