/**
 * Désinscription de la newsletter sans connexion (RGPD art. 7.3 : retirer son
 * consentement doit être aussi simple que le donner).
 * Le lien contient l'id de l'utilisateur et une signature HMAC : impossible de
 * désinscrire quelqu'un d'autre sans connaître le secret serveur.
 */
const crypto = require('crypto');

const secret = () => process.env.NEWSLETTER_SECRET || process.env.JWT_SECRET || '';

// Listes auxquelles on peut renoncer par lien : la newsletter (accord préalable) et les annonces
// d'événements envoyées aux inscrits (refus possible à tout moment). Signatures distinctes :
// un lien de l'une ne désinscrit pas de l'autre.
const LISTES = { newsletter: 'newsletter', annonces: 'annonces' };

function signUnsubscribe(userId, liste = 'newsletter') {
  return crypto.createHmac('sha256', secret()).update(`${LISTES[liste] || 'newsletter'}-unsubscribe:${userId}`).digest('hex');
}

function verifyUnsubscribe(userId, token, liste = 'newsletter') {
  if (!secret() || !/^\d+$/.test(String(userId)) || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return false;
  }
  const expected = Buffer.from(signUnsubscribe(userId, liste), 'hex');
  return crypto.timingSafeEqual(expected, Buffer.from(token, 'hex'));
}

function buildUnsubscribeUrl(userId, liste = 'newsletter') {
  const base = (process.env.API_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
  return `${base}/api/users/${LISTES[liste] || 'newsletter'}/unsubscribe?u=${userId}&t=${signUnsubscribe(userId, liste)}`;
}

// En-têtes reconnus par Gmail / Outlook (bouton « Se désabonner », RFC 8058)
function unsubscribeHeaders(url) {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}

function withUnsubscribeFooter(html, url, liste = 'newsletter') {
  const pourquoi = liste === 'annonces'
    ? 'Vous recevez cet email car vous êtes inscrit(e) sur Tala DZ.'
    : 'Vous recevez cet email car vous êtes abonné(e) à la newsletter.';
  const lien = liste === 'annonces' ? 'Ne plus recevoir ces annonces' : 'Se désabonner';
  return `${html || ''}
<hr style="margin-top:24px;border:none;border-top:1px solid #ddd">
<p style="font-size:12px;color:#777">${pourquoi}
<a href="${url}">${lien}</a></p>`;
}

module.exports = {
  signUnsubscribe, verifyUnsubscribe, buildUnsubscribeUrl, unsubscribeHeaders, withUnsubscribeFooter
};
