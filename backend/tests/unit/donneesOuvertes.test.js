/**
 * Données ouvertes : seulement des champs publics (rien sur les personnes, ni photos ni voix),
 * GeoJSON valide, CSV sûr pour les tableurs (formules neutralisées, nombres intacts).
 */
const { lireLieux, versGeoJSON, versCSV, cellule, LICENCE } = require('../../services/patrimoine/donneesOuvertes');

const lieu = {
  id_lieu: 3, nom: { fr: 'Casbah d’Alger', ar: 'قصبة الجزائر' }, typePatrimoine: 'ville_village',
  latitude: '36.78', longitude: '-0.63', id_lieu_parent: null, updatedAt: new Date('2026-11-01T10:00:00Z'),
  Commune: { nom: 'القصبة', commune_name_ascii: 'Casbah', Daira: { Wilaya: { codeW: 16, wilaya_name_ascii: 'Alger' } } }
};
const modeles = (lignes) => ({
  Lieu: { findAll: jest.fn(async () => lignes.map((l) => ({ get: () => l }))) },
  Commune: {}, Daira: {}, Wilaya: {}
});

describe('données ouvertes des lieux', () => {
  it('ne lit que les lieux publiés, sans créateur ni texte', async () => {
    const m = modeles([lieu]);
    const [l] = await lireLieux(m);
    const appel = m.Lieu.findAll.mock.calls[0][0];
    expect(appel.where).toEqual({ statut: 'publie' });
    expect(appel.attributes).not.toContain('id_createur');
    expect(l).toMatchObject({ id: 3, type: 'ville_village', commune: 'Casbah', wilaya: 'Alger', code_wilaya: 16, latitude: 36.78, longitude: -0.63, url: 'https://taladz.com/patrimoine/3', mis_a_jour: '2026-11-01' });
    expect(l.noms.ar).toBe('قصبة الجزائر');
  });

  it('GeoJSON : point [longitude, latitude], licence, lieux sans coordonnées écartés', async () => {
    const lieux = await lireLieux(modeles([lieu, { ...lieu, id_lieu: 4, latitude: null }]));
    const g = versGeoJSON(lieux);
    expect(g.licence).toEqual(LICENCE);
    expect(g.features).toHaveLength(1);
    expect(g.features[0].geometry).toEqual({ type: 'Point', coordinates: [-0.63, 36.78] });
    expect(g.features[0].properties.nom_fr).toBe('Casbah d’Alger');
  });

  it('CSV : en-tête, nombre négatif intact, formule neutralisée', async () => {
    const csv = versCSV(await lireLieux(modeles([{ ...lieu, nom: { fr: '=HYPERLINK("x")' } }])));
    const [entete, ligne] = csv.replace(/^﻿/, '').split('\r\n');
    expect(entete.startsWith('id,nom_fr,nom_ar')).toBe(true);
    expect(ligne).toContain(',-0.63,');
    expect(ligne).toContain('"\'=HYPERLINK(""x"")"');
    expect(cellule(-0.63)).toBe('-0.63');
  });
});
