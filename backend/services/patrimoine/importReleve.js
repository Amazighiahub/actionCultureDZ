/**
 * Import d'un relevé Excel de points de visite (modèle docs/modeles/Modele_points_GPS_Taladz.xlsx).
 * Partagé par le script scripts/import-points-visite.js et la page « Importer un relevé Excel »
 * du tableau de bord administrateur.
 *
 * Feuille « Points » (sinon la première) : colonnes lues par leur titre
 *   ID · Nom du point · Nom en arabe · Nom en tamazight · Type (ou Type Taladz) · Description
 *   · Latitude · Longitude · Repère (point intérieur) · Source
 * Feuille « Site » (facultative) : le lieu principal, pour le retrouver ou le créer.
 *
 * Règles :
 * - une ligne dont l'ID n'est pas un nombre (ligne « Exemple ») est ignorée ;
 * - point intérieur : latitude et longitude vides + repère → position du site, retrouvé par son nom ;
 * - relançable : un point déjà importé (même position) est mis à jour, jamais dupliqué ;
 *   une cellule vide n'efface jamais une valeur en base ;
 * - un point sans nom est importé en brouillon (« Point 12 – à identifier »).
 */
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { texteLisible } = require('../../helpers/i18n');

const TYPES = ['monument', 'musee', 'ville_village', 'site_archeologique', 'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre'];
// Précision du relevé (6 décimales ≈ 10 cm) : deux points à 1 m l'un de l'autre restent distincts
const TOLERANCE = 0.0000005;

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Valeur lisible d'une cellule exceljs (texte riche, lien, formule) */
const texte = (cell) => {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(r => r.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
};

// Colonnes de la feuille Points, reconnues par leur titre (sans accent ni casse)
const COLONNES = {
  id: ['id', 'n°', 'no', 'numero'],
  nom: ['nom du point', 'nom du point (francais)', 'nom (francais)', 'nom'],
  nomAr: ['nom en arabe', 'nom (arabe)'],
  nomTz: ['nom en tamazight', 'nom (tamazight)'],
  type: ['type taladz', 'type'],
  description: ['description'],
  latitude: ['latitude'],
  longitude: ['longitude'],
  repere: ['repere (point interieur)', 'repere'],
  source: ['source']
};

// Libellés du modèle → types Taladz (les valeurs Taladz brutes sont aussi acceptées)
const TYPES_LIBELLES = {
  'monument': 'monument', 'site archeologique': 'site_archeologique', 'musee': 'musee',
  'edifice religieux': 'edifice_religieux', 'palais / forteresse': 'palais_forteresse', 'palais/forteresse': 'palais_forteresse',
  'site naturel': 'site_naturel', 'ville / village': 'ville_village', 'ville/village': 'ville_village', 'autre': 'autre'
};
const typeTaladz = (t) => {
  const v = sansAccent(t);
  if (TYPES.includes(v)) return v;
  return TYPES_LIBELLES[v] || null;
};

// Champs de la feuille Site (colonne A = libellé, colonne B = valeur)
const CHAMPS_SITE = {
  'nom du lieu (francais)': 'nom', 'nom en arabe': 'nomAr', 'nom en tamazight': 'nomTz', 'type du lieu': 'type',
  'wilaya': 'wilaya', 'daira': 'daira', 'commune': 'commune',
  'latitude du lieu': 'latitude', 'longitude du lieu': 'longitude',
  'rempli par (nom et prenom)': 'contributeur', 'telephone ou e-mail': 'contact', 'date du releve': 'date'
};

const nombre = (t) => {
  const n = parseFloat(String(t || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function lireSite(ws) {
  if (!ws) return null;
  const site = {};
  ws.eachRow((row) => {
    const cle = CHAMPS_SITE[sansAccent(texte(row.getCell(1)))];
    if (cle) site[cle] = texte(row.getCell(2));
  });
  if (!Object.values(site).some(Boolean)) return null;
  return {
    ...site,
    latitude: nombre(site.latitude),
    longitude: nombre(site.longitude),
    typeTaladz: typeTaladz(site.type)
  };
}

/**
 * Lit un relevé (Buffer ou chemin de fichier).
 * @returns {{ site: object|null, lignes: object[], ignorees: string[] }}
 */
async function lireReleve(source) {
  const wb = new ExcelJS.Workbook();
  if (Buffer.isBuffer(source)) await wb.xlsx.load(source);
  else await wb.xlsx.readFile(source);
  const ws = wb.getWorksheet('Points') || wb.worksheets[0];
  if (!ws) throw new Error('Classeur vide');

  const pos = {};
  ws.getRow(1).eachCell((cell, col) => {
    const titre = sansAccent(texte(cell));
    for (const [cle, variantes] of Object.entries(COLONNES)) {
      if (pos[cle] === undefined && variantes.includes(titre)) pos[cle] = col;
    }
  });
  for (const requis of ['id', 'latitude', 'longitude']) {
    if (pos[requis] === undefined) throw new Error(`Colonne « ${COLONNES[requis][0]} » introuvable dans la feuille « ${ws.name} »`);
  }
  const lire = (row, cle) => (pos[cle] ? texte(row.getCell(pos[cle])) : '');

  const lignes = [];
  const ignorees = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const id = parseInt(lire(row, 'id'), 10);
    if (!Number.isInteger(id)) return;                       // ligne « Exemple », vide…
    const lat = lire(row, 'latitude');
    const lon = lire(row, 'longitude');
    const latitude = nombre(lat);
    const longitude = nombre(lon);
    const repere = lire(row, 'repere');
    const nom = lire(row, 'nom'); const nomAr = lire(row, 'nomAr'); const nomTz = lire(row, 'nomTz');
    const interieur = !lat && !lon && !!repere;
    if (!interieur && (latitude === null || longitude === null)) {
      // Ligne de modèle encore vide : rien à signaler ; sinon on dit pourquoi elle est ignorée
      if (nom || nomAr || lat || lon) ignorees.push({ id, nom: nom || nomAr, raison: 'position GPS manquante ou illisible' });
      return;
    }
    lignes.push({
      id, interieur, repere,
      latitude: interieur ? null : latitude,
      longitude: interieur ? null : longitude,
      nom, nomAr, nomTz,
      description: lire(row, 'description'),
      source: lire(row, 'source'),
      type: lire(row, 'type')
    });
  });

  // Noms en double dans le classeur (plusieurs points sur le forum…) : le n° du relevé les distingue
  const cleNom = (l) => l.nom || l.nomAr;
  const compte = {};
  for (const l of lignes) if (cleNom(l)) compte[cleNom(l)] = (compte[cleNom(l)] || 0) + 1;
  for (const l of lignes) {
    const suffixe = compte[cleNom(l)] > 1 ? ` (point ${l.id})` : '';
    l.nomObjet = {};
    if (l.nom) l.nomObjet.fr = l.nom + suffixe;
    if (l.nomAr) l.nomObjet.ar = l.nomAr + suffixe;
    if (l.nomTz) l.nomObjet['tz-ltn'] = l.nomTz;
    if (!l.nom && !l.nomAr) l.nomObjet.fr = `Point ${l.id} – à identifier`;
    l.nomFinal = l.nomObjet.fr || l.nomObjet.ar;
    l.statut = (l.nom || l.nomAr) ? 'publie' : 'brouillon';
    l.typeFinal = typeTaladz(l.type) || 'site_archeologique';
  }
  return { site: lireSite(wb.getWorksheet('Site')), lignes, ignorees };
}

class ImportReleve {
  /**
   * @param {object} models
   * @param {object} patrimoineService - crée les points (contrôles de profondeur, ordre…)
   */
  constructor(models, patrimoineService) {
    this.models = models;
    this.patrimoineService = patrimoineService;
  }

  /**
   * Commune désignée dans la feuille Site par ses libellés « latin / arabe »
   * (wilaya « 05 - Batna / باتنة », daïra « Arris / أريس », commune « Ghassira / غسيرة »).
   */
  async trouverCommune(site) {
    if (!site?.commune || !site?.wilaya) return null;
    const latin = (t) => String(t).split(' / ')[0].trim();
    const codeW = parseInt(String(site.wilaya), 10);
    const { Commune, Daira, Wilaya } = this.models;
    const chercher = (avecDaira) => Commune.findAll({
      where: { commune_name_ascii: latin(site.commune) },
      include: [{
        model: Daira, required: true,
        ...(avecDaira ? { where: { daira_name_ascii: latin(site.daira) } } : {}),
        include: [{ model: Wilaya, required: true, where: Number.isInteger(codeW) ? { codeW } : {} }]
      }],
      limit: 2
    });
    let communes = await chercher(!!site.daira);
    // Daïra tapée à la main ou erronée : la commune suffit si elle est unique dans la wilaya
    if (!communes.length && site.daira) communes = await chercher(false);
    return communes.length === 1 ? communes[0] : null;
  }

  /** Lieu existant portant le nom du site dans sa commune (évite de le créer deux fois) */
  async trouverSiteExistant(site, communeId) {
    const { Lieu } = this.models;
    const candidats = await Lieu.findAll({
      where: { communeId, id_lieu_parent: null },
      attributes: ['id_lieu', 'nom', 'latitude', 'longitude', 'communeId', 'statut']
    });
    const nom = sansAccent(site.nom); const nomAr = (site.nomAr || '').trim();
    return candidats.find(c => (nom && sansAccent(c.nom?.fr) === nom) || (nomAr && (c.nom?.ar || '').trim() === nomAr)) || null;
  }

  /**
   * Prépare l'import sans rien écrire.
   * @param {object} releve - résultat de lireReleve
   * @param {object} opts
   * @param {number} [opts.parentId] - lieu choisi par l'administrateur ; sinon feuille Site
   */
  async planifier(releve, { parentId } = {}) {
    const { Lieu, DetailLieu } = this.models;
    const plan = { lieu: null, siteACreer: null, erreurs: [], actions: [], ignorees: releve.ignorees };

    if (parentId) {
      plan.lieu = await Lieu.findByPk(parentId);
      if (!plan.lieu) plan.erreurs.push(`Le lieu n° ${parentId} n'existe pas`);
    } else if (releve.site) {
      const commune = await this.trouverCommune(releve.site);
      if (!commune) {
        plan.erreurs.push('Commune de la feuille « Site » introuvable : choisissez la wilaya, la daïra et la commune dans les listes, ou choisissez le lieu');
      } else {
        plan.lieu = await this.trouverSiteExistant(releve.site, commune.id_commune);
        if (!plan.lieu) {
          if (!releve.site.nom && !releve.site.nomAr) plan.erreurs.push('Nom du lieu manquant dans la feuille « Site »');
          if (releve.site.latitude === null || releve.site.longitude === null) plan.erreurs.push('Position GPS du lieu manquante dans la feuille « Site »');
          plan.siteACreer = { ...releve.site, communeId: commune.id_commune, communeNom: commune.commune_name_ascii };
        }
      }
    } else {
      plan.erreurs.push('Choisissez le lieu auquel rattacher les points (ce fichier n\'a pas de feuille « Site »)');
    }
    if (plan.erreurs.length) return plan;

    const existants = plan.lieu ? await Lieu.findAll({ where: { id_lieu_parent: plan.lieu.id_lieu } }) : [];
    const detailsParId = new Map();
    if (existants.length) {
      const details = await DetailLieu.findAll({ where: { id_lieu: { [Op.in]: existants.map(e => e.id_lieu) } } });
      for (const d of details) detailsParId.set(d.id_lieu, d);
    }
    const utilises = new Set();
    const retrouver = (l) => {
      // Point intérieur : même position que le site pour tous, on le retrouve par son nom
      const e = l.interieur
        ? existants.find(x => !utilises.has(x.id_lieu) && ((x.nom?.fr && x.nom.fr === l.nomObjet.fr) || (x.nom?.ar && x.nom.ar === l.nomObjet.ar)))
        : existants.find(x => !utilises.has(x.id_lieu)
          && Math.abs(Number(x.latitude) - l.latitude) < TOLERANCE && Math.abs(Number(x.longitude) - l.longitude) < TOLERANCE);
      if (e) utilises.add(e.id_lieu);
      return e;
    };

    for (const l of releve.lignes) {
      const point = retrouver(l);
      if (!point) { plan.actions.push({ type: 'creer', ligne: l }); continue; }

      // Point déjà importé : chaque langue / cellule remplie remplace la valeur en base, le reste est gardé
      const majLieu = {};
      const nomFusionne = { ...(point.nom || {}), ...(l.nom || l.nomAr ? l.nomObjet : {}) };
      if (JSON.stringify(nomFusionne) !== JSON.stringify(point.nom || {})) majLieu.nom = nomFusionne;
      if (l.repere && point.repere?.fr !== l.repere) majLieu.repere = { ...(point.repere || {}), fr: l.repere };
      if (l.type && point.typePatrimoine !== l.typeFinal) majLieu.typePatrimoine = l.typeFinal;
      if ((l.nom || l.nomAr) && point.statut === 'brouillon') majLieu.statut = 'publie';
      const detail = detailsParId.get(point.id_lieu);
      const majDetail = {};
      if (l.description && detail?.description?.fr !== l.description) majDetail.description = { ...(detail?.description || {}), fr: l.description };
      if (l.source && detail?.referencesHistoriques?.fr !== l.source) majDetail.referencesHistoriques = { ...(detail?.referencesHistoriques || {}), fr: l.source };

      if (!Object.keys(majLieu).length && !Object.keys(majDetail).length) {
        plan.actions.push({ type: 'inchange', ligne: l, point });
      } else {
        plan.actions.push({ type: 'maj', ligne: l, point, detail, majLieu, majDetail, champs: [...Object.keys(majLieu), ...Object.keys(majDetail)] });
      }
    }
    return plan;
  }

  /**
   * Exécute un plan préparé par planifier.
   * @param {number|null} createurId - auteur des lieux et points créés
   */
  async executer(plan, { createurId = null } = {}) {
    if (plan.erreurs.length) throw new Error(plan.erreurs.join(' ; '));
    const { Lieu, DetailLieu } = this.models;
    const bilan = { crees: 0, maj: 0, inchanges: 0, erreurs: [], lieuCree: false };

    let lieu = plan.lieu;
    if (!lieu && plan.siteACreer) {
      const s = plan.siteACreer;
      const nom = {};
      if (s.nom) nom.fr = s.nom;
      if (s.nomAr) nom.ar = s.nomAr;
      if (s.nomTz) nom['tz-ltn'] = s.nomTz;
      const cree = await this.patrimoineService.create({
        nom, latitude: s.latitude, longitude: s.longitude, communeId: s.communeId,
        typePatrimoine: s.typeTaladz || 'ville_village', id_createur: createurId,
        description: {}
      }, { isModerator: true });
      lieu = await Lieu.findByPk(cree.id_lieu);
      bilan.lieuCree = true;
    }
    bilan.idLieu = lieu.id_lieu;

    for (const a of plan.actions) {
      const l = a.ligne;
      try {
        if (a.type === 'inchange') { bilan.inchanges++; continue; }
        if (a.type === 'creer') {
          await this.patrimoineService.create({
            nom: l.nomObjet,
            id_lieu_parent: lieu.id_lieu,
            // Point intérieur : sans coordonnées, le service reprend celles du lieu
            latitude: l.interieur ? undefined : l.latitude,
            longitude: l.interieur ? undefined : l.longitude,
            repere: l.repere ? { fr: l.repere } : undefined,
            typePatrimoine: l.typeFinal,
            ordre_visite: l.id,
            description: l.description ? { fr: l.description } : {},
            referencesHistoriques: l.source ? { fr: l.source } : {},
            id_createur: lieu.id_createur || createurId,
            statut: l.statut
          }, { isModerator: true });
          bilan.crees++;
          continue;
        }
        await this.models.sequelize.transaction(async (transaction) => {
          if (Object.keys(a.majLieu).length) await a.point.update(a.majLieu, { transaction });
          if (Object.keys(a.majDetail).length) {
            if (a.detail) await a.detail.update(a.majDetail, { transaction });
            else await DetailLieu.create({ id_lieu: a.point.id_lieu, ...a.majDetail }, { transaction });
          }
        });
        bilan.maj++;
      } catch (error) {
        bilan.erreurs.push({ id: l.id, nom: l.nomFinal, erreur: error.message });
      }
    }
    return bilan;
  }
}

/** Plan résumé pour l'affichage (aperçu de l'admin, aperçu du script) */
function resumerPlan(plan) {
  const lieu = plan.lieu
    ? { id: plan.lieu.id_lieu, nom: texteLisible(plan.lieu.nom), existe: true }
    : plan.siteACreer
      ? { id: null, nom: plan.siteACreer.nom || plan.siteACreer.nomAr || '', existe: false, commune: plan.siteACreer.communeNom }
      : null;
  const compte = (t) => plan.actions.filter(a => a.type === t).length;
  return {
    lieu,
    erreurs: plan.erreurs,
    bilan: { creer: compte('creer'), maj: compte('maj'), inchanges: compte('inchange'), ignorees: plan.ignorees.length },
    points: plan.actions.map(a => ({
      id: a.ligne.id, action: a.type, nom: a.ligne.nomFinal, nomAr: a.ligne.nomAr || null,
      type: a.ligne.typeFinal, statut: a.ligne.statut, interieur: a.ligne.interieur,
      repere: a.ligne.repere || null, latitude: a.ligne.latitude, longitude: a.ligne.longitude,
      champs: a.champs || []
    })),
    ignorees: plan.ignorees
  };
}

module.exports = { lireReleve, ImportReleve, resumerPlan, typeTaladz, texte };
