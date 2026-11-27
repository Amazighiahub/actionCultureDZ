/**
 * Anti-retour (2026-11-27, analyse V12 lot A formulaires) :
 * - « Mon profil » ne remplace plus toutes les traductions par le seul texte envoyé ;
 * - une langue envoyée à null (vidée exprès) est effacée ; vide ou absente : gardée ;
 * - une heure de fin sans date de fin vaut pour le jour du début.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const { mergeTranslations } = require('../../helpers/i18n');
const BaseDTO = require('../../dto/baseDTO');
const UserService = require('../../services/user/userService');
const EvenementService = require('../../services/evenement/evenementService');

describe('Langues vidées', () => {
  test('null efface la langue ; vide ou absente la garde', () => {
    const avant = { fr: 'Horaires', ar: 'المواعيد', en: 'Old hours' };
    expect(mergeTranslations(avant, { fr: 'Nouveaux', ar: '', en: null })).toEqual({ fr: 'Nouveaux', ar: 'المواعيد' });
    expect(BaseDTO.mergeMultilang(avant, { fr: 'Titre', en: null })).toMatchObject({ fr: 'Titre', ar: 'المواعيد', en: '' });
  });
});

describe('Mon profil : traductions gardées', () => {
  const service = Object.create(UserService.prototype);
  test('le texte envoyé remplace sa langue, les autres restent', () => {
    const data = { biographie: { fr: 'Poétesse', ar: '', en: '' }, nom: { fr: 'Salem', ar: '', en: '' } };
    service._fusionnerTraductions(data, { biographie: JSON.stringify({ fr: 'Ancienne', ar: 'شاعرة', en: 'Poet' }), nom: { fr: 'Salem', ar: 'سالم' } });
    expect(data.biographie).toEqual({ fr: 'Poétesse', ar: 'شاعرة', en: 'Poet' });
    expect(data.nom).toMatchObject({ fr: 'Salem', ar: 'سالم' });
  });
  test('biographie entièrement vidée : effacée', () => {
    const data = { biographie: { fr: '', ar: '', en: '' } };
    service._fusionnerTraductions(data, { biographie: { fr: 'Ancienne' } });
    expect(data.biographie).toBeNull();
  });
});

describe('Événement : heure de fin', () => {
  const service = Object.create(EvenementService.prototype);
  test('sans date de fin : le jour du début', () => {
    expect(service._fin('', '22:00', '2026-12-05')).toBe('2026-12-05T22:00:00+01:00');
    expect(service._fin(undefined, '22:00', '2026-12-05T18:00:00+01:00')).toBe('2026-12-05T22:00:00+01:00');
  });
  test('date de fin donnée : gardée ; ni date ni heure : null', () => {
    expect(service._fin('2026-12-06', '02:00', '2026-12-05')).toBe('2026-12-06T02:00:00+01:00');
    expect(service._fin('', undefined, '2026-12-05')).toBeNull();
  });
});
