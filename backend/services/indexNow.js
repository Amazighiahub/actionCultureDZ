/**
 * IndexNow : prévenir Bing (et Yandex, Seznam, Naver) dès qu'une page publique est publiée ou
 * modifiée. Bing alimente aussi la recherche de ChatGPT : une fiche y apparaît en quelques jours
 * au lieu de quelques semaines. Google n'utilise pas IndexNow (il lit le plan du site).
 *
 * La clé est publique par conception : le moteur la vérifie à /api/indexnow/<clé>.txt.
 * Production seulement ; un échec ne bloque jamais la publication.
 */
const logger = require('../utils/logger');

const CLE = process.env.INDEXNOW_KEY || '2de4458f115681a565845ec46f987550';
const SITE_URL = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');
const ACTIF = process.env.NODE_ENV === 'production' && process.env.INDEXNOW_DESACTIVE !== '1';
const DELAI_MS = 10 * 60 * 1000;
const derniers = new Map();

/**
 * @param {string|string[]} chemins chemins du site (« /oeuvres/12 ») ou adresses complètes
 * @returns {Promise<boolean>} true si l'envoi a été accepté
 */
async function signaler(chemins, { envoyer = fetch, actif = ACTIF } = {}) {
  if (!actif) return false;
  const maintenant = Date.now();
  const urls = [...new Set([].concat(chemins).filter(Boolean)
    .map((c) => (/^https?:\/\//.test(c) ? c : `${SITE_URL}${encodeURI(c.startsWith('/') ? c : `/${c}`)}`)))]
    // Même page signalée plusieurs fois de suite (double clic, modifications rapprochées) : une seule fois
    .filter((u) => !(derniers.get(u) > maintenant - DELAI_MS));
  if (!urls.length) return false;
  urls.forEach((u) => derniers.set(u, maintenant));
  if (derniers.size > 5000) derniers.clear();
  try {
    const reponse = await envoyer('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key: CLE, keyLocation: `${SITE_URL}/api/indexnow/${CLE}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(8000),
    });
    if (!reponse.ok && reponse.status !== 202) logger.warn(`IndexNow : réponse ${reponse.status}`);
    return reponse.ok || reponse.status === 202;
  } catch (err) {
    logger.warn(`IndexNow : ${err.message}`);
    return false;
  }
}

/** Sans attendre la réponse : la publication ne doit pas être ralentie */
const signalerPlusTard = (chemins) => { signaler(chemins).catch(() => {}); };

/**
 * Pages publiques touchées par une œuvre : la sienne (article, artisanat ou œuvre) et le portfolio
 * de son auteur, où elle apparaît. Calculé en arrière-plan, sans jamais bloquer.
 */
function signalerOeuvre(models, oeuvre) {
  if (!ACTIF || !oeuvre) return;
  (async () => {
    const { professionnelPath, oeuvrePath, artisanatPath } = require('../utils/slug');
    const chemins = [];
    const a = oeuvre.id_type_oeuvre === 7 && models?.Artisanat
      ? await models.Artisanat.findOne({ where: { id_oeuvre: oeuvre.id_oeuvre }, attributes: ['id_artisanat'] }) : null;
    chemins.push(a ? artisanatPath(a.id_artisanat, oeuvre.titre) : oeuvrePath(oeuvre.id_oeuvre, oeuvre.titre, oeuvre.id_type_oeuvre));
    if (oeuvre.saisi_par && models?.User) {
      const u = await models.User.findByPk(oeuvre.saisi_par, { attributes: ['id_user', 'nom', 'prenom', 'profil_public'] });
      if (u && u.profil_public !== false) chemins.push(professionnelPath(u.id_user, u.prenom, u.nom));
    }
    await signaler(chemins);
  })().catch(() => {});
}

module.exports = { signaler, signalerPlusTard, signalerOeuvre, CLE };
