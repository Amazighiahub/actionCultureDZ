/**
 * Masquage des données personnelles dans les logs (les fichiers de logs sont
 * conservés et partagés lors du support : ils ne doivent pas contenir d'emails
 * ou de numéros complets).
 */

// "amina.k@exemple.dz" -> "am***@exemple.dz"
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

// "0555123456" -> "***56"
function maskPhone(phone) {
  if (phone === null || phone === undefined) return '***';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length > 2 ? `***${digits.slice(-2)}` : '***';
}

// Clés dont la valeur ne doit jamais apparaître dans un journal
const SECRET_KEY_PATTERN = /pass|mot_de_passe|token|secret|credit_card|cvv|api_key/i;
// Clés de données personnelles masquées dans les journaux d'audit
const PII_KEYS = new Set(['email', 'telephone', 'phone', 'adresse', 'address', 'date_naissance']);

/**
 * Copie récursive d'un objet (profondeur bornée) où secrets et données
 * personnelles sont remplacés : utilisée pour les journaux d'audit.
 */
function redactForLog(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => redactForLog(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) out[key] = '***REDACTED***';
    else if (PII_KEYS.has(key.toLowerCase())) out[key] = key.toLowerCase() === 'email' ? maskEmail(v) : '***';
    else out[key] = redactForLog(v, depth + 1);
  }
  return out;
}

// URL de requête sans jetons (liens de vérification email, désinscription signée...)
function redactUrl(url) {
  if (typeof url !== 'string') return url;
  return url
    .replace(/\/(verify|verify-email|confirm-email-change|reset-password)\/[^/?#]+/gi, '/$1/***')
    .replace(/([?&](?:t|token|code)=)[^&#]*/gi, '$1***');
}

module.exports = { maskEmail, maskPhone, redactForLog, redactUrl };
