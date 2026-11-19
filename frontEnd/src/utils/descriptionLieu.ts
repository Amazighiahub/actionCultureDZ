/**
 * Description automatique d'un lieu sans texte (2026-11-19, référencement) : type, commune, wilaya, site parent,
 * points de visite. Même phrase que la page des robots (backend/services/patrimoine/descriptionLieu.js), dans la
 * langue du visiteur. Avant : « Découvrez X — patrimoine culturel algérien » pour ~1 000 fiches.
 */
import type { TFunction } from 'i18next';

export interface FaitsLieu {
  type?: string | null;
  commune?: string | null;
  wilaya?: string | null;
  nbPoints?: number;
  parent?: string | null;
}

const deFr = (nom: string) => (/^[aeiouyàâéèêîôûh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);

export function descriptionAutoLieu(t: TFunction, f: FaitsLieu): string {
  const type = t(`patrimoine.typesPhrase.${f.type || 'autre'}`, { defaultValue: t('patrimoine.typesPhrase.autre', 'Lieu de patrimoine') });
  const ou = f.commune && f.wilaya && f.wilaya !== f.commune
    // deWilaya : élision française (« wilaya d’Alger »), utilisée par la phrase française seulement
    ? t('patrimoine.auto.communeWilaya', { commune: f.commune, wilaya: f.wilaya, deWilaya: deFr(f.wilaya), defaultValue: 'à {{commune}}, wilaya {{deWilaya}}' })
    : (f.commune || f.wilaya) ? t('patrimoine.auto.commune', { commune: f.commune || f.wilaya, defaultValue: 'à {{commune}}' }) : '';
  const phrases = [t('patrimoine.auto.phrase', { type, ou, defaultValue: '{{type}} {{ou}}, en Algérie.' }).replace(/\s+,/, ',')];
  if (f.parent) phrases.push(t('patrimoine.auto.partieDe', { site: f.parent, defaultValue: 'Point de visite de « {{site}} ».' }));
  if (f.nbPoints && f.nbPoints > 0) {
    phrases.push(f.nbPoints === 1
      ? t('patrimoine.auto.unPoint', '1 point de visite.')
      : t('patrimoine.auto.points', { n: f.nbPoints, defaultValue: '{{n}} points de visite.' }));
  }
  phrases.push(t('patrimoine.auto.fin', 'Position sur la carte, itinéraire, photos et histoire sur Tala DZ.'));
  return phrases.join(' ');
}
