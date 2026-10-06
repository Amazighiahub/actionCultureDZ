/**
 * Désinscription de la newsletter sans connexion (RGPD art. 7.3 : retirer son
 * consentement doit être aussi simple que le donner).
 * Le lien contient l'id de l'utilisateur et une signature HMAC : impossible de
 * désinscrire quelqu'un d'autre sans connaître le secret serveur.
 */
const crypto = require('crypto');

const secret = () => process.env.NEWSLETTER_SECRET || process.env.JWT_SECRET || '';

function signUnsubscribe(userId) {
  return crypto.createHmac('sha256', secret()).update(`newsletter-unsubscribe:${userId}`).digest('hex');
}

function verifyUnsubscribe(userId, token) {
  if (!secret() || !/^\d+$/.test(String(userId)) || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return false;
  }
  const expected = Buffer.from(signUnsubscribe(userId), 'hex');
  return crypto.timingSafeEqual(expected, Buffer.from(token, 'hex'));
}

function buildUnsubscribeUrl(userId) {
  const base = (process.env.API_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
  return `${base}/api/users/newsletter/unsubscribe?u=${userId}&t=${signUnsubscribe(userId)}`;
}

// En-têtes reconnus par Gmail / Outlook (bouton « Se désabonner », RFC 8058)
function unsubscribeHeaders(url) {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}

function withUnsubscribeFooter(html, url) {
  return `${html || ''}
<hr style="margin-top:24px;border:none;border-top:1px solid #ddd">
<p style="font-size:12px;color:#777">Vous recevez cet email car vous êtes abonné(e) à la newsletter.
<a href="${url}">Se désabonner</a></p>`;
}

module.exports = {
  signUnsubscribe, verifyUnsubscribe, buildUnsubscribeUrl, unsubscribeHeaders, withUnsubscribeFooter
};
