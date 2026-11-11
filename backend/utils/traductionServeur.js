/**
 * Traduction des messages écrits en français dans les services, les DTO et les contrôleurs
 * (« Cet email est déjà utilisé », « Vous ne pouvez pas modifier cette œuvre »…).
 *
 * Plutôt que de modifier plus de 300 endroits du code, les réponses sont traduites au moment de
 * l'envoi : le message principal (error, message) et le détail de chaque champ (details, errors).
 * Le dictionnaire i18n/serveur/<langue>.json associe le texte français exact à sa traduction ; un texte
 * absent reste tel quel (rien ne casse). Le tamazight n'a pas encore de traduction : le français
 * est gardé, comme pour le reste du serveur. Audit V11 FRM-5 (lot 2).
 */
const DICTIONNAIRES = {};
for (const langue of ['ar', 'en']) {
  try {
    DICTIONNAIRES[langue] = require(`../i18n/serveur/${langue}.json`);
  } catch {
    DICTIONNAIRES[langue] = {};
  }
}

// « <ressource> non trouvé(e) » : message fabriqué par AppError.notFound(ressource)
const NON_TROUVE = /^(.+) non trouvé\(e\)$/;
const PAR_IDENTIFIANT = /^Resource with id \S+$/;
const FORMULES_NON_TROUVE = {
  ar: (nom) => `لم يُعثر على: ${nom}`,
  en: (nom) => `${nom} not found`,
};

/**
 * Messages à variables (« Il en reste 3 seulement. », « Bloc 2 : type inconnu ») : section « _modeles »
 * du dictionnaire, clé = phrase française avec des repères (audit V11 FRM-17) :
 * - {n1}, {n2} : nombre, recopié ;
 * - {t1}, {t2} : texte saisi par quelqu'un (nom de profil, titres d'événements…), recopié tel quel ;
 * - {l1} : libellé fixe (« Adresse », « Le lien du programme »…), traduit par la section « _libelles » ;
 *   libellé inconnu : la phrase reste en français (même principe que les textes absents).
 */
const REPERE = /\{([ntl])(\d)\}/g;
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const motifDuModele = (cle) => {
  const reperes = [];
  let source = '';
  let fin = 0;
  for (const m of cle.matchAll(REPERE)) {
    source += echapper(cle.slice(fin, m.index));
    source += m[1] === 'n' ? '(-?\\d+(?:[.,]\\d+)?)' : '(.+?)';
    reperes.push(m[1] + m[2]);
    fin = m.index + m[0].length;
  }
  return { motif: new RegExp(`^${source}${echapper(cle.slice(fin))}$`), reperes };
};
// Les motifs viennent des clés françaises (identiques dans chaque langue) : compilés une fois
const MODELES = Object.keys(DICTIONNAIRES.en._modeles || DICTIONNAIRES.ar._modeles || {})
  .map((cle) => ({ cle, ...motifDuModele(cle) }));

function traduireParModele(texte, dico) {
  const traductions = dico._modeles || {};
  const libelles = dico._libelles || {};
  for (const { cle, motif, reperes } of MODELES) {
    const m = motif.exec(texte);
    if (!m || typeof traductions[cle] !== 'string') continue;
    const valeurs = {};
    let complet = true;
    reperes.forEach((r, i) => {
      if (r[0] === 'l') {
        if (typeof libelles[m[i + 1]] === 'string') valeurs[r] = libelles[m[i + 1]];
        else complet = false;
      } else valeurs[r] = m[i + 1];
    });
    if (complet) return traductions[cle].replace(REPERE, (tout, type, rang) => valeurs[type + rang] ?? tout);
  }
  return null;
}

/** Vrai si le texte a la forme d'un des modèles (pour le garde-fou des tests) */
const correspondAUnModele = (texte) => MODELES.some(({ motif }) => motif.test(texte));

/** Texte français → langue demandée (inchangé si inconnu, ou si la langue est le français) */
function traduireTexteServeur(texte, langue) {
  if (typeof texte !== 'string') return texte;
  const dico = DICTIONNAIRES[langue];
  if (!dico) return texte;
  if (Object.prototype.hasOwnProperty.call(dico, texte) && typeof dico[texte] === 'string') return dico[texte];
  const m = NON_TROUVE.exec(texte);
  if (m && FORMULES_NON_TROUVE[langue]) {
    const ressources = dico._ressources || {};
    // « Resource with id 12 » (BaseService) : l'identifiant n'aide pas la personne
    const nom = PAR_IDENTIFIANT.test(m[1]) ? ressources.Ressource : ressources[m[1]];
    if (nom) return FORMULES_NON_TROUVE[langue](nom);
  }
  return traduireParModele(texte, dico) ?? texte;
}

const traduireListe = (liste, langue) => liste.map((element) => {
  if (typeof element === 'string') return traduireTexteServeur(element, langue);
  if (element && typeof element === 'object' && typeof element.message === 'string') {
    return { ...element, message: traduireTexteServeur(element.message, langue) };
  }
  return element;
});

/** Corps d'une réponse JSON : seuls error, message, details[].message et errors[].message sont touchés */
function traduireCorps(corps, langue) {
  if (!DICTIONNAIRES[langue] || !corps || typeof corps !== 'object' || Array.isArray(corps)) return corps;
  let copie = null;
  const modifier = (cle, valeur) => {
    if (valeur === corps[cle]) return;
    copie = copie || { ...corps };
    copie[cle] = valeur;
  };
  if (typeof corps.error === 'string') modifier('error', traduireTexteServeur(corps.error, langue));
  if (typeof corps.message === 'string') modifier('message', traduireTexteServeur(corps.message, langue));
  for (const cle of ['details', 'errors']) {
    if (Array.isArray(corps[cle])) {
      const traduite = traduireListe(corps[cle], langue);
      if (traduite.some((e, i) => e !== corps[cle][i])) modifier(cle, traduite);
    }
  }
  return copie || corps;
}

/** Middleware : traduit les réponses JSON dans la langue de la requête (req.lang) */
function traduireReponses(req, res, next) {
  const langue = req.lang || req.language;
  if (!DICTIONNAIRES[langue]) return next();
  const jsonOriginal = res.json.bind(res);
  res.json = (corps) => jsonOriginal(traduireCorps(corps, langue));
  next();
}

module.exports = { traduireTexteServeur, traduireCorps, traduireReponses, correspondAUnModele };
