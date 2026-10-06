/**
 * Masquage des données personnelles et secrets dans les journaux.
 */
const { maskEmail, maskPhone, redactForLog } = require('../../utils/maskPII');

describe('maskEmail / maskPhone', () => {
  it('masque l\'email en gardant le domaine', () => {
    expect(maskEmail('amina.k@exemple.dz')).toBe('am***@exemple.dz');
    expect(maskEmail(undefined)).toBe('***');
  });
  it('ne garde que les 2 derniers chiffres du téléphone', () => {
    expect(maskPhone('0555 12 34 56')).toBe('***56');
    expect(maskPhone(null)).toBe('***');
  });
});

describe('redactForLog (journal d\'audit)', () => {
  it('masque mots de passe français et anglais, y compris imbriqués', () => {
    const out = redactForLog({
      data: { nouveau_mot_de_passe: 'x', ancien_mot_de_passe: 'y', password: 'z', nested: { refresh_token: 't' } },
      titre: 'ok'
    });
    expect(out.data.nouveau_mot_de_passe).toBe('***REDACTED***');
    expect(out.data.ancien_mot_de_passe).toBe('***REDACTED***');
    expect(out.data.password).toBe('***REDACTED***');
    expect(out.data.nested.refresh_token).toBe('***REDACTED***');
    expect(out.titre).toBe('ok');
  });
  it('masque les données personnelles', () => {
    const out = redactForLog({ email: 'amina.k@exemple.dz', telephone: '0555', adresse: 'x', date_naissance: '1990' });
    expect(out).toEqual({ email: 'am***@exemple.dz', telephone: '***', adresse: '***', date_naissance: '***' });
  });
  it('ne modifie pas l\'objet d\'origine et gère les tableaux', () => {
    const src = { users: [{ email: 'a@b.dz' }] };
    const out = redactForLog(src);
    expect(src.users[0].email).toBe('a@b.dz');
    expect(out.users[0].email).toBe('a***@b.dz');
  });
});

describe('redactUrl (journal des requêtes)', () => {
  const { redactUrl } = require('../../utils/maskPII');
  it('masque les jetons dans le chemin et les paramètres', () => {
    expect(redactUrl('/api/email-verification/verify/abc123')).toBe('/api/email-verification/verify/***');
    expect(redactUrl('/api/users/newsletter/unsubscribe?u=4&t=deadbeef')).toBe('/api/users/newsletter/unsubscribe?u=4&t=***');
  });
  it('laisse les autres URL intactes', () => {
    expect(redactUrl('/api/evenements?page=2')).toBe('/api/evenements?page=2');
  });
});
