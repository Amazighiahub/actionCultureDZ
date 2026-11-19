/**
 * Anti-retour (2026-11-19, référencement) : une fiche sans texte a sa propre description (type, commune, wilaya,
 * points de visite, site parent) au lieu d'une phrase commune à ~1 000 fiches.
 */
import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import fr from '../../../i18n/locales/fr/translation.json';
import ar from '../../../i18n/locales/ar/translation.json';
import { descriptionAutoLieu } from '../descriptionLieu';

describe('Description automatique d’un lieu', () => {
  it('français et arabe, avec les faits connus', async () => {
    const inst = i18n.createInstance();
    await inst.init({ lng: 'fr', resources: { fr: { translation: fr }, ar: { translation: ar } }, interpolation: { escapeValue: false } });
    expect(descriptionAutoLieu(inst.t, { type: 'site_archeologique', commune: 'Timgad', wilaya: 'Batna', nbPoints: 23 }))
      .toBe('Site archéologique à Timgad, wilaya de Batna, en Algérie. 23 points de visite. Position sur la carte, itinéraire, photos et histoire sur Tala DZ.');
    expect(descriptionAutoLieu(inst.t, { type: 'monument', commune: 'Batna', wilaya: 'Batna', parent: 'Timgad', nbPoints: 1 }))
      .toBe('Monument à Batna, en Algérie. Point de visite de « Timgad ». 1 point de visite. Position sur la carte, itinéraire, photos et histoire sur Tala DZ.');
    expect(descriptionAutoLieu(inst.t, { type: 'monument', commune: 'El Madania', wilaya: 'Alger' })).toMatch(/^Monument à El Madania, wilaya d’Alger, en Algérie\./);
    expect(descriptionAutoLieu(inst.t, { type: 'inconnu' })).toMatch(/^Lieu de patrimoine, en Algérie\./);
    await inst.changeLanguage('ar');
    expect(descriptionAutoLieu(inst.t, { type: 'site_archeologique', commune: 'تيمقاد', wilaya: 'باتنة' })).toMatch(/^موقع أثري في تيمقاد، ولاية باتنة، في الجزائر\./);
  });
});
