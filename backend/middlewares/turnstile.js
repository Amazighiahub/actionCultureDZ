/**
 * Contrôle anti-robots Cloudflare Turnstile sur les formulaires publics qui créent un compte ou
 * envoient un e-mail (inscription, mot de passe oublié, contact, newsletter).
 *
 * - Sans TURNSTILE_SECRET_KEY : rien n'est vérifié (le site fonctionne avant la mise en place de la clé).
 * - Jeton absent, faux, déjà utilisé, d'un autre site ou d'un autre formulaire : refus (400).
 * - Cloudflare injoignable (réseau, délai, erreur 5xx) : on laisse passer, avec un avertissement ;
 *   les limites existantes (essais, quotas d'e-mails) restent la protection de fond.
 * Le jeton (champ `turnstile_token`) est retiré de la requête après contrôle : il n'atteint jamais la base.
 */
const logger = require('../utils/logger');

const URL_VERIFICATION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DELAI_MS = 5000;
// Clés de test publiées par Cloudflare (essais en local) : elles ne renvoient ni le vrai nom de domaine ni l'action
const CLE_DE_TEST = /^[123]x0{31}AA$/;

let avertiSansCle = false;
let avertiCleDeTest = false;

const enProduction = () => process.env.NODE_ENV === 'production';

const hotesAutorises = () => {
  // localhost seulement hors production
  const hotes = new Set(enProduction() ? [] : ['localhost', '127.0.0.1']);
  for (const url of [process.env.FRONTEND_URL, 'https://taladz.com']) {
    try {
      const h = new URL(url).hostname;
      hotes.add(h);
      hotes.add(h.startsWith('www.') ? h.slice(4) : `www.${h}`);
    } catch { /* adresse absente ou invalide */ }
  }
  return hotes;
};

/** Interroge Cloudflare ; renvoie { ok, joignable, raison } */
async function interrogerCloudflare(secret, jeton, ip) {
  const corps = new URLSearchParams({ secret, response: jeton });
  if (ip) corps.set('remoteip', ip);
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), DELAI_MS);
  try {
    const rep = await fetch(URL_VERIFICATION, { method: 'POST', body: corps, signal: arret.signal });
    if (rep.status >= 500) return { joignable: false, raison: `HTTP ${rep.status}` };
    // Cloudflare a répondu : une réponse illisible ou une erreur 4xx vaut refus (jamais « injoignable »)
    let donnees = null;
    try { donnees = await rep.json(); } catch { /* réponse illisible */ }
    if (!rep.ok || !donnees) return { joignable: true, donnees: { success: false, 'error-codes': [`http-${rep.status}`] } };
    return { joignable: true, donnees };
  } catch (err) {
    return { joignable: false, raison: err.name === 'AbortError' ? 'délai dépassé' : err.message };
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * @param {string} action - nom du formulaire, identique à celui donné au widget (inscription, mot_de_passe, contact, newsletter)
 */
function verifierTurnstile(action) {
  return async (req, res, next) => {
    let secret = process.env.TURNSTILE_SECRET_KEY;
    // Une clé de test en production accepterait n'importe quel faux jeton (ou refuserait tout) : ignorée, avec alerte
    if (secret && enProduction() && CLE_DE_TEST.test(secret)) {
      if (!avertiCleDeTest) {
        avertiCleDeTest = true;
        logger.error('Turnstile : TURNSTILE_SECRET_KEY est une clé de TEST Cloudflare en production : contrôle anti-robots désactivé. Mettez la vraie clé secrète.');
      }
      secret = '';
    }
    const jeton = typeof req.body?.turnstile_token === 'string' ? req.body.turnstile_token.trim() : '';
    if (req.body && typeof req.body === 'object') delete req.body.turnstile_token;

    if (!secret) {
      if (!avertiSansCle) {
        avertiSansCle = true;
        logger.warn('Turnstile : TURNSTILE_SECRET_KEY absente, contrôle anti-robots désactivé');
      }
      return next();
    }
    const refuser = (cle, code) => res.status(400).json({ success: false, error: req.t ? req.t(cle) : cle, code });
    if (!jeton || jeton.length > 2048) return refuser('captcha.requis', 'CAPTCHA_REQUIS');

    const r = await interrogerCloudflare(secret, jeton, req.ip);
    if (!r.joignable) {
      logger.warn(`Turnstile : Cloudflare injoignable (${r.raison}), formulaire « ${action} » accepté sans contrôle`);
      return next();
    }
    const d = r.donnees || {};
    const test = CLE_DE_TEST.test(secret);
    const bonHote = test || hotesAutorises().has(String(d.hostname || '').toLowerCase());
    const bonneAction = test || d.action === action;
    if (d.success !== true || !bonHote || !bonneAction) {
      logger.info('Turnstile : jeton refusé', { action, codes: d['error-codes'], hote: d.hostname, actionRecue: d.action });
      return refuser('captcha.invalide', 'CAPTCHA_INVALIDE');
    }
    return next();
  };
}

module.exports = { verifierTurnstile };
